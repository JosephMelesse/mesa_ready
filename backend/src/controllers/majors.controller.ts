import { type Request, type Response } from 'express'
import { getDB } from '../config/db.js'

export async function listMajors(req: Request, res: Response) {
  const { university } = req.query
  const filter = university ? { university } : {}
  const docs = await getDB()
    .collection('majors')
    .find(filter, { projection: { name: 1, university: 1 } })
    .sort({ name: 1 })
    .toArray()
  const rows = docs.map((d) => ({ id: d._id, name: d.name, university: d.university }))
  res.json(rows)
}
