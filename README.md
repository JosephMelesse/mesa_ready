# Mesa Ready

A transfer readiness checker for Cerritos College students applying to UC engineering and computer science majors. Enter the courses you've taken (or plan to take), pick a target major, and instantly see which ASSIST.org articulation requirements you've met and what's still missing — plus a full Cal-GETC general education breakdown.

Live site: https://mesaready.up.railway.app

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL |
| Scraper | Python 3, `requests`, `psycopg2` |

## Setup

### 1. Database

Create the PostgreSQL database:

```bash
createdb assist_articulation
```

The schema is created automatically by the app on startup.

### 2. Scraper

Install Python dependencies and populate the database from ASSIST.org:

```bash
pip install requests psycopg2-binary
python scraper/scrape_assist.py
```

> The scraper targets the 2025–2026 academic year, pulling all engineering/CS articulation agreements between Cerritos College (ID 104) and UCI, UCLA, UCSD, and Berkeley.

By default the scraper connects via the local Unix socket (`host=/var/run/postgresql`). Set `DATABASE_URL` to override:

```bash
DATABASE_URL=postgresql://user:pass@host/dbname python scraper/scrape_assist.py
```

To scrape a single university instead of all four:

```bash
python scraper/scrape_assist.py --university UCLA
# choices: UCI, UCLA, UCSD, Berkeley
```

To look up ASSIST.org institution IDs:

```bash
python scraper/scrape_assist.py --list-institutions
```

**Scraper modules**

| File | Responsibility |
|---|---|
| `scrape_assist.py` | CLI entry point — argument parsing and top-level orchestration |
| `config.py` | Constants: institution IDs, academic year, DB DSN, request headers |
| `api.py` | HTTP session, XSRF auth, all ASSIST.org API calls |
| `db.py` | Schema creation and all database insert/upsert functions |
| `scraper.py` | HTML note extraction and per-university scrape loop |

### 3. App

```bash
npm install
npm run dev
```

This starts both the Express server (port 3001) and the Vite dev server (port 5173) concurrently. Open `http://localhost:5173` in your browser.

For production, build the client first:

```bash
npm run build
npm start
```

The built client is served statically from `client/dist/` by Express.

## Deploy to Railway

1. Go to [railway.app](https://railway.app) and create a new project from this GitHub repo.
2. Add a **Postgres** plugin — Railway auto-sets `DATABASE_URL`.
3. Set the start command to `npm start`.
4. Deploy once. On first boot, the app will create the required tables automatically.
5. Open a Railway shell and seed the database:
   ```bash
   pip install requests psycopg2-binary
   python scraper/scrape_assist.py
   ```
   This scrapes all 4 universities (~62 majors). Expect it to take a few minutes due to rate-limit delays between requests.
6. Redeploy or restart the service if needed.

If you skip step 5, the app will boot, but the majors list will be empty because no articulation data has been loaded yet.

## How it works

**Transfer Readiness** — select a UC major, then the app posts your course list to `/api/check-readiness`. The server joins your courses against the articulation data (including former course identifiers) and returns which UC requirements are satisfied, which are missing, and which have no articulation path.

**Cal-GETC** — posts your course list to `/api/check-calgetc`. The server looks up each course's Cal-GETC areas from the catalog and checks all 11 areas, including the Area 4 cross-discipline rule.
