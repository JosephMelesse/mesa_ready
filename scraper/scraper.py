import json
import time

from api import get_engineering_reports, fetch_articulation
from db import upsert_major, insert_articulation


def scrape_university(db, xsrf: str, uni_name: str, uc_id: int) -> None:
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

        major_id = upsert_major(db, name, key, uni_name)
        db.articulations.delete_many({"major_id": major_id})

        for row in arts:
            art = row.get("articulation", {})
            if art.get("type") in ("Course", "Series", "Requirement"):
                insert_articulation(db, major_id, art)

        time.sleep(3)
