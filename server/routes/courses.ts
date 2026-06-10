import { Router, type Request, type Response } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/cerritos-courses', async (_req: Request, res: Response) => {
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
    const parsed = rows.map((row: any) => ({
      ...row,
      former_identifiers: row.former_identifiers ? JSON.parse(row.former_identifiers) : null,
    }))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
