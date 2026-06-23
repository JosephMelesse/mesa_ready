#!/usr/bin/env python3
"""
Scrape ASSIST.org articulation agreements between Cerritos College and UC campuses
for engineering-related majors, plus the full UC-transferable Cerritos catalog.
"""

import argparse
import time

from config import UC_CAMPUSES, MONGO_URI, DB_NAME
from api import get_xsrf_token, api_get, fetch_uc_transferable_catalog
from db import get_db, create_schema, upsert_catalog
from scraper import scrape_university


def main():
    parser = argparse.ArgumentParser(
        description="Scrape ASSIST.org articulation data for Cerritos → UC transfers"
    )
    parser.add_argument(
        "--university",
        choices=list(UC_CAMPUSES.keys()),
        help="Scrape one university (default: all)",
    )
    parser.add_argument(
        "--list-institutions",
        action="store_true",
        help="Print UC institution IDs from ASSIST.org and exit",
    )
    args = parser.parse_args()

    print("Obtaining XSRF token...")
    xsrf = get_xsrf_token()

    if args.list_institutions:
        print("\nFetching institutions from ASSIST.org...")
        data = api_get("/api/institutions", xsrf)
        institutions = data if isinstance(data, list) else data.get("institutions", [])
        print("\nUC Institutions found:")
        for inst in sorted(institutions, key=lambda i: i.get("id", 0)):
            names = inst.get("names", [])
            name = names[0].get("name", "") if names else inst.get("name", str(inst))
            if "university of california" in name.lower():
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

    print(f"\nConnecting to MongoDB at {MONGO_URI} (db: {DB_NAME})...")
    db = get_db()
    create_schema(db)

    print("\nPopulating cerritos_catalog...")
    upsert_catalog(db, catalog)
    print("  Done")

    unis = list(targets.items())
    for i, (uni_name, uc_id) in enumerate(unis):
        scrape_university(db, xsrf, uni_name, uc_id)
        if i < len(unis) - 1:
            print("\nPausing 30s between universities to avoid rate limits...")
            time.sleep(30)

    print("\nDone. Document counts:")
    for coll in ("majors", "articulations", "cerritos_catalog"):
        print(f"  {coll}: {db[coll].count_documents({})}")


if __name__ == "__main__":
    main()
