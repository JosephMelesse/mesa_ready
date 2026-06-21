import { MongoClient, type Db } from 'mongodb'

// Local: a MongoDB server on the default port. Override in deployment
// (e.g. a MongoDB Atlas connection string) via MONGODB_URI / MONGODB_DB.
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB ?? 'assist'

const client = new MongoClient(uri)
let database: Db | undefined

export async function connectDB(): Promise<Db> {
  if (!database) {
    await client.connect()
    database = client.db(dbName)
  }
  return database
}

export function getDB(): Db {
  if (!database) throw new Error('Database not connected — call connectDB() first')
  return database
}
