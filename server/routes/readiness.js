import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.post('/check-readiness', async (req, res) => {
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

export default router
