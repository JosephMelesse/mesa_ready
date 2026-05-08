import time
import requests
from config import BASE_HEADERS, CERRITOS_ID, ACADEMIC_YEAR_ID, ENGINEERING_KEYWORDS

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
