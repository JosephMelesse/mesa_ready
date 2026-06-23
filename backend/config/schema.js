import { getDB } from "./db.js";

// Mongo creates collections lazily; we just ensure the indexes the app and
// scraper rely on. Safe to call repeatedly.
export async function ensureSchema() {
  const db = getDB();
  await db
    .collection("majors")
    .createIndex({ report_key: 1 }, { unique: true });
  await db.collection("articulations").createIndex({ major_id: 1 });
  await db
    .collection("cerritos_catalog")
    .createIndex({ course_identifier_parent_id: 1 }, { unique: true });
  await db.collection("cerritos_catalog").createIndex({ course_key: 1 });
}
