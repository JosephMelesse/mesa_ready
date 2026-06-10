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

# Shared SQLite file in the repo root (one level up from scraper/).
# Override with DATABASE_PATH to point at the same file the server uses.
DB_PATH = os.getenv(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "assist.db"),
)

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://assist.org/",
}
