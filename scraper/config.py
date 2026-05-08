import os

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
