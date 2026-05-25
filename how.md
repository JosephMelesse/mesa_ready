# How This Codebase Works

This document explains every part of this project, why each decision was made, and how everything connects together — written for someone who is learning to program.

---

## What the App Does

This is a tool for Cerritos College students who want to transfer to a UC school (Irvine, LA, San Diego, or Berkeley). The student can:

1. Pick a university and a target major (like "Computer Science at UCI")
2. Enter the courses they've taken at Cerritos, organized by semester
3. Click a button to check whether their courses satisfy the transfer requirements for that major
4. Also check whether their courses satisfy "Cal-GETC" — a standard set of general education requirements that UC schools require for transfer

The data about which Cerritos courses satisfy which UC requirements comes from a website called **ASSIST.org**, which is the official articulation database for California community colleges.

---

## The Three Layers

The project is split into three independent pieces that talk to each other:

```
[Python Scraper] --> [PostgreSQL Database] <-- [Node.js Server] <-- [React Frontend]
```

- The **scraper** is a one-time setup tool. You run it manually, it downloads all the transfer agreement data from ASSIST.org, and saves it into a database.
- The **server** sits between the database and the user. It answers questions like "what majors exist?" and "did this student complete their requirements?"
- The **frontend** is what the student sees in their browser. It asks the server questions and displays the answers.

---

## The Scraper (`scraper/`)

The scraper is written in **Python**. Python was chosen here because it's great for one-off scripts that download and process data — it has simple HTTP libraries and its code reads naturally.

### `config.py` — All the magic numbers in one place

```
CERRITOS_ID = 104          ← Cerritos College's ID on ASSIST.org
ACADEMIC_YEAR_ID = 76      ← represents the 2025-2026 school year
UC_CAMPUSES = {'UCI': 120, 'UCLA': 117, ...}
ENGINEERING_KEYWORDS = ["engineering", "computer science"]
```

**Why put these here?** If ASSIST.org changes their IDs, or we want to add a new university, there's exactly one file to edit instead of hunting through all the code. This is called the "single source of truth" principle.

### `api.py` — Talking to ASSIST.org

ASSIST.org is a website, but it also has a hidden API (Application Programming Interface) — a set of URLs that return raw data instead of an HTML page. The scraper uses this API directly.

```python
def get_xsrf_token() -> str:
    SESSION.get("https://assist.org/")
    token = SESSION.cookies.get("X-XSRF-TOKEN")
```

**What is an XSRF token?** When you visit a website, the server gives your browser a secret code (a token) stored in a cookie. Every future request must include that code to prove you're a real browser, not a bot. We grab that token first and attach it to all our requests. This is a common web security mechanism.

```python
def api_get(path, xsrf, params=None):
    for attempt in range(5):
        resp = SESSION.get(...)
        if resp.status_code == 429:
            wait = 2 ** attempt * 5
            time.sleep(wait)
```

**What is a 429 status code?** Websites protect themselves from being overwhelmed by limiting how often you can make requests. A 429 response means "you're asking too fast, slow down." The code uses **exponential backoff**: it waits 5 seconds, then 10, then 20, then 40, then 80 — doubling each time. This gives the server time to recover before we try again.

**What is a `requests.Session()`?** A Session keeps your cookies and connection alive between requests, just like a browser does. Without it, each request would be treated as a completely new visitor.

### `db.py` — Saving data to the database

After the scraper downloads data from ASSIST.org, it saves it to a **PostgreSQL** database. PostgreSQL is a professional database system — it stores data in tables with rows and columns, like a very powerful spreadsheet.

```python
def upsert_major(conn, name, key, university, template_notes):
    cur.execute("""
        INSERT INTO majors (...) VALUES (...)
        ON CONFLICT (report_key) DO UPDATE SET ...
    """)
```

**What is "upsert"?** It means "update if exists, insert if new." If we run the scraper twice, we don't want duplicate rows — we want to update the existing data. `ON CONFLICT ... DO UPDATE` is SQL's way of saying "if a row with this key already exists, just update it instead of failing."

### `scraper.py` — The logic of what to scrape

```python
def extract_notes(template_assets):
    assets = json.loads(template_assets)
    for asset in assets:
        if asset.get("type") == "GeneralText":
            s = _HTMLStripper()
            s.feed(asset["content"])
```

ASSIST.org stores university notes as HTML (the same language web pages are written in). We strip the HTML tags to get plain text, because we just want to display the text to the user, not render a webpage inside our app. The `_HTMLStripper` class uses Python's built-in `HTMLParser` to do this.

### `scrape_assist.py` — The entry point

This is the file you actually run: `python scrape_assist.py`. It ties everything together:
1. Gets the XSRF token
2. Downloads the catalog of all Cerritos courses
3. Connects to the database
4. For each UC campus, scrapes the transfer agreements for engineering/CS majors

---

## The Database Schema (`server/schema.ts` and `scraper/db.py`)

Both the scraper and the server define the same database tables. The schema describes how data is organized.

```
majors
  └── articulations         (one major has many requirements)
        └── cerritos_course_groups   (each requirement has one or more groups)
              └── cerritos_courses   (each group has specific courses)

cerritos_catalog            (all Cerritos courses that transfer to UCs)
```

**Example to make this concrete:** Say UCI requires "CS 122A — Introduction to Data Structures" for CS majors. That maps to the articulation table. To satisfy it at Cerritos, you can take either (CISC 192 OR CISC 193). Those options are stored as two separate "groups" — one with CISC 192, one with CISC 193.

**Why `ADD COLUMN IF NOT EXISTS`?** The server and scraper both run `CREATE TABLE IF NOT EXISTS` and then `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. This is a migration strategy: as the project evolved, new columns were added. The `IF NOT EXISTS` means these commands are safe to run repeatedly — they only do something the first time.

**What is `SERIAL PRIMARY KEY`?** Every row in a table needs a unique identifier so you can find it later. `SERIAL` means PostgreSQL automatically generates a new sequential number (1, 2, 3...) for each row. `PRIMARY KEY` declares it as the main identifier.

**What is `REFERENCES ... ON DELETE CASCADE`?** Foreign keys link tables together. `ON DELETE CASCADE` means if you delete a major, all its articulations (and their course groups and courses) are automatically deleted too. This prevents orphaned data.

---

## The Server (`server/`)

The server is written in **TypeScript** (JavaScript with types) and runs on **Node.js**. It uses a framework called **Express** to handle web requests.

**Why TypeScript instead of JavaScript?** TypeScript adds a type system on top of JavaScript. If you try to pass a string where a number is expected, TypeScript catches the mistake before you even run the code. For a server handling database queries and JSON responses, this prevents a lot of bugs.

### `db.ts` — Connecting to the database

```typescript
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { database: 'assist_articulation', host: '/var/run/postgresql' }
)
```

**What is a `Pool`?** Opening a database connection takes time. A Pool keeps several connections open and ready to use, sharing them between requests. When a request needs the database, it borrows a connection from the pool; when done, it returns it.

**Why two different connection configs?** In development (on your laptop), PostgreSQL is accessed via a local socket at `/var/run/postgresql`. When deployed to a server, the `DATABASE_URL` environment variable is set (a standard practice). `process.env.DATABASE_URL` reads that variable — if it's set, use it; if not, use local defaults.

### `index.ts` — Starting the server

```typescript
const app = express()
app.use(express.json())       // parse JSON request bodies
app.use('/api', majorsRouter) // routes starting with /api go to majorsRouter
```

**What is middleware?** `app.use(express.json())` is middleware — code that runs on every request before it reaches your routes. It parses the raw JSON text in the request body into a JavaScript object you can work with.

**Why separate routers?** Instead of one giant file with all the routes, each domain (majors, courses, readiness, calgetc) has its own file. This makes it easier to find and understand each piece.

```typescript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}
```

**Why this block?** In production, the server also serves the built frontend files. The `*` catch-all route sends `index.html` for any URL that isn't an API call — this is required for single-page apps, where the browser handles routing on the client side.

### `constants.ts` — The Cal-GETC areas

```typescript
export const CAL_GETC_AREAS: CalGetcArea[] = [
  { area: '1A', name: 'English Composition', minCourses: 1 },
  { area: '4',  name: 'Social & Behavioral Sciences', minCourses: 2, crossDiscipline: true },
  ...
]
```

These are the 11 subject areas that make up Cal-GETC (California General Education Transfer Curriculum). Area 4 requires 2 courses from 2 *different* disciplines — that's what `crossDiscipline: true` flags.

### `routes/majors.ts` — Simple data retrieval

```typescript
router.get('/majors', async (req, res) => {
  const { university } = req.query
  const { rows } = await pool.query(
    'SELECT id, name, university FROM majors WHERE ($1::text IS NULL OR university = $1)',
    [university ?? null]
  )
  res.json(rows)
})
```

**Why `$1` instead of putting the value directly in the SQL?** This is called a **parameterized query** and it prevents SQL injection — an attack where a malicious user puts SQL code into a form field to manipulate your database. With parameterized queries, the value is always treated as plain data, never as code.

### `routes/readiness.ts` — The core logic

This is the most complex route. When you click "Check Transfer Readiness," here's what happens:

1. **Receive** the major ID and list of courses the student entered
2. **Look up** each course in `cerritos_catalog` to find its unit count, and also expand any former course identifiers (courses that were renamed — e.g., "CISC 105" might now be called "CS 101")
3. **Query** all articulation requirements for the chosen major, joining three tables together
4. **Process** the results: for each UC requirement, check if the student's courses satisfy at least one group
5. **Return** three lists: satisfied requirements, missing requirements, and requirements with no articulation (meaning there's no Cerritos course that satisfies them)

```typescript
const ok = group.conjunction === 'And'
  ? group.courses.every((c) => expandedKeys.has(c.key))
  : group.courses.some((c) => expandedKeys.has(c.key))
```

This is the heart of the logic. A group can be "And" (you need all courses in the group) or "Or" (any one course satisfies it). `every` and `some` are built-in JavaScript array methods that check "do all items pass?" and "does at least one item pass?" respectively.

---

## The Frontend (`client/src/`)

The frontend is a **React** app written in **TypeScript**. React is a library for building user interfaces as a tree of components — reusable pieces of UI.

### `main.tsx` — The entry point

```typescript
createRoot(document.getElementById('root')!).render(<App />)
```

Every React app starts here. It finds the `<div id="root">` in `index.html` and mounts the entire app inside it. The `!` tells TypeScript "I know this element exists, trust me" (without it, TypeScript would complain it might be `null`).

### `types.ts` — The shape of all data

This file describes every data structure the app uses. For example:

```typescript
export interface Semester {
  id: number
  name: string
  classes: SemesterClass[]
}
```

**Why have a separate types file?** Because TypeScript types are used across many files, and putting them all in one place avoids circular imports and keeps things organized. When you import `Semester` in five different files, they all agree on exactly what a Semester looks like.

### `api.ts` — Talking to the server

```typescript
export async function checkReadiness(majorId: number, courses: string[]): Promise<TransferResult> {
  const res = await fetch('/api/check-readiness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorId, courses }),
  })
  return res.json()
}
```

**Why a separate `api.ts` file?** All the `fetch` calls live here so that components don't need to know the URL structure or how to format requests. If an API URL changes, there's one place to update.

**What is `async/await`?** Fetching data from a server takes time — it's not instant. `async/await` is how JavaScript handles waiting: `await` pauses the current function until the response arrives, without freezing the entire browser.

**Why `POST` for checking readiness?** The student's course list could be long. `GET` requests put all their data in the URL, which has a length limit. `POST` requests put data in the body, which has no practical limit. Also, semantically, we're asking the server to *do something* (compute a result), which `POST` better represents.

### `App.tsx` — The root component

This is the main component that holds all the state (all the data that can change) and passes it down to child components.

```typescript
const [semesters, setSemesters] = useState<Semester[]>([makeDefaultSemester()])
```

**What is `useState`?** It's how React stores data that can change. When `setSemesters` is called with new data, React automatically re-renders the parts of the UI that depend on `semesters`. You never manipulate the DOM directly — React figures out what changed and updates just that part.

```typescript
useEffect(() => {
  Promise.all([fetchMajors(), fetchCatalog()]).then(([majors, cat]) => {
    setAllMajors(majors)
    setCatalog(cat)
  })
}, [])
```

**What is `useEffect`?** Code that runs after the component first appears on screen. The `[]` at the end means "run this only once." Here it loads the list of all majors and the full course catalog from the server when the page loads.

**What is `Promise.all`?** Both `fetchMajors()` and `fetchCatalog()` return Promises (values that will arrive in the future). `Promise.all` starts both requests at the *same time* and waits for *both* to finish. This is faster than waiting for one and then starting the other.

```typescript
const getCourses = useCallback(
  () => semesters.flatMap((s) => s.classes.map((c) => c.value)).filter(Boolean),
  [semesters]
)
```

`flatMap` iterates over each semester, maps each class to its text value, and flattens the nested arrays into one flat list. `.filter(Boolean)` removes empty strings (unfilled course slots).

### `CourseInput.tsx` — The autocomplete input

This is the most interactive component. When you type in a course field, it shows a dropdown of matching courses from the Cerritos catalog.

```typescript
const matches = query.trim().length > 0
  ? catalog.filter((c) => {
      const q = query.toLowerCase()
      const code = `${c.course_prefix} ${c.course_number}`.toLowerCase()
      const title = c.course_title.toLowerCase()
      const formers = (c.former_identifiers ?? []).map(f => f.toLowerCase())
      return code.includes(q) || title.includes(q) || formers.some(f => f.includes(q))
    }).slice(0, 8)
  : []
```

This searches the catalog locally (not by calling the server again) for courses where the code, title, or any former name includes what you typed. `.slice(0, 8)` limits results to 8 so the dropdown doesn't overflow the screen.

```typescript
useEffect(() => {
  function handleOutside(e: MouseEvent) {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }
  document.addEventListener('mousedown', handleOutside)
  return () => document.removeEventListener('mousedown', handleOutside)
}, [])
```

**Why this pattern?** To close the dropdown when you click anywhere outside it. We attach a listener to the whole document, check if the click was outside the dropdown's container, and if so, close it. The `return` cleanup function removes the listener when the component is removed from the screen — without this, you'd leak memory.

**Why `onMouseDown` instead of `onClick` when selecting a course?** `onClick` fires after `mousedown` + `mouseup`. The input field's `onBlur` (which closes the dropdown) fires on `mousedown`. So if we used `onClick`, the dropdown would close before `onClick` could fire and the selection would be lost. `onMouseDown` fires first, so the selection goes through.

### `SemesterCard.tsx`

A visual card for one semester. It receives its data and callback functions from `App.tsx` as **props** (properties). It never stores state itself — it just displays what it's given and calls back up to `App.tsx` when something changes. This pattern (called "lifting state up") keeps all the data in one place.

### `TransferResults.tsx` and `CalGetcGrid.tsx`

These are "display only" components — they receive the server's response and render it. `TransferResults` shows the transfer readiness check. `CalGetcGrid` shows the 11 Cal-GETC areas. Both use `<details>` and `<summary>` — native HTML elements that create collapsible sections without any JavaScript.

---

## The Build System

### Vite (for the frontend)

```typescript
// client/vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001' }
  }
}
```

During development, the frontend runs on port 5173 and the server on port 3001. Browsers refuse to make requests to a different port for security reasons (called CORS). The proxy solves this: any request from the frontend to `/api/...` is secretly forwarded to the server on port 3001 by Vite, then the response comes back as if it were from port 5173.

In production, this proxy isn't needed because the server itself serves the frontend files, so everything is on one port.

### `npm run dev`

```json
"dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""
```

`concurrently` runs multiple commands at once in the same terminal. `dev:server` uses `tsx watch` — which compiles and runs the TypeScript server, then automatically restarts when you save a file. `dev:client` starts Vite's development server, which also hot-reloads the browser when you change frontend files.

### TypeScript compilation for the server

The server has its own `tsconfig.server.json` separate from the frontend's TypeScript config because they target different environments: the frontend compiles to code that runs in the browser, the server compiles to code that runs in Node.js. The settings (like which module format to use) differ between these environments.

---

## How Everything Flows Together

Here's the full journey of one "Check Transfer Readiness" click:

1. **User** picks UCI, selects "Computer Science B.S.", fills in courses like "CISC 192" and "MATH 265", clicks the button
2. **`App.tsx`** calls `handleCheckTransfer()`, which calls `checkReadiness(majorId, ['CISC 192', 'MATH 265'])` from `api.ts`
3. **`api.ts`** sends a `POST /api/check-readiness` request to the server with `{ majorId: 5, courses: ['CISC 192', 'MATH 265'] }`
4. **Vite proxy** (in dev) forwards it to `localhost:3001`
5. **Express** receives the request, routes it to `readiness.ts`
6. **`readiness.ts`** queries PostgreSQL: first looks up each course to get unit counts and expand renamed course IDs, then fetches all UCI CS requirements and joins the three tables
7. **PostgreSQL** returns rows like: "UCI requires CS 122A, satisfiable via CISC 192 OR CISC 193"
8. **`readiness.ts`** loops through every requirement, checks if the student's courses satisfy at least one option group, builds the `satisfied`, `missing`, `noArticulation` lists, and sends back JSON
9. **`App.tsx`** receives the JSON, calls `setResult({ type: 'transfer', data })` which triggers a re-render
10. **`TransferResults.tsx`** renders the result — green banner if ready, red if not, with details on what's missing

---

## Why These Technology Choices

| Technology | Why it was chosen |
|---|---|
| **Python** (scraper) | Easy for one-off scripts, great HTTP libraries, readable for data processing |
| **PostgreSQL** | The data has relationships (majors → articulations → courses), which relational databases handle well; also supports arrays natively (for Cal-GETC area codes) |
| **Node.js / Express** | JavaScript on both server and browser means the same language everywhere; Express is minimal and easy to understand |
| **TypeScript** | Catches type errors before you run the code; self-documents what shape every piece of data has |
| **React** | Makes it natural to build a UI from small, reusable pieces; handles re-rendering automatically when data changes |
| **Vite** | Extremely fast development server; handles TypeScript and React out of the box with minimal config |
| **Tailwind CSS** | Write styles directly in the HTML/JSX as class names instead of separate CSS files; makes component styling self-contained |
