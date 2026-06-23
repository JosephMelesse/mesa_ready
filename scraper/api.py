import time
from urllib.parse import unquote

import requests

from config import (
    BASE_HEADERS,
    CERRITOS_ID,
    ACADEMIC_YEAR_ID,
    ENGINEERING_KEYWORDS,
    REQUEST_TIMEOUT,
)

SESSION = requests.Session()

MAX_RETRIES = 5


def get_xsrf_token() -> str:
    SESSION.get("https://assist.org/", timeout=REQUEST_TIMEOUT)
    # ASSIST is an Angular app: it sets the token URL-encoded in the cookie and
    # expects the *decoded* value echoed back in the X-XSRF-TOKEN header.
    # requests stores cookie values verbatim, so decode it ourselves. unquote()
    # is a no-op when there's nothing to decode, so it's safe either way.
    raw = SESSION.cookies.get("X-XSRF-TOKEN") or SESSION.cookies.get("XSRF-TOKEN")
    if not raw:
        raise RuntimeError("Could not obtain XSRF token")
    return unquote(raw)


def api_get(path: str, xsrf: str, params: dict | None = None) -> dict:
    headers = {**BASE_HEADERS, "X-XSRF-TOKEN": xsrf}
    url = f"https://assist.org{path}"
    last_exc: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            resp = SESSION.get(
                url, headers=headers, params=params, timeout=REQUEST_TIMEOUT
            )
        except (requests.ConnectionError, requests.Timeout) as exc:
            last_exc = exc
            wait = 2**attempt * 5
            print(
                f"  Network error ({exc.__class__.__name__}) — waiting {wait}s "
                f"before retry {attempt + 1}/{MAX_RETRIES}..."
            )
            time.sleep(wait)
            continue

        # Retry on rate limiting (429) and transient server errors (5xx).
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = 2**attempt * 5
            print(
                f"  HTTP {resp.status_code} — waiting {wait}s "
                f"before retry {attempt + 1}/{MAX_RETRIES}..."
            )
            time.sleep(wait)
            continue

        resp.raise_for_status()
        return resp.json()

    # Exhausted retries: surface the last failure.
    if last_exc is not None:
        raise last_exc
    raise RuntimeError(f"Failed to GET {path} after {MAX_RETRIES} attempts")


def get_engineering_reports(xsrf: str, uc_id: int) -> list[dict]:
    data = api_get(
        "/api/agreements",
        xsrf,
        {
            "receivingInstitutionId": uc_id,
            "sendingInstitutionId": CERRITOS_ID,
            "academicYearId": ACADEMIC_YEAR_ID,
            "categoryCode": "major",
        },
    )
    return [
        r
        for r in data.get("reports", [])
        if any(kw in r["label"].lower() for kw in ENGINEERING_KEYWORDS)
    ]


def fetch_articulation(key: str, xsrf: str) -> dict:
    return api_get("/api/articulation/Agreements", xsrf, {"Key": key})["result"]


def fetch_uc_transferable_catalog(xsrf: str) -> list[dict]:
    data = api_get(
        "/api/transferability/courses",
        xsrf,
        {
            "institutionId": CERRITOS_ID,
            "academicYearId": ACADEMIC_YEAR_ID,
            "listType": "UCTCA",
        },
    )
    return data.get("courseInformationList", [])
