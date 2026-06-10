import { Router, type Request, type Response } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/majors', async (req: Request, res: Response) => {
  try {
    const { university } = req.query
    const uni = university ?? null
    const { rows } = await pool.query(
      'SELECT id, name, university FROM majors WHERE (? IS NULL OR university = ?) ORDER BY name',
      [uni, uni]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
