import json
from config import ACADEMIC_YEAR_CODE


def _arr(values) -> str | None:
    """Serialize a list to JSON text for storage, or None when empty."""
    return json.dumps(values) if values else None


def create_schema(conn) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS majors (
            id              INTEGER PRIMARY KEY,
            name            TEXT NOT NULL,
            academic_year   TEXT NOT NULL,
            report_key      TEXT NOT NULL UNIQUE,
            university      TEXT NOT NULL DEFAULT 'UCI',
            scraped_at      TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS articulations (
            id                      INTEGER PRIMARY KEY,
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
            raw_json                TEXT
        );

        CREATE TABLE IF NOT EXISTS cerritos_course_groups (
            id              INTEGER PRIMARY KEY,
            articulation_id INTEGER REFERENCES articulations(id) ON DELETE CASCADE,
            group_position  INTEGER,
            conjunction     TEXT
        );

        CREATE TABLE IF NOT EXISTS cerritos_courses (
            id                          INTEGER PRIMARY KEY,
            group_id                    INTEGER REFERENCES cerritos_course_groups(id) ON DELETE CASCADE,
            course_identifier_parent_id INTEGER,
            course_prefix               TEXT,
            course_number               TEXT,
            course_title                TEXT,
            min_units                   NUMERIC,
            max_units                   NUMERIC,
            department                  TEXT,
            position                    INTEGER
        );

        CREATE TABLE IF NOT EXISTS cerritos_catalog (
            id                          INTEGER PRIMARY KEY,
            course_identifier_parent_id INTEGER UNIQUE,
            prefix                      TEXT NOT NULL,
            course_number               TEXT NOT NULL,
            course_title                TEXT,
            department                  TEXT,
            min_units                   NUMERIC,
            max_units                   NUMERIC,
            is_csu_transferable         INTEGER,
            igetc_areas                 TEXT,
            calgetc_areas               TEXT,
            uc_transfer_areas           TEXT,
            former_identifiers          TEXT,
            academic_year               TEXT,
            scraped_at                  TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()


def upsert_major(conn, name: str, key: str, university: str) -> int:
    cur = conn.execute("""
        INSERT INTO majors (name, academic_year, report_key, university)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (report_key) DO UPDATE SET
            name       = excluded.name,
            university = excluded.university
        RETURNING id
    """, (name, ACADEMIC_YEAR_CODE, key, university))
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

    cur = conn.execute("""
        INSERT INTO articulations
            (major_id, articulation_type, uci_course_prefix, uci_course_number,
             uci_course_title, uci_series_name, uci_min_units, uci_max_units,
             uci_department, no_articulation_reason, raw_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        RETURNING id
    """, (major_id, art_type, prefix, number, title, series_name,
          units, max_units, department, no_reason, json.dumps(art)))
    art_id = cur.fetchone()[0]

    for group in items:
        conjunction = group.get("courseConjunction", "And")
        position = group.get("position", 0)
        cur = conn.execute("""
            INSERT INTO cerritos_course_groups (articulation_id, group_position, conjunction)
            VALUES (?,?,?) RETURNING id
        """, (art_id, position, conjunction))
        group_id = cur.fetchone()[0]

        for cc in group.get("items", []):
            conn.execute("""
                INSERT INTO cerritos_courses
                    (group_id, course_identifier_parent_id, course_prefix, course_number,
                     course_title, min_units, max_units, department, position)
                VALUES (?,?,?,?,?,?,?,?,?)
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

        conn.execute("""
            INSERT INTO cerritos_catalog
                (course_identifier_parent_id, prefix, course_number, course_title,
                 department, min_units, max_units, is_csu_transferable,
                 igetc_areas, calgetc_areas, uc_transfer_areas,
                 former_identifiers, academic_year)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT (course_identifier_parent_id) DO UPDATE SET
                prefix              = excluded.prefix,
                course_number       = excluded.course_number,
                course_title        = excluded.course_title,
                department          = excluded.department,
                min_units           = excluded.min_units,
                max_units           = excluded.max_units,
                is_csu_transferable = excluded.is_csu_transferable,
                igetc_areas         = excluded.igetc_areas,
                calgetc_areas       = excluded.calgetc_areas,
                uc_transfer_areas   = excluded.uc_transfer_areas,
                former_identifiers  = excluded.former_identifiers,
                academic_year       = excluded.academic_year,
                scraped_at          = CURRENT_TIMESTAMP
        """, (
            c.get("courseIdentifierParentId"),
            c.get("prefixCode"),
            c.get("courseNumber"),
            c.get("courseTitle"),
            c.get("departmentName"),
            c.get("minUnits"),
            c.get("maxUnits"),
            1 if c.get("isCsuTransferable", False) else 0,
            _arr(igetc),
            _arr(calgetc),
            _arr(uc_areas),
            _arr(former),
            ACADEMIC_YEAR_CODE,
        ))
    conn.commit()
