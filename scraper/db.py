import psycopg2
from psycopg2.extras import Json
from config import ACADEMIC_YEAR_CODE


def create_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS majors (
                id              SERIAL PRIMARY KEY,
                name            TEXT NOT NULL,
                academic_year   TEXT NOT NULL,
                report_key      TEXT NOT NULL UNIQUE,
                university      TEXT NOT NULL DEFAULT 'UCI',
                template_notes  TEXT,
                scraped_at      TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        cur.execute("ALTER TABLE majors ADD COLUMN IF NOT EXISTS university TEXT NOT NULL DEFAULT 'UCI'")
        cur.execute("ALTER TABLE majors ADD COLUMN IF NOT EXISTS template_notes TEXT")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS articulations (
                id                      SERIAL PRIMARY KEY,
                major_id                INTEGER REFERENCES majors(id) ON DELETE CASCADE,
                articulation_type       TEXT NOT NULL DEFAULT 'Course',
                uci_course_prefix       TEXT,
                uci_course_number       TEXT,
                uci_course_title        TEXT,
                uci_series_name         TEXT,
                uci_min_units           NUMERIC,
                uci_max_units           NUMERIC,
                uci_department          TEXT,
                no_articulation_reason  TEXT,
                raw_json                JSONB
            )
        """)
        cur.execute("""
            ALTER TABLE articulations
                ADD COLUMN IF NOT EXISTS articulation_type TEXT NOT NULL DEFAULT 'Course',
                ADD COLUMN IF NOT EXISTS uci_series_name TEXT
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cerritos_course_groups (
                id              SERIAL PRIMARY KEY,
                articulation_id INTEGER REFERENCES articulations(id) ON DELETE CASCADE,
                group_position  INTEGER,
                conjunction     TEXT
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cerritos_courses (
                id                          SERIAL PRIMARY KEY,
                group_id                    INTEGER REFERENCES cerritos_course_groups(id) ON DELETE CASCADE,
                course_identifier_parent_id INTEGER,
                course_prefix               TEXT,
                course_number               TEXT,
                course_title                TEXT,
                min_units                   NUMERIC,
                max_units                   NUMERIC,
                department                  TEXT,
                position                    INTEGER
            )
        """)
        cur.execute("ALTER TABLE cerritos_courses ADD COLUMN IF NOT EXISTS course_identifier_parent_id INTEGER")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cerritos_catalog (
                id                          SERIAL PRIMARY KEY,
                course_identifier_parent_id INTEGER UNIQUE,
                prefix                      TEXT NOT NULL,
                course_number               TEXT NOT NULL,
                course_title                TEXT,
                department                  TEXT,
                min_units                   NUMERIC,
                max_units                   NUMERIC,
                is_csu_transferable         BOOLEAN,
                igetc_areas                 TEXT[],
                calgetc_areas               TEXT[],
                uc_transfer_areas           TEXT[],
                former_identifiers          TEXT[],
                academic_year               TEXT,
                scraped_at                  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    conn.commit()


def upsert_major(conn, name: str, key: str, university: str, template_notes: str | None = None) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO majors (name, academic_year, report_key, university, template_notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (report_key) DO UPDATE SET
                name           = EXCLUDED.name,
                university     = EXCLUDED.university,
                template_notes = EXCLUDED.template_notes
            RETURNING id
        """, (name, ACADEMIC_YEAR_CODE, key, university, template_notes))
        row = cur.fetchone()
    conn.commit()
    return row[0]


def insert_articulation(conn, major_id: int, art: dict) -> None:
    art_type = art.get("type", "Course")
    sending = art.get("sendingArticulation", {})
    no_reason = sending.get("noArticulationReason")
    items = sending.get("items", [])

    if art_type == "Series":
        series = art.get("series", {})
        courses = series.get("courses", [])
        first = courses[0] if courses else {}
        prefix, number, title = first.get("prefix"), first.get("courseNumber"), first.get("courseTitle")
        units, max_units = first.get("minUnits"), first.get("maxUnits")
        department = first.get("department")
        series_name = series.get("name")
    elif art_type == "Requirement":
        req = art.get("requirement", {})
        prefix, number, title = None, None, req.get("name")
        units, max_units, department, series_name = None, None, None, None
    else:  # Course
        course = art.get("course", {})
        prefix, number, title = course.get("prefix"), course.get("courseNumber"), course.get("courseTitle")
        units, max_units = course.get("minUnits"), course.get("maxUnits")
        department = course.get("department")
        series_name = None

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO articulations
                (major_id, articulation_type, uci_course_prefix, uci_course_number,
                 uci_course_title, uci_series_name, uci_min_units, uci_max_units,
                 uci_department, no_articulation_reason, raw_json)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (major_id, art_type, prefix, number, title, series_name,
              units, max_units, department, no_reason, Json(art)))
        art_id = cur.fetchone()[0]

        for group in items:
            conjunction = group.get("courseConjunction", "And")
            position = group.get("position", 0)
            cur.execute("""
                INSERT INTO cerritos_course_groups (articulation_id, group_position, conjunction)
                VALUES (%s,%s,%s) RETURNING id
            """, (art_id, position, conjunction))
            group_id = cur.fetchone()[0]

            for cc in group.get("items", []):
                cur.execute("""
                    INSERT INTO cerritos_courses
                        (group_id, course_identifier_parent_id, course_prefix, course_number,
                         course_title, min_units, max_units, department, position)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    group_id,
                    cc.get("courseIdentifierParentId"),
                    cc.get("prefix"),
                    cc.get("courseNumber"),
                    cc.get("courseTitle"),
                    cc.get("minUnits"),
                    cc.get("maxUnits"),
                    cc.get("department"),
                    cc.get("position", 0),
                ))
    conn.commit()


def upsert_catalog(conn, courses: list[dict]) -> None:
    with conn.cursor() as cur:
        for c in courses:
            notations = c.get("notations", [])
            former = list({
                f"{n['prefixCode']} {n['courseNumber']}"
                for n in notations
                if n.get("prefixCode") and n.get("courseNumber")
            })

            areas = c.get("transferAreas", [])
            igetc   = [a["code"] for a in areas if a["areaType"] == 3]
            calgetc = [a["code"] for a in areas if a["areaType"] == 8]
            uc_areas = [a["code"] for a in areas if a["areaType"] == 2]

            cur.execute("""
                INSERT INTO cerritos_catalog
                    (course_identifier_parent_id, prefix, course_number, course_title,
                     department, min_units, max_units, is_csu_transferable,
                     igetc_areas, calgetc_areas, uc_transfer_areas,
                     former_identifiers, academic_year)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (course_identifier_parent_id) DO UPDATE SET
                    prefix              = EXCLUDED.prefix,
                    course_number       = EXCLUDED.course_number,
                    course_title        = EXCLUDED.course_title,
                    department          = EXCLUDED.department,
                    min_units           = EXCLUDED.min_units,
                    max_units           = EXCLUDED.max_units,
                    is_csu_transferable = EXCLUDED.is_csu_transferable,
                    igetc_areas         = EXCLUDED.igetc_areas,
                    calgetc_areas       = EXCLUDED.calgetc_areas,
                    uc_transfer_areas   = EXCLUDED.uc_transfer_areas,
                    former_identifiers  = EXCLUDED.former_identifiers,
                    academic_year       = EXCLUDED.academic_year,
                    scraped_at          = NOW()
            """, (
                c.get("courseIdentifierParentId"),
                c.get("prefixCode"),
                c.get("courseNumber"),
                c.get("courseTitle"),
                c.get("departmentName"),
                c.get("minUnits"),
                c.get("maxUnits"),
                c.get("isCsuTransferable", False),
                igetc or None,
                calgetc or None,
                uc_areas or None,
                former or None,
                ACADEMIC_YEAR_CODE,
            ))
    conn.commit()
