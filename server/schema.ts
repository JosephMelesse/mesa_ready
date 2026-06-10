import { db } from './db.js'

export async function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS majors (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      report_key TEXT NOT NULL UNIQUE,
      university TEXT NOT NULL DEFAULT 'UCI',
      scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articulations (
      id INTEGER PRIMARY KEY,
      major_id INTEGER REFERENCES majors(id) ON DELETE CASCADE,
      articulation_type TEXT NOT NULL DEFAULT 'Course',
      uci_course_prefix TEXT,
      uci_course_number TEXT,
      uci_course_title TEXT,
      uci_series_name TEXT,
      uci_min_units NUMERIC,
      uci_max_units NUMERIC,
      uci_department TEXT,
      no_articulation_reason TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS cerritos_course_groups (
      id INTEGER PRIMARY KEY,
      articulation_id INTEGER REFERENCES articulations(id) ON DELETE CASCADE,
      group_position INTEGER,
      conjunction TEXT
    );

    CREATE TABLE IF NOT EXISTS cerritos_courses (
      id INTEGER PRIMARY KEY,
      group_id INTEGER REFERENCES cerritos_course_groups(id) ON DELETE CASCADE,
      course_identifier_parent_id INTEGER,
      course_prefix TEXT,
      course_number TEXT,
      course_title TEXT,
      min_units NUMERIC,
      max_units NUMERIC,
      department TEXT,
      position INTEGER
    );

    CREATE TABLE IF NOT EXISTS cerritos_catalog (
      id INTEGER PRIMARY KEY,
      course_identifier_parent_id INTEGER UNIQUE,
      prefix TEXT NOT NULL,
      course_number TEXT NOT NULL,
      course_title TEXT,
      department TEXT,
      min_units NUMERIC,
      max_units NUMERIC,
      is_csu_transferable INTEGER,
      igetc_areas TEXT,
      calgetc_areas TEXT,
      uc_transfer_areas TEXT,
      former_identifiers TEXT,
      academic_year TEXT,
      scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
}
