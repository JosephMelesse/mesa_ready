# 12-Week Roadmap: From Basics to Owning This Codebase

**Who this is for:** You know variables, loops, conditionals, functions, classes, and error handling in JavaScript and Python. You want to reach a point where you can read, modify, debug, and extend every part of this project with confidence.

**How this roadmap is structured:** Each week has things to *learn* (concepts) and something to *build* (a hands-on mini-project tied directly to this codebase). The builds get progressively harder and by week 12 you'll make a real feature addition end-to-end.

---

## Before You Start

Open this project in your code editor. Install the dependencies. Run `npm run dev` and make sure the app loads in your browser. Read `how.md`. That document explains what every file does. Read it once now, and again at the end of week 12 — the second read will feel completely different.

---

## Week 1 — Git and the Terminal

**Why first:** Every professional programmer uses Git. Before you can own a codebase, you need to understand its history and be able to save your work safely.

**Learn:**
- What Git is and why it exists (version control = time travel for code)
- `git status`, `git add`, `git commit`, `git log`, `git diff`
- What a branch is and why you use them (`git checkout -b`)
- What `HEAD`, staging area, and working tree mean
- Reading a diff: what `+` and `-` lines mean
- `.gitignore`: why `node_modules/` is not committed

**Build:** Run `git log` on this project and trace the history. Find the commit that added the Cal-GETC feature. Read the diff for that commit (`git show <hash>`). Write a short note to yourself about what changed. Then create a branch called `week1-practice`, make a trivial change (fix a typo in `how.md`), commit it, and switch back to `master`.

**Resource:** The official Pro Git book (free online) — read chapters 1 and 2 only.

---

## Week 2 — How the Web Works + HTML + CSS

**Why now:** The frontend of this app is a web page. Before you can understand React, you need to know what React is doing *for you*, which means knowing what the raw web looks like without it.

**Learn:**
- What happens when you type a URL and press Enter (DNS → TCP → HTTP → HTML)
- HTTP request and response: method, URL, headers, body, status codes (200, 404, 500, 429)
- What HTML is: elements, attributes, nesting, `<div>`, `<input>`, `<button>`, `<select>`, `<option>`, `<ul>`, `<li>`, `<details>`, `<summary>`
- What CSS is: selectors, properties, the box model (margin, padding, border)
- Flexbox: `display: flex`, `flex-direction`, `align-items`, `justify-content`, `gap`
- What a class attribute is and how CSS targets it

**Build:** Open `public/index.html` (there's an old version of this app in there). Study it. Then, from a blank HTML file, rebuild the university selector dropdown — just the `<select>` with its four university options — styled to look like the one in the React app (dark background, amber text). No JavaScript yet.

**Resource:** MDN Web Docs — "Learn HTML" and "Learn CSS" guides. For Flexbox specifically, Flexbox Froggy (a game).

---

## Week 3 — JavaScript in the Browser + async/await + fetch

**Why now:** You know JavaScript the language. Now you need to know JavaScript in the browser: how it manipulates web pages and how it talks to servers.

**Learn:**
- The DOM: `document.getElementById`, `document.querySelector`, `addEventListener`
- Events: `click`, `change`, `input`, `focus`, `blur`, `mousedown`
- What a Promise is: the problem it solves, `.then()`, `.catch()`
- `async` and `await`: syntax sugar over Promises, try/catch with async functions
- `fetch`: making GET and POST requests, reading the response as JSON
- JSON: `JSON.stringify()` and `JSON.parse()`
- What CORS is and why the Vite proxy exists in `vite.config.ts`

**Build:** Start the dev server (`npm run dev`). Open your browser's developer tools (F12), go to the Console tab. Write fetch calls directly in the console:
```js
// Try these one by one
fetch('/api/majors').then(r => r.json()).then(console.log)
fetch('/api/cerritos-courses').then(r => r.json()).then(console.log)
fetch('/api/check-readiness', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ majorId: 1, courses: ['MATH 265', 'CISC 192'] })
}).then(r => r.json()).then(console.log)
```
Then in a plain HTML file (no frameworks), write a script that fetches the majors list and populates a `<select>` dropdown with them using the DOM.

**Resource:** MDN Web Docs — "Fetching data from the server", "Promises", "async/await".

---

## Week 4 — TypeScript

**Why now:** Every `.ts` and `.tsx` file in this project uses TypeScript. You can read the code now, but you can't confidently *write* it without understanding the type system.

**Learn:**
- Why TypeScript exists: catching bugs before you run the code
- Primitive types: `string`, `number`, `boolean`, `null`, `undefined`
- Arrays: `string[]`, `number[]`
- `interface` and `type`: defining the shape of an object
- Union types: `string | null`, `'transfer' | 'calgetc'`
- Generics: `Promise<string>`, `useState<Semester[]>`
- The `?` optional property: `notes?: string`
- Type assertions: `as HTMLElement`, the `!` non-null assertion
- `type` vs `interface` — when each is used

**Build:** Open `client/src/types.ts`. Read every interface. Then open `server/routes/readiness.ts` and read the interfaces at the top (`CourseRow`, `ArticulationRow`, etc.). For practice: take the `client/src/api.ts` file and rewrite it in a blank file as if you were writing it from scratch — just the function signatures with their return types, without looking at the original. Then check how close you got.

**Resource:** The official TypeScript Handbook — read "The Basics", "Everyday Types", and "Object Types" sections.

---

## Week 5 — Node.js and the npm Ecosystem

**Why now:** The server runs on Node.js. Understanding how Node modules work explains why every file starts with `import`, why `package.json` exists, and how the build scripts work.

**Learn:**
- What Node.js is: JavaScript running on your computer, not in a browser
- `package.json`: `dependencies`, `devDependencies`, `scripts`
- `npm install`: what `node_modules/` is (never commit this)
- ES modules: `import`/`export` vs CommonJS `require`/`module.exports`
- Why `"type": "module"` is in `package.json`
- `tsx`: runs TypeScript files directly without a separate compile step
- `concurrently`: runs multiple terminal commands at once
- Environment variables: `process.env.PORT`, why secrets live here not in code
- The `path` module: `path.join()` for building file paths that work on any OS

**Build:** Create a new file `server/hello.ts`. Write a simple Node.js script that reads `process.env.PORT` (defaulting to 9999), prints "Hello from port X", and exits. Run it with `tsx server/hello.ts`. Then add a `"hello"` script to `package.json` that runs it and use `npm run hello`.

**Resource:** Node.js official docs — "Introduction to Node.js". npmjs.com — "About npm".

---

## Week 6 — Express: Building a Web Server

**Why now:** You've fetched from the server in Week 3. Now you'll understand how the server side of that conversation works.

**Learn:**
- What Express is: a library that makes it easy to write HTTP servers
- Routes: `router.get('/path', handler)`, `router.post('/path', handler)`
- Request object: `req.params`, `req.query`, `req.body`
- Response object: `res.json()`, `res.status()`, `res.sendFile()`
- Middleware: `app.use(express.json())` — what runs before every route
- `async` route handlers and error handling with try/catch
- HTTP methods: GET (read data), POST (send data), PUT (replace), DELETE (remove)
- Status codes in practice: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error
- Router: `express.Router()` — splitting routes across files

**Build:** Read `server/routes/majors.ts` and `server/routes/courses.ts` until you fully understand them. Then add a new route to `server/routes/courses.ts`:
```
GET /api/cerritos-courses/:prefix
```
This route should return only courses that match a given prefix (e.g. `/api/cerritos-courses/MATH` returns only math courses). Test it in your browser at `http://localhost:3001/api/cerritos-courses/MATH`.

**Resource:** Express.js official docs — "Getting started", "Routing", "Using middleware".

---

## Week 7 — SQL and PostgreSQL

**Why now:** The database is the memory of the entire system. If you can't read and write SQL, you can't understand where the data comes from, debug bad results, or add new features.

**Learn:**
- What a relational database is: tables, rows, columns, data types
- `SELECT`: `WHERE`, `ORDER BY`, `LIMIT`, `AS` (aliasing)
- `INSERT INTO`, `UPDATE`, `DELETE`
- `JOIN`: `INNER JOIN`, `LEFT JOIN` — combining data from multiple tables
- Primary keys and foreign keys — how tables link to each other
- `ON DELETE CASCADE` — why it matters
- Aggregates: `COUNT()`, `SUM()`, `GROUP BY`
- `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Parameterized queries (`$1`, `$2`) and why they prevent SQL injection
- Arrays in PostgreSQL: `TEXT[]`, `= ANY($1)`, `unnest()`
- `JSONB`: storing raw JSON in a column (used for `raw_json` in `articulations`)

**Build:** Open a PostgreSQL terminal (`psql assist_articulation`). Run these queries and understand the output:
```sql
-- How many majors exist per university?
SELECT university, COUNT(*) FROM majors GROUP BY university;

-- What Cerritos courses satisfy MATH 2B at UCI?
SELECT cc.course_prefix, cc.course_number, cc.course_title
FROM articulations a
JOIN majors m ON m.id = a.major_id
JOIN cerritos_course_groups g ON g.articulation_id = a.id
JOIN cerritos_courses cc ON cc.group_id = g.id
WHERE m.university = 'UCI'
  AND a.uci_course_prefix = 'MATH'
  AND a.uci_course_number = '2B';

-- Which courses cover Cal-GETC area 5A?
SELECT prefix, course_number, course_title
FROM cerritos_catalog
WHERE '5A' = ANY(calgetc_areas);
```
Write a query of your own: find all UCI CS major requirements that have no articulation (i.e. `no_articulation_reason IS NOT NULL`).

**Resource:** PostgreSQL official docs — "Tutorial". SQLZoo.net for interactive practice.

---

## Week 8 — Connecting Express to PostgreSQL: The Full Server Layer

**Why now:** You understand Express and PostgreSQL separately. Now you'll understand how they work together, which is the entire `server/` directory.

**Learn:**
- The `pg` library: `Pool`, `pool.query(sql, params)`, the `rows` result
- Why a Pool is better than a single Connection
- How `server/db.ts` works and why there are two different configs
- `ensureSchema()` in `server/schema.ts` — why it runs on startup
- `ON CONFLICT ... DO UPDATE` (upsert) — used in the scraper
- Reading `server/routes/readiness.ts` line by line — this is the hardest file
- How the three-table JOIN works in that route
- The logic of `group.conjunction === 'And' ? every : some`

**Build:** Add a new route `GET /api/stats` that returns a summary of the database:
```json
{
  "universities": 4,
  "majors": 42,
  "articulations": 1500,
  "catalogCourses": 800
}
```
Each number should come from a real `COUNT(*)` query. This forces you to write four SQL queries, handle async/await correctly, and return structured JSON.

---

## Week 9 — React Fundamentals: Components, Props, and State

**Why now:** The entire `client/src/` directory is React. This week you learn the mental model.

**Learn:**
- What React is: a library for building UI as a tree of components
- JSX: HTML-like syntax inside JavaScript — how Babel/Vite transforms it
- Components: functions that return JSX
- Props: data passed *into* a component (like function arguments)
- `useState`: storing data that can change, triggering re-renders
- Why you never mutate state directly — always call the setter function
- Conditional rendering: `{condition && <Component />}`, ternary in JSX
- List rendering: `{items.map(item => <li key={item.id}>...</li>)}`
- Why `key` is required on list items
- The component tree of this app: App → SemesterCard → CourseInput

**Build:** Read `client/src/components/UniversitySelector.tsx`. It's the simplest component. Now build `client/src/components/Stats.tsx` — a new component that fetches from your `/api/stats` endpoint (built in Week 8) and displays the four numbers in a row of cards, styled like the stat cards in `TransferResults.tsx`. Add it to `App.tsx` below the university selector.

**Resource:** The official React docs at react.dev — "Describing the UI" and "Adding Interactivity" sections.

---

## Week 10 — React Hooks: useEffect, useCallback, useRef

**Why now:** `useState` is enough for simple components. The rest of `App.tsx` and `CourseInput.tsx` use three more hooks you need to understand.

**Learn:**
- `useEffect(fn, deps)`: side effects — fetching data, event listeners, timers
  - Empty deps `[]`: run once on mount
  - With deps `[x, y]`: run when x or y changes
  - Cleanup: the function you return from `useEffect`
- `useCallback(fn, deps)`: memoizing a function so it doesn't recreate every render
- `useRef`: a box that holds a value that doesn't trigger re-renders; also used to reference DOM elements
- "Lifting state up": why all semester data lives in `App.tsx` not `SemesterCard.tsx`
- The data flow in this app: App holds state → passes data down as props → passes setter callbacks down as props → children call callbacks to trigger updates

**Build:** Add a "Remove Class" button to `SemesterCard`. When clicked, it removes that class from the semester. This requires:
1. Adding a `onRemoveClass` prop to `SemesterCard` (a callback)
2. Wiring a button in `SemesterCard` that calls `onRemoveClass(cls.id)`
3. Implementing the handler in `App.tsx` using `setSemesters` with the class filtered out

This is a small change but it touches the full data flow: state in App → prop → child → callback → state update.

---

## Week 11 — Python: HTTP Requests, APIs, and the Scraper

**Why now:** You've owned the server and frontend. The last piece is the scraper that populates the database.

**Learn:**
- The `requests` library: `requests.get()`, `requests.Session()`, response status codes, `.json()`
- What a cookie is and how sessions use them
- HTTP headers: `User-Agent`, `Accept`, `Referer`, `X-XSRF-TOKEN`
- Exponential backoff: why `2 ** attempt * 5` is smart for rate limiting
- `psycopg2`: connecting to PostgreSQL from Python, cursors, `%s` parameters
- `argparse`: building command-line tools with flags like `--university`
- `json.loads()` and `json.dumps()`
- Python's `HTMLParser` for stripping HTML tags

**Build:** Read `scraper/api.py` and `scraper/config.py` in full. Then add a new function to `scraper/api.py`:
```python
def fetch_catalog_for_area(xsrf: str, area_code: str) -> list[dict]:
    """Return all Cerritos courses that cover a given Cal-GETC area."""
```
It should call `/api/transferability/courses` with `listType=UCTCA`, then filter the returned list to only courses whose `transferAreas` contain a `code` matching `area_code` and `areaType == 8`. Print the results for area `'1A'` when you run the script.

**Resource:** Python `requests` library docs. `psycopg2` docs under "Basic module usage".

---

## Week 12 — Own the System: Add a Feature End-to-End

**Why now:** You've learned every layer. The final week is proof — you'll build something real that touches the scraper data, the server, and the frontend.

**Feature to build: "Add a Semester" should also allow removing a semester**

Right now you can add semesters but never remove them. This is a full-stack feature:

1. **Frontend change** — Add a small remove button (×) to `SemesterCard`. Add an `onRemoveSemester` prop. Wire it up.
2. **App.tsx change** — Implement the handler: filter out the semester by ID from `semesters` state.
3. **Guard** — Don't allow removing the last semester (keep at least one).

This feature is pure frontend, but the point is proving you can open any file, understand it, make a targeted change, and verify it works.

**Then, the real test — extend the server:** Add a `GET /api/universities` route that returns the list of universities that actually have data in the database (queried live, not hardcoded). Then update `UniversitySelector.tsx` to fetch from this endpoint instead of having UCI/UCLA/UCSD/Berkeley hardcoded. Now if the scraper adds data for a new university, the dropdown updates automatically with no code change.

This requires:
- A new SQL query (`SELECT DISTINCT university FROM majors ORDER BY university`)
- A new Express route
- A new `fetchUniversities()` function in `api.ts`
- A `useEffect` in `App.tsx` that fetches universities on load
- Passing the list to `UniversitySelector` as a prop instead of hardcoding it

---

## Reference: What You'll Be Able to Do After Week 12

| Area | What you can do |
|---|---|
| Git | Track changes, branch safely, read any commit |
| HTML/CSS | Understand every element and style in the frontend |
| TypeScript | Read and write all type annotations and interfaces |
| fetch / async | Make any HTTP request, handle errors, chain async operations |
| Express | Add new routes, understand middleware, debug server errors |
| PostgreSQL | Write queries, understand the schema, add new tables/columns |
| React | Build components, manage state, use all hooks in this project |
| Python scraper | Run it, modify filters, add new data sources |
| End-to-end | Trace any data from ASSIST.org → database → server → browser |

---

## Principles to Follow the Whole Time

**Build, don't just read.** Reading code is easy. Writing it is where the learning happens. Do the build exercises even when they feel unnecessary.

**Use the browser dev tools constantly.** The Network tab shows every HTTP request. The Console lets you run JavaScript live. The Elements tab shows the real DOM. These three panels will teach you more than any tutorial.

**Read error messages carefully.** A TypeScript error, a PostgreSQL error, and a React error each have a specific message. The message almost always tells you exactly what's wrong. Don't just google the first line — read the whole thing first.

**Understand before you move on.** If Week 6 doesn't click, don't push to Week 7. The layers build on each other. A shaky foundation makes everything above it harder.

**Come back to this codebase every week.** Each week, open a different file and see how much more you understand than the week before. By week 12, nothing in this project should feel foreign.
