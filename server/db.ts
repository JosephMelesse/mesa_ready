import path from 'path'
import Database from 'better-sqlite3'

// Local: a file in the repo root. Override with DATABASE_PATH in deployment
// (e.g. a Render persistent disk mount).
const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'assist.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Thin `pool.query(sql, params) => { rows }` shim the routes call.
// better-sqlite3 is synchronous, so callers can still `await` the result.
export const pool = {
  query<T = any>(sql: string, params: unknown[] = []): { rows: T[] } {
    const stmt = db.prepare(sql)
    if (stmt.reader) {
      return { rows: stmt.all(...params) as T[] }
    }
    stmt.run(...params)
    return { rows: [] }
  },
}
