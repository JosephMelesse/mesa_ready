import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri);
let database;

export async function connectDB() {
  if (!database) {
    await client.connect();
    database = client.db(dbName);
  }
  return database;
}

export function getDB() {
  if (!database)
    throw new Error("Database not connected call connectDB() first");
  return database;
}
