# Mesa Ready

A transfer readiness checker for Cerritos College students applying to UC engineering and computer science majors. Enter the courses you've taken (or plan to take), pick a target major, and see which ASSIST.org articulation requirements you've met and what's still missing, plus a full Cal-GETC general education breakdown.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express 5 (JavaScript, ESM) |
| Database | MongoDB (`mongodb` driver) |
| Scraper | Python 3, `requests`, `pymongo` |

The database is a MongoDB instance with three collections: `majors`, `articulations` (each embedding its course groups and courses), and `cerritos_catalog`. The scraper writes the data and the app reads it.

Both sides read the connection string from `MONGO_URI`:

- Scraper reads `MONGO_URI` (default `mongodb://localhost:27017`) and `DB_NAME` (default `assist`).
- Backend reads `MONGO_URI` (no default). The database name is hardcoded to `assist`.

So point both at the same MongoDB and you're set. One caveat: the scraper's database name is configurable via `DB_NAME`, but the backend always uses `assist`, so leave `DB_NAME` at its default unless you also change the backend.

## Setup

### 1. Scraper

Install Python dependencies and populate the database from ASSIST.org:

```bash
pip install -r scraper/requirements.txt
python scraper/scrape_assist.py
```

This connects to MongoDB (defaulting to `mongodb://localhost:27017`, database `assist`) and fills it. The indexes are created automatically, so there's nothing to provision beyond a running MongoDB server.

> The scraper targets the 2025-2026 academic year, pulling all engineering/CS articulation agreements between Cerritos College (ID 104) and UCI, UCLA, UCSD, and Berkeley.

To point at a different MongoDB instance (e.g. MongoDB Atlas), set `MONGO_URI`:

```bash
MONGO_URI="mongodb+srv://user:pass@cluster.example.mongodb.net" python scraper/scrape_assist.py
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
| `scrape_assist.py` | CLI entry point: argument parsing and top-level orchestration |
| `config.py` | Constants: institution IDs, academic year, MongoDB connection, request headers |
| `api.py` | HTTP session, XSRF auth, all ASSIST.org API calls |
| `db.py` | Schema creation and all database insert/upsert functions |
| `scraper.py` | Per-university scrape loop |

### 2. App

The backend and frontend are separate npm packages. Install and run each in its own terminal.

API on port 3001:

```bash
cd backend && npm install && npm run dev
```

Vite dev server on port 5173:

```bash
cd frontend && npm install && npm run dev
```

The backend's `npm run dev` loads `backend/.env` automatically, so put `MONGO_URI` there.

There's no Vite proxy, so the frontend reaches the API through `VITE_API_URL`. Create `frontend/.env` and point it at the backend:

```bash
VITE_API_URL=http://localhost:3001
```

Then open `http://localhost:5173` in your browser.

## Deploy

The app runs as three pieces: the frontend on Netlify, the backend on Render, and the data in MongoDB Atlas. Each one points at the next.

**Backend (Render)**

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGO_URI` = your Atlas connection string
  - `CORS_ORIGIN` = your Netlify site URL, so the browser is allowed to call the API

Render provides `PORT` automatically; the server reads it and listens on `0.0.0.0`. If you leave `CORS_ORIGIN` unset the API allows any origin, which is fine for testing but you'll want it locked to your Netlify URL in production.

**Frontend (Netlify)**

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL` = your Render backend URL (set at build time)

**Data (MongoDB Atlas)**

Run the scraper once against the cluster to fill it:

```bash
MONGO_URI="<atlas-connection-string>" python scraper/scrape_assist.py
```

Keep the database named `assist`, since that's what the backend expects. Re-run the scraper anytime to refresh the data.

If the database is empty the app still boots, but the majors list stays empty until the scraper has run.

## How it works

**Transfer Readiness**: select a UC major, then the app posts your course list to `/api/check-readiness`. The server joins your courses against the articulation data (including former course identifiers) and returns which UC requirements are satisfied, which are missing, and which have no articulation path.

**Cal-GETC**: posts your course list to `/api/check-calgetc`. The server looks up each course's Cal-GETC areas from the catalog and checks all 11 areas, including the Area 4 cross-discipline rule.
