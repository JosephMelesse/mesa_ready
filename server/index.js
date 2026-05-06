import express from 'express'
import { Pool } from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { database: 'assist_articulation', host: '/var/run/postgresql' }
)

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS majors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      report_key TEXT NOT NULL UNIQUE,
      university TEXT NOT NULL DEFAULT 'UCI',
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    ALTER TABLE majors
      ADD COLUMN IF NOT EXISTS university TEXT NOT NULL DEFAULT 'UCI'
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articulations (
      id SERIAL PRIMARY KEY,
      major_id INTEGER REFERENCES majors(id) ON DELETE CASCADE,
      articulation_type TEXT NOT NULL DEFAULT 'Course',
      uci_course_prefix TEXT,
      uci_course_number TEXT,
      uci_course_title TEXT,
      uci_series_name TEXT,
      uci_min_units NUMERIC,
      uci_max_units NUMERIC,
      uci_department TEXT,
      no_articulation_reason TEXT,
      raw_json JSONB
    )
  `)

  await pool.query(`
    ALTER TABLE articulations
      ADD COLUMN IF NOT EXISTS articulation_type TEXT NOT NULL DEFAULT 'Course',
      ADD COLUMN IF NOT EXISTS uci_series_name TEXT
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cerritos_course_groups (
      id SERIAL PRIMARY KEY,
      articulation_id INTEGER REFERENCES articulations(id) ON DELETE CASCADE,
      group_position INTEGER,
      conjunction TEXT
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cerritos_courses (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES cerritos_course_groups(id) ON DELETE CASCADE,
      course_identifier_parent_id INTEGER,
      course_prefix TEXT,
      course_number TEXT,
      course_title TEXT,
      min_units NUMERIC,
      max_units NUMERIC,
      department TEXT,
      position INTEGER
    )
  `)

  await pool.query(`
    ALTER TABLE cerritos_courses
      ADD COLUMN IF NOT EXISTS course_identifier_parent_id INTEGER
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cerritos_catalog (
      id SERIAL PRIMARY KEY,
      course_identifier_parent_id INTEGER UNIQUE,
      prefix TEXT NOT NULL,
      course_number TEXT NOT NULL,
      course_title TEXT,
      department TEXT,
      min_units NUMERIC,
      max_units NUMERIC,
      is_csu_transferable BOOLEAN,
      igetc_areas TEXT[],
      calgetc_areas TEXT[],
      uc_transfer_areas TEXT[],
      former_identifiers TEXT[],
      academic_year TEXT,
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/majors', async (req, res) => {
  try {
    const { university } = req.query
    const { rows } = await pool.query(
      'SELECT id, name, university FROM majors WHERE ($1::text IS NULL OR university = $1) ORDER BY name',
      [university ?? null]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.get('/api/cerritos-courses', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        course_identifier_parent_id AS id,
        prefix                      AS course_prefix,
        course_number,
        course_title,
        department,
        min_units,
        max_units,
        former_identifiers
      FROM cerritos_catalog
      ORDER BY prefix, course_number
    `)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.post('/api/check-readiness', async (req, res) => {
  try {
    const { majorId, courses } = req.body

    const userCourseKeys = new Set(courses.map((c) => c.trim().toUpperCase()))

    const { rows: catalogRows } = await pool.query(`
      SELECT prefix, course_number, min_units, former_identifiers
      FROM cerritos_catalog
      WHERE UPPER(prefix || ' ' || course_number) = ANY($1)
         OR EXISTS (
           SELECT 1 FROM unnest(former_identifiers) fi WHERE UPPER(fi) = ANY($1)
         )
    `, [Array.from(userCourseKeys)])

    const unitMap = new Map()
    for (const row of catalogRows) {
      const key = `${row.prefix} ${row.course_number}`.toUpperCase()
      unitMap.set(key, Number(row.min_units))
      for (const former of (row.former_identifiers ?? [])) {
        unitMap.set(former.toUpperCase(), Number(row.min_units))
      }
    }

    const totalUnits = Array.from(userCourseKeys).reduce(
      (sum, k) => sum + (unitMap.get(k) ?? 0), 0
    )

    const expandedKeys = new Set(userCourseKeys)
    for (const row of catalogRows) {
      expandedKeys.add(`${row.prefix} ${row.course_number}`.toUpperCase())
    }

    const { rows } = await pool.query(`
      SELECT
        a.id                    AS art_id,
        a.articulation_type,
        a.uci_course_prefix,
        a.uci_course_number,
        a.uci_course_title,
        a.uci_series_name,
        a.uci_min_units,
        a.no_articulation_reason,
        g.id                    AS group_id,
        g.group_position,
        g.conjunction,
        cc.course_prefix,
        cc.course_number,
        cc.course_title
      FROM articulations a
      LEFT JOIN cerritos_course_groups g ON g.articulation_id = a.id
      LEFT JOIN cerritos_courses cc ON cc.group_id = g.id
      WHERE a.major_id = $1
      ORDER BY a.id, g.group_position, cc.position
    `, [majorId])

    const artMap = new Map()

    for (const row of rows) {
      if (!artMap.has(row.art_id)) {
        const label = row.articulation_type === 'Requirement'
          ? row.uci_course_title ?? 'Requirement'
          : row.uci_series_name
            ? row.uci_series_name
            : `${row.uci_course_prefix ?? ''} ${row.uci_course_number ?? ''}`.trim()
        artMap.set(row.art_id, {
          artType: row.articulation_type,
          uciCourse: label,
          uciTitle: row.uci_course_title ?? '',
          uciUnits: row.uci_min_units ? Number(row.uci_min_units) : null,
          noArticulationReason: row.no_articulation_reason,
          groups: new Map(),
        })
      }
      const art = artMap.get(row.art_id)
      if (row.group_id) {
        if (!art.groups.has(row.group_id)) {
          art.groups.set(row.group_id, { conjunction: row.conjunction, courses: [] })
        }
        if (row.course_prefix) {
          art.groups.get(row.group_id).courses.push({
            prefix: row.course_prefix,
            number: row.course_number,
            title: row.course_title,
            key: `${row.course_prefix} ${row.course_number}`.toUpperCase(),
          })
        }
      }
    }

    const satisfied = []
    const missing = []
    const noArticulation = []

    for (const art of artMap.values()) {
      if (art.noArticulationReason) {
        noArticulation.push({ uciCourse: art.uciCourse, uciTitle: art.uciTitle, reason: art.noArticulationReason })
        continue
      }

      let satisfiedGroup = null
      for (const group of art.groups.values()) {
        const ok = group.conjunction === 'And'
          ? group.courses.every((c) => expandedKeys.has(c.key))
          : group.courses.some((c) => expandedKeys.has(c.key))
        if (ok) { satisfiedGroup = group; break }
      }

      if (satisfiedGroup) {
        satisfied.push({
          artType: art.artType,
          uciCourse: art.uciCourse,
          uciTitle: art.uciTitle,
          satisfiedBy: satisfiedGroup.courses
            .filter((c) => expandedKeys.has(c.key))
            .map((c) => `${c.prefix} ${c.number} — ${c.title}`),
        })
      } else {
        const options = []
        for (const group of art.groups.values()) {
          const sep = group.conjunction === 'And' ? ' + ' : ' or '
          options.push(group.courses.map((c) => `${c.prefix} ${c.number}`).join(sep))
        }
        missing.push({
          artType: art.artType,
          uciCourse: art.uciCourse,
          uciTitle: art.uciTitle,
          uciUnits: art.uciUnits,
          options,
        })
      }
    }

    res.json({ ready: missing.length === 0, totalUnits, satisfied, missing, noArticulation })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

const CAL_GETC_AREAS = [
  { area: '1A', name: 'English Composition',             minCourses: 1 },
  { area: '1B', name: 'Critical Thinking & Composition', minCourses: 1 },
  { area: '1C', name: 'Oral Communication',              minCourses: 1 },
  { area: '2',  name: 'Mathematical Concepts',           minCourses: 1 },
  { area: '3A', name: 'Arts',                            minCourses: 1 },
  { area: '3B', name: 'Humanities',                      minCourses: 1 },
  { area: '4',  name: 'Social & Behavioral Sciences',    minCourses: 2, crossDiscipline: true },
  { area: '5A', name: 'Physical Sciences',               minCourses: 1 },
  { area: '5B', name: 'Biological Sciences',             minCourses: 1 },
  { area: '5C', name: 'Laboratory',                      minCourses: 1 },
  { area: '6',  name: 'Ethnic Studies',                  minCourses: 1 },
]

app.post('/api/check-calgetc', async (req, res) => {
  try {
    const { courses } = req.body
    const userKeys = new Set(courses.map((c) => c.trim().toUpperCase()))

    if (userKeys.size === 0) {
      const missing = CAL_GETC_AREAS.map((r) => ({
        area: r.area, name: r.name, satisfied: false,
        courses: [], needed: r.minCourses, note: null,
      }))
      return res.json({ ready: false, missing, satisfied: [] })
    }

    const { rows } = await pool.query(`
      SELECT prefix, course_number, course_title, department, min_units,
             calgetc_areas, former_identifiers
      FROM cerritos_catalog
      WHERE (UPPER(prefix || ' ' || course_number) = ANY($1)
          OR EXISTS (SELECT 1 FROM unnest(former_identifiers) fi WHERE UPPER(fi) = ANY($1)))
        AND calgetc_areas IS NOT NULL
    `, [Array.from(userKeys)])

    const areaMap = new Map()
    for (const row of rows) {
      for (const area of (row.calgetc_areas ?? [])) {
        if (!areaMap.has(area)) areaMap.set(area, [])
        areaMap.get(area).push(row)
      }
    }

    const satisfied = []
    const missing = []

    for (const requirement of CAL_GETC_AREAS) {
      const covering = areaMap.get(requirement.area) ?? []
      const courseLabels = covering.map((c) => `${c.prefix} ${c.course_number} — ${c.course_title}`)

      let note = null
      let ok = covering.length >= requirement.minCourses

      if (ok && requirement.crossDiscipline) {
        const disciplines = new Set(covering.map((c) => c.department).filter(Boolean))
        if (disciplines.size < 2) {
          ok = false
          note = `Need courses from 2 different disciplines (currently all from: ${[...disciplines].join(', ')})`
        }
      }

      if (ok) {
        satisfied.push({ area: requirement.area, name: requirement.name, courses: courseLabels, note })
      } else {
        missing.push({
          area: requirement.area,
          name: requirement.name,
          courses: courseLabels,
          needed: Math.max(0, requirement.minCourses - covering.length),
          note,
        })
      }
    }

    res.json({ ready: missing.length === 0, satisfied, missing })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

const PORT = process.env.PORT ?? 3001

async function start() {
  await ensureSchema()
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
}

start().catch((error) => {
  console.error('Failed to initialize database schema', error)
  process.exit(1)
})
