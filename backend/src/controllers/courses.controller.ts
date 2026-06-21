import { type Request, type Response } from 'express'
import { getDB } from '../config/db.js'

export async function listCerritosCourses(_req: Request, res: Response) {
  const docs = await getDB()
    .collection('cerritos_catalog')
    .find({})
    .sort({ prefix: 1, course_number: 1 })
    .toArray()
  const parsed = docs.map((row) => ({
    id: row.course_identifier_parent_id,
    course_prefix: row.prefix,
    course_number: row.course_number,
    course_title: row.course_title,
    department: row.department,
    min_units: row.min_units,
    max_units: row.max_units,
    former_identifiers: row.former_identifiers ?? null,
  }))
  res.json(parsed)
}
