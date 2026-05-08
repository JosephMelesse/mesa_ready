import json
import re
import time
from html.parser import HTMLParser

from api import get_engineering_reports, fetch_articulation
from db import upsert_major, insert_articulation


class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'br'):
            self._parts.append('\n')

    def handle_data(self, data):
        self._parts.append(data)

    def get_text(self):
        return re.sub(r'\n{3,}', '\n\n', ''.join(self._parts)).strip()


def extract_notes(template_assets: str) -> str | None:
    if not template_assets:
        return None
    try:
        assets = json.loads(template_assets)
        parts = []
        for asset in assets:
            if asset.get("type") == "GeneralText" and asset.get("content"):
                s = _HTMLStripper()
                s.feed(asset["content"])
                text = s.get_text()
                if text:
                    parts.append(text)
        return '\n\n'.join(parts) or None
    except Exception:
        return None


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
        notes = extract_notes(result.get("templateAssets"))

        type_counts: dict[str, int] = {}
        for row in arts:
            t = row.get("articulation", {}).get("type", "UNKNOWN")
            type_counts[t] = type_counts.get(t, 0) + 1
        print(f"  {len(arts)} rows: {type_counts}")

        major_id = upsert_major(conn, name, key, uni_name, notes)
        with conn.cursor() as cur:
            cur.execute("DELETE FROM articulations WHERE major_id = %s", (major_id,))
        conn.commit()

        for row in arts:
            art = row.get("articulation", {})
            if art.get("type") in ("Course", "Series", "Requirement"):
                insert_articulation(conn, major_id, art)

        time.sleep(3)
