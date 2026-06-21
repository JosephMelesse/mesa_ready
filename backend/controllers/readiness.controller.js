import { getDB } from '../config/db.js'

export async function checkReadiness(req, res) {
  const { majorId, courses } = req.body

  const userCourseKeys = new Set(courses.map((c) => c.trim().toUpperCase()))
  const keys = Array.from(userCourseKeys)

  let catalogRows = []
  if (keys.length > 0) {
    catalogRows = await getDB()
      .collection('cerritos_catalog')
      .find({ $or: [{ course_key: { $in: keys } }, { former_identifiers: { $in: keys } }] })
      .toArray()
  }

  const unitMap = new Map()
  for (const row of catalogRows) {
    const key = `${row.prefix} ${row.course_number}`.toUpperCase()
    unitMap.set(key, Number(row.min_units))
    for (const former of row.former_identifiers ?? []) {
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

  const arts = await getDB()
    .collection('articulations')
    .find({ major_id: Number(majorId) })
    .toArray()

  const satisfied = []
  const missing = []
  const noArticulation = []

  for (const art of arts) {
    const uciTitle = art.uci_course_title ?? ''
    const label = art.articulation_type === 'Requirement'
      ? art.uci_course_title ?? 'Requirement'
      : art.uci_series_name
        ? art.uci_series_name
        : `${art.uci_course_prefix ?? ''} ${art.uci_course_number ?? ''}`.trim()

    if (art.no_articulation_reason) {
      noArticulation.push({ uciCourse: label, uciTitle, reason: art.no_articulation_reason })
      continue
    }

    const groups = (art.groups ?? []).map((g) => ({
      conjunction: g.conjunction,
      courses: g.courses
        .filter((c) => c.course_prefix)
        .map((c) => ({
          prefix: c.course_prefix,
          number: c.course_number,
          title: c.course_title,
          key: `${c.course_prefix} ${c.course_number}`.toUpperCase(),
        })),
    }))

    let satisfiedGroup = null
    for (const group of groups) {
      const ok = group.conjunction === 'And'
        ? group.courses.every((c) => expandedKeys.has(c.key))
        : group.courses.some((c) => expandedKeys.has(c.key))
      if (ok) { satisfiedGroup = group; break }
    }

    if (satisfiedGroup) {
      satisfied.push({
        artType: art.articulation_type,
        uciCourse: label,
        uciTitle,
        satisfiedBy: satisfiedGroup.courses
          .filter((c) => expandedKeys.has(c.key))
          .map((c) => `${c.prefix} ${c.number} — ${c.title}`),
      })
    } else {
      const options = []
      for (const group of groups) {
        const sep = group.conjunction === 'And' ? ' + ' : ' or '
        options.push(group.courses.map((c) => `${c.prefix} ${c.number}`).join(sep))
      }
      missing.push({
        artType: art.articulation_type,
        uciCourse: label,
        uciTitle,
        uciUnits: art.uci_min_units != null ? Number(art.uci_min_units) : null,
        options,
      })
    }
  }

  res.json({ ready: missing.length === 0, totalUnits, satisfied, missing, noArticulation })
}
