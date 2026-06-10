#!/usr/bin/env python3
"""
Scrape ASSIST.org articulation agreements between Cerritos College and UC campuses
for engineering-related majors, plus the full UC-transferable Cerritos catalog.
"""

import argparse
import time
import sqlite3

from config import UC_CAMPUSES, DB_PATH
from api import get_xsrf_token, api_get, fetch_uc_transferable_catalog
from db import create_schema, upsert_catalog
from scraper import scrape_university


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
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    create_schema(conn)

    print("\nPopulating cerritos_catalog...")
    upsert_catalog(conn, catalog)
    print("  Done")

    unis = list(targets.items())
    for i, (uni_name, uc_id) in enumerate(unis):
        scrape_university(conn, xsrf, uni_name, uc_id)
        if i < len(unis) - 1:
            print("\nPausing 30s between universities to avoid rate limits...")
            time.sleep(30)

    conn.close()

    print("\nDone. Row counts:")
    conn = sqlite3.connect(DB_PATH)
    for table in ("majors", "articulations", "cerritos_course_groups", "cerritos_courses", "cerritos_catalog"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count}")
    conn.close()


if __name__ == "__main__":
    main()
