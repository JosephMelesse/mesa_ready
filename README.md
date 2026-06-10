# Mesa Ready

A transfer readiness checker for Cerritos College students applying to UC engineering and computer science majors. Enter the courses you've taken (or plan to take), pick a target major, and instantly see which ASSIST.org articulation requirements you've met and what's still missing — plus a full Cal-GETC general education breakdown.

> **Deployment in progress** — migrating hosting to Netlify (client) + Render (server). A live URL will be added here once the deploy is finalized.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite (`better-sqlite3`) |
| Scraper | Python 3, `requests`, `sqlite3` (stdlib) |

The whole database is a single SQLite file. Locally it lives at `assist.db` in the repo root; both the server and the scraper read it from there. Override the location with the `DATABASE_PATH` environment variable (used in deployment).

## Setup

### 1. Scraper

Install Python dependencies and populate the database from ASSIST.org:

```bash
pip install requests
python scraper/scrape_assist.py
```

This creates `assist.db` (if it doesn't exist) and fills it. The schema is created automatically — there's no separate database to provision.

> The scraper targets the 2025–2026 academic year, pulling all engineering/CS articulation agreements between Cerritos College (ID 104) and UCI, UCLA, UCSD, and Berkeley.

To write the database somewhere other than the repo root, set `DATABASE_PATH`:

```bash
DATABASE_PATH=/path/to/assist.db python scraper/scrape_assist.py
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
| `config.py` | Constants: institution IDs, academic year, DB path, request headers |
| `api.py` | HTTP session, XSRF auth, all ASSIST.org API calls |
| `db.py` | Schema creation and all database insert/upsert functions |
| `scraper.py` | HTML note extraction and per-university scrape loop |

### 2. App

```bash
npm install
npm run dev
```

This starts both the Express server (port 3001) and the Vite dev server (port 5173) concurrently. Open `http://localhost:5173` in your browser. The server reads the same `assist.db` the scraper wrote (set `DATABASE_PATH` if you put it elsewhere).

For production, build the client first:

```bash
npm run build
npm start
```

The built client is served statically from `client/dist/` by Express.

## Deploy (in progress)

Target hosting is **Netlify** for the client and **Render** for the server.

- **Client (Netlify):** build `client/` and deploy the static `client/dist/` output. Point API requests at the Render service URL.
- **Server (Render):** deploy as a Node web service with start command `npm start`.
  - Render's filesystem is **ephemeral**, so attach a **persistent disk** and set `DATABASE_PATH` to a file on that disk (e.g. `/data/assist.db`). Without this, the database is wiped on every redeploy.
  - Seed the database from a shell on the service:
    ```bash
    pip install requests
    DATABASE_PATH=/data/assist.db python scraper/scrape_assist.py
    ```
    This scrapes all 4 universities (~62 majors). Expect a few minutes due to rate-limit delays between requests.

If the database is empty, the app still boots, but the majors list will be empty until the scraper has run.

## How it works

**Transfer Readiness** — select a UC major, then the app posts your course list to `/api/check-readiness`. The server joins your courses against the articulation data (including former course identifiers) and returns which UC requirements are satisfied, which are missing, and which have no articulation path.

**Cal-GETC** — posts your course list to `/api/check-calgetc`. The server looks up each course's Cal-GETC areas from the catalog and checks all 11 areas, including the Area 4 cross-discipline rule.
