import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/cerritos-courses', async (_req, res) => {
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

export default router
