# Mesa Ready

A transfer readiness checker for Cerritos College students applying to UCI engineering and computer science majors. Enter the courses you've taken (or plan to take), pick a target major, and instantly see which ASSIST.org articulation requirements you've met and what's still missing — plus a full Cal-GETC general education breakdown.

Live site: https://mesaready.up.railway.app

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript (`tsx`) |
| Database | PostgreSQL |
| Scraper | Python 3, `requests`, `psycopg2` |

## Setup

### 1. Database

Create the PostgreSQL database:

```bash
createdb assist_articulation
```

The schema is created automatically by the app on startup or by the scraper on first run.

### 2. Scraper

Install Python dependencies and populate the database from ASSIST.org:

```bash
pip install requests psycopg2-binary
python scraper/scrape_assist.py
```

> The scraper targets the 2025–2026 academic year, pulling all engineering/CS articulation agreements between Cerritos College (ID 104) and UCI (ID 120).

By default the scraper connects via the local Unix socket (`host=/var/run/postgresql`). Edit `DB_DSN` in `scrape_assist.py` if your PostgreSQL setup differs.

### 3. App

```bash
npm install
npm run dev
```

This concurrently runs the Express API server on port 3001 and the Vite dev server (proxied). Open the URL Vite prints in your terminal.

## Deploy to Railway

1. Go to [railway.app](https://railway.app) and create a new project from this GitHub repo.
2. Add a **Postgres** plugin — Railway auto-sets `DATABASE_URL`.
3. Set the build command to `npm run build` and start command to `npm start`.
4. Deploy once. On first boot, the app will create the required tables automatically.
5. Open a Railway shell and seed the database:
   ```bash
   pip install requests psycopg2-binary
   python scraper/scrape_assist.py
   ```
6. Redeploy or restart the service if needed. The Express server serves both the API and the built frontend.

If you skip step 5, the app will boot, but the majors list will be empty because no articulation data has been loaded yet.

## How it works

**Transfer Readiness** — select a UCI major, then the app posts your course list to `/api/check-readiness`. The server joins your courses against the articulation data (including former course identifiers) and returns which UCI requirements are satisfied, which are missing, and which have no articulation path.

**Cal-GETC** — posts your course list to `/api/check-calgetc`. The server looks up each course's Cal-GETC areas from the catalog and checks all 11 areas, including the Area 4 cross-discipline rule.
