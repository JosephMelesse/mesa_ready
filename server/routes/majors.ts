import { Router, type Request, type Response } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/majors', async (req: Request, res: Response) => {
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

router.get('/major-notes/:id', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT template_notes FROM majors WHERE id = $1',
      [req.params.id]
    )
    res.json({ notes: rows[0]?.template_notes ?? null })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
