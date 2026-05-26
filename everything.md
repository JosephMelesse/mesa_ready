# Libraries & Frameworks — Full Reference

---

## Server (`server/`) — Node.js / TypeScript

### `express` v5
HTTP server framework.
- `express` — creates the app (`index.ts`)
- `Router` — defines route handlers (`routes/*.ts`)
- `Request`, `Response` — TypeScript type annotations

### `pg` v8 (node-postgres)
PostgreSQL client for Node.
- `Pool` — connection pool (`db.ts`)

### `path` (Node built-in)
- default import — resolves static file paths (`index.ts`)

---

## Client (`client/`) — React / TypeScript

### `react` v19
- `useState`, `useEffect`, `useCallback` — state and side-effect hooks (`App.tsx`)
- `useState`, `useRef`, `useEffect` — hooks (`CourseInput.tsx`)
- `StrictMode` — wraps the app (`main.tsx`)

### `react-dom` v19
- `createRoot` (from `react-dom/client`) — mounts the app (`main.tsx`)

### `clsx` v2
Conditional class name builder.
- `clsx`, `ClassValue` — used in `lib/utils.ts`

### `tailwind-merge` v2
Merges Tailwind classes without conflicts.
- `twMerge` — used in `lib/utils.ts`

---

## Scraper (`scraper/`) — Python

### `requests`
HTTP client for hitting the ASSIST.org API.
- `requests` — used in `api.py` for all API calls

### `psycopg2`
PostgreSQL client for Python.
- `psycopg2` — connection and cursor management (`db.py`, `scrape_assist.py`)
- `psycopg2.extras.Json` — serializes Python dicts to Postgres JSON columns (`db.py`)

### `html.parser` (Python stdlib)
- `HTMLParser` — parses raw HTML from articulation responses (`scraper.py`)

### `json` (Python stdlib)
- `json` — parses/serializes JSON (`scraper.py`)

### `re` (Python stdlib)
- `re` — regex for extracting data from HTML (`scraper.py`)

### `time` (Python stdlib)
- `time` — rate-limiting delays between API calls (`api.py`, `scraper.py`, `scrape_assist.py`)

### `os` (Python stdlib)
- `os` — reads environment variables for config (`config.py`)

### `argparse` (Python stdlib)
- `argparse` — CLI argument parsing (`scrape_assist.py`)

---

## Dev / Build Tools (not imported in code)

| Tool | Role |
|---|---|
| **Vite** v6 | Client bundler and dev server |
| **`@vitejs/plugin-react`** v4 | Vite plugin for JSX and React Fast Refresh |
| **TypeScript** v5 | Static typing (server and client) |
| **`tsx`** v4 | Runs `.ts` server files directly without a build step |
| **`concurrently`** v9 | Runs server and client dev servers in parallel (`npm run dev`) |
| **Tailwind CSS** v3 | Utility-first CSS framework |
| **PostCSS** v8 | CSS processing pipeline |
| **Autoprefixer** v10 | Adds vendor prefixes via PostCSS |
