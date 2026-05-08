import { Pool } from 'pg'

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { database: 'assist_articulation', host: '/var/run/postgresql' }
)
