#!/usr/bin/env python3
"""
Scrape ASSIST.org articulation agreements between Cerritos College and UC campuses
for engineering-related majors, plus the full UC-transferable Cerritos catalog.
"""

import argparse
import json
import os
import time
import requests
import psycopg2
from psycopg2.extras import Json

CERRITOS_ID = 104
ACADEMIC_YEAR_ID = 76  # 2025-2026
ACADEMIC_YEAR_CODE = "2025-2026"

UC_CAMPUSES = {
    'UCI':      120,
    'UCLA':     117,
    'UCSD':     7,
    'Berkeley': 79,
}

ENGINEERING_KEYWORDS = ["engineering", "computer science"]

DB_DSN = os.getenv("DATABASE_URL", "dbname=assist_articulation host=/var/run/postgresql")

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://assist.org/",
}

SESSION = requests.Session()


def get_xsrf_token() -> str:
    SESSION.get("https://assist.org/")
    token = SESSION.cookies.get("X-XSRF-TOKEN")
    if not token:
        raise RuntimeError("Could not obtain XSRF token")
    return token


def api_get(path: str, xsrf: str, params: dict | None = None) -> dict:
    headers = {**BASE_HEADERS, "X-XSRF-TOKEN": xsrf}
    for attempt in range(5):
        resp = SESSION.get(f"https://assist.org{path}", headers=headers, params=params)
        if resp.status_code == 429:
            wait = 2 ** attempt * 5
            print(f"  Rate limited — waiting {wait}s before retry {attempt + 1}/5...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()


def get_engineering_reports(xsrf: str, uc_id: int) -> list[dict]:
    data = api_get(
        "/api/agreements",
        xsrf,
        {"receivingInstitutionId": uc_id, "sendingInstitutionId": CERRITOS_ID,
         "academicYearId": ACADEMIC_YEAR_ID, "categoryCode": "major"},
    )
    return [r for r in data.get("reports", [])
            if any(kw in r["label"].lower() for kw in ENGINEERING_KEYWORDS)]


def fetch_articulation(key: str, xsrf: str) -> dict:
    return api_get(f"/api/articulation/Agreements", xsrf, {"Key": key})["result"]


def fetch_uc_transferable_catalog(xsrf: str) -> list[dict]:
    data = api_get("/api/transferability/courses", xsrf,
                   {"institutionId": CERRITOS_ID, "academicYearId": ACADEMIC_YEAR_ID, "listType": "UCTCA"})
    return data.get("courseInformationList", [])


# ── Schema ─────────────────────────────────────────────────────────────────

def create_schema(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS majors (
                id              SERIAL PRIMARY KEY,
                name            TEXT NOT NULL,
                academic_year   TEXT NOT NULL,
                report_key      TEXT NOT NULL UNIQUE,
                university      TEXT NOT NULL DEFAULT 'UCI',
                scraped_at      TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        cur.execute("""
            ALTER TABLE majors
                ADD COLUMN IF NOT EXISTS university TEXT NOT NULL DEFAULT 'UCI'
        """)
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
        cur.execute("""
            ALTER TABLE cerritos_courses
                ADD COLUMN IF NOT EXISTS course_identifier_parent_id INTEGER
        """)
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


# ── Articulation insertion ─────────────────────────────────────────────────

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


# ── Catalog insertion ──────────────────────────────────────────────────────

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
            igetc  = [a["code"] for a in areas if a["areaType"] == 3]
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


# ── Helpers ────────────────────────────────────────────────────────────────

def upsert_major(conn, name: str, key: str, university: str) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO majors (name, academic_year, report_key, university)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (report_key) DO UPDATE SET name = EXCLUDED.name, university = EXCLUDED.university
            RETURNING id
        """, (name, ACADEMIC_YEAR_CODE, key, university))
        row = cur.fetchone()
    conn.commit()
    return row[0]


def scrape_university(conn, xsrf: str, uni_name: str, uc_id: int) -> None:
    print(f"\n{'='*50}")
    print(f"Scraping {uni_name} (ASSIST ID: {uc_id})")
    print(f"{'='*50}")

    reports = get_engineering_reports(xsrf, uc_id)
    print(f"  {len(reports)} engineering/CS majors found:")
    for r in reports:
        print(f"    {r['label']}")

    if not reports:
        print("  Nothing to scrape.")
        return

    for report in reports:
        name, key = report["label"], report["key"]
        print(f"\nScraping articulations: {name}")
        result = fetch_articulation(key, xsrf)
        arts = json.loads(result["articulations"])

        type_counts: dict[str, int] = {}
        for row in arts:
            t = row.get("articulation", {}).get("type", "UNKNOWN")
            type_counts[t] = type_counts.get(t, 0) + 1
        print(f"  {len(arts)} rows: {type_counts}")

        major_id = upsert_major(conn, name, key, uni_name)
        with conn.cursor() as cur:
            cur.execute("DELETE FROM articulations WHERE major_id = %s", (major_id,))
        conn.commit()

        for row in arts:
            art = row.get("articulation", {})
            if art.get("type") in ("Course", "Series", "Requirement"):
                insert_articulation(conn, major_id, art)

        time.sleep(1.5)


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Scrape ASSIST.org articulation data for Cerritos → UC transfers"
    )
    parser.add_argument(
        '--university', choices=list(UC_CAMPUSES.keys()),
        help="Scrape one university (default: all)"
    )
    parser.add_argument(
        '--list-institutions', action='store_true',
        help="Print UC institution IDs from ASSIST.org and exit"
    )
    args = parser.parse_args()

    print("Obtaining XSRF token...")
    xsrf = get_xsrf_token()

    if args.list_institutions:
        print("\nFetching institutions from ASSIST.org...")
        data = api_get('/api/institutions', xsrf)
        institutions = data if isinstance(data, list) else data.get('institutions', [])
        print("\nUC Institutions found:")
        for inst in sorted(institutions, key=lambda i: i.get('id', 0)):
            names = inst.get('names', [])
            name = names[0].get('name', '') if names else inst.get('name', str(inst))
            if 'university of california' in name.lower():
                print(f"  ID {inst['id']:4d}  {name}")
        return

    targets = (
        {args.university: UC_CAMPUSES[args.university]}
        if args.university
        else UC_CAMPUSES
    )

    print("\nFetching UC-transferable Cerritos catalog...")
    catalog = fetch_uc_transferable_catalog(xsrf)
    print(f"  {len(catalog)} courses found")

    print("\nConnecting to database...")
    conn = psycopg2.connect(DB_DSN)
    create_schema(conn)

    print("\nPopulating cerritos_catalog...")
    upsert_catalog(conn, catalog)
    print("  Done")

    for uni_name, uc_id in targets.items():
        scrape_university(conn, xsrf, uni_name, uc_id)

    conn.close()

    print("\nDone. Row counts:")
    conn = psycopg2.connect(DB_DSN)
    with conn.cursor() as cur:
        for table in ("majors", "articulations", "cerritos_course_groups", "cerritos_courses", "cerritos_catalog"):
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"  {table}: {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
