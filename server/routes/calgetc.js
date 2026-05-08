import { Router } from 'express'
import { pool } from '../db.js'
import { CAL_GETC_AREAS } from '../constants.js'

const router = Router()

router.post('/check-calgetc', async (req, res) => {
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

export default router
