import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'theme-studio.db');

let db: Database;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    db = new SQL.Database();
  }
  
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL
    );
  `);

  // Create theme_projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS theme_projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      template_type TEXT DEFAULT 'light-ui',
      colors TEXT DEFAULT '{}',
      bg_image_url TEXT,
      header_bg_image_url TEXT,
      visual_context TEXT,
      pinned INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create theme_chat_messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS theme_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES theme_projects(id) ON DELETE CASCADE
    );
  `);

  // Create theme_confirmed_versions table
  db.run(`
    CREATE TABLE IF NOT EXISTS theme_confirmed_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES theme_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create theme_export_jobs table
  db.run(`
    CREATE TABLE IF NOT EXISTS theme_export_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      confirmed_version_id TEXT NOT NULL,
      status TEXT NOT NULL,
      selected_products TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES theme_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (confirmed_version_id) REFERENCES theme_confirmed_versions(id) ON DELETE CASCADE
    );
  `);

  // Seed users
  const stmt = db.prepare('INSERT OR IGNORE INTO users (id, name, display_name) VALUES (?, ?, ?)');
  stmt.bind([1, 'customer-a', '客户A']);
  stmt.step();
  stmt.free();
  
  const stmt2 = db.prepare('INSERT OR IGNORE INTO users (id, name, display_name) VALUES (?, ?, ?)');
  stmt2.bind([2, 'customer-b', '客户B']);
  stmt2.step();
  stmt2.free();
  
  const stmt3 = db.prepare('INSERT OR IGNORE INTO users (id, name, display_name) VALUES (?, ?, ?)');
  stmt3.bind([3, 'customer-c', '客户C']);
  stmt3.step();
  stmt3.free();

  // Save to disk
  saveDb();
  console.log('Database initialized successfully');
}

// Helper to persist to disk
export function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  mkdirSync(join(DB_PATH, '..'), { recursive: true });
  writeFileSync(DB_PATH, buffer);
}

export { db };
