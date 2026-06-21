# Mesa Ready

A transfer readiness checker for Cerritos College students applying to UC engineering and computer science majors. Enter the courses you've taken (or plan to take), pick a target major, and instantly see which ASSIST.org articulation requirements you've met and what's still missing — plus a full Cal-GETC general education breakdown.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express 5 (JavaScript, ESM) |
| Database | MongoDB (`mongodb` driver) |
| Scraper | Python 3, `requests`, `pymongo` |

The database is a MongoDB instance with three collections — `majors`, `articulations` (each embedding its course groups and courses), and `cerritos_catalog`. Both the server and the scraper connect to the same database via the `MONGODB_URI` and `MONGODB_DB` environment variables, which default to `mongodb://localhost:27017` and `assist`.

## Setup

### 1. Scraper

Install Python dependencies and populate the database from ASSIST.org:

```bash
pip install -r scraper/requirements.txt
python scraper/scrape_assist.py
```

This connects to MongoDB (defaulting to `mongodb://localhost:27017`, database `assist`) and fills it. The indexes are created automatically — there's no separate database to provision beyond a running MongoDB server.

> The scraper targets the 2025–2026 academic year, pulling all engineering/CS articulation agreements between Cerritos College (ID 104) and UCI, UCLA, UCSD, and Berkeley.

To point at a different MongoDB instance (e.g. MongoDB Atlas), set `MONGODB_URI` (and optionally `MONGODB_DB`):

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.example.mongodb.net" python scraper/scrape_assist.py
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
| `config.py` | Constants: institution IDs, academic year, MongoDB connection, request headers |
| `api.py` | HTTP session, XSRF auth, all ASSIST.org API calls |
| `db.py` | Schema creation and all database insert/upsert functions |
| `scraper.py` | Per-university scrape loop |

### 2. App

The backend and frontend are separate npm packages. Install and run each in its own terminal:

```bash
# Terminal 1 — API (port 3001)
cd backend && npm install && npm run dev
```

```bash
# Terminal 2 — Vite dev server (port 5173)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173` in your browser; Vite proxies `/api` to the backend on port 3001. The backend reads `backend/.env` (e.g. `MONGODB_URI` / `MONGODB_DB`) and connects to the same MongoDB the scraper wrote.

For production, build the frontend and start the server:

```bash
cd frontend && npm run build
cd ../backend && npm start
```

With `NODE_ENV=production` the built client is served statically from `frontend/dist/` by Express.

## Deploy

In production Express serves both the API and the built client. Build the frontend and start the server:

```bash
npm --prefix frontend ci && npm --prefix frontend run build
npm --prefix backend start
```

The data lives in a separate **MongoDB** instance (e.g. a MongoDB Atlas cluster), so set `MONGODB_URI` — and `MONGODB_DB` if it isn't `assist` — in the environment. The same connection string is used by the scraper to populate the data.

To refresh the data, re-run the scraper against the same MongoDB instance:

```bash
MONGODB_URI="<production-connection-string>" python scraper/scrape_assist.py
```

If the database is empty, the app still boots, but the majors list will be empty until the scraper has run.

## How it works

**Transfer Readiness** — select a UC major, then the app posts your course list to `/api/check-readiness`. The server joins your courses against the articulation data (including former course identifiers) and returns which UC requirements are satisfied, which are missing, and which have no articulation path.

**Cal-GETC** — posts your course list to `/api/check-calgetc`. The server looks up each course's Cal-GETC areas from the catalog and checks all 11 areas, including the Area 4 cross-discipline rule.
