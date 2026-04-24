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

  // Create model_config table
  db.run(`
    CREATE TABLE IF NOT EXISTS model_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      chat_endpoint TEXT NOT NULL DEFAULT '',
      chat_api_key TEXT NOT NULL DEFAULT '',
      chat_model TEXT NOT NULL DEFAULT '',
      image_endpoint TEXT NOT NULL DEFAULT '',
      image_api_key TEXT NOT NULL DEFAULT '',
      image_model TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  db.run(`
    INSERT OR IGNORE INTO model_config (id, chat_endpoint, chat_api_key, chat_model, image_endpoint, image_api_key, image_model)
    VALUES (1, '', '', '', '', '', '')
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS security_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cors_origins TEXT NOT NULL DEFAULT '["http://localhost:5173"]',
      proxy_image_hosts TEXT NOT NULL DEFAULT '[]',
      rate_limits TEXT NOT NULL DEFAULT '{}',
      enabled_features TEXT NOT NULL DEFAULT '{"cors":true,"proxyImage":true,"rateLimiting":true,"adminAuth":true,"quota":true,"export":true,"image":true,"chat":true}',
      daily_image_gen_limit INTEGER NOT NULL DEFAULT 100,
      daily_chat_adjust_limit INTEGER NOT NULL DEFAULT 50,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  db.run(`
    INSERT OR IGNORE INTO security_config (id, cors_origins, proxy_image_hosts, rate_limits, enabled_features, daily_image_gen_limit, daily_chat_adjust_limit)
    VALUES (1, '["http://localhost:5173"]', '[]', '{"chat":60,"image":20,"export":10,"proxyImage":60}', '{"cors":true,"proxyImage":true,"rateLimiting":true,"adminAuth":true,"quota":true,"export":true,"image":true,"chat":true}', 100, 50)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_usage_quotas (
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      image_gen_count INTEGER NOT NULL DEFAULT 0,
      chat_adjust_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

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

export function getSecurityConfig(): any {
  const stmt = db.prepare('SELECT * FROM security_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  
  if (!row) {
    return null;
  }
  
  try {
    return {
      ...row,
      cors_origins: JSON.parse(row.cors_origins as string),
      proxy_image_hosts: JSON.parse(row.proxy_image_hosts as string),
      rate_limits: JSON.parse(row.rate_limits as string),
      enabled_features: JSON.parse(row.enabled_features as string)
    };
  } catch (e) {
    console.error('Error parsing security config JSON:', e);
    return null;
  }
}

export async function updateSecurityConfig(
  cors_origins?: string[],
  proxy_image_hosts?: string[],
  rate_limits?: Record<string, any>,
  enabled_features?: Record<string, boolean>,
  daily_image_gen_limit?: number,
  daily_chat_adjust_limit?: number
): Promise<void> {
  const current = getSecurityConfig();
  
  const updateFields: Record<string, any> = {};
  if (cors_origins !== undefined) updateFields.cors_origins = JSON.stringify(cors_origins);
  if (proxy_image_hosts !== undefined) updateFields.proxy_image_hosts = JSON.stringify(proxy_image_hosts);
  if (rate_limits !== undefined) updateFields.rate_limits = JSON.stringify(rate_limits);
  if (enabled_features !== undefined) updateFields.enabled_features = JSON.stringify(enabled_features);
  if (daily_image_gen_limit !== undefined) updateFields.daily_image_gen_limit = daily_image_gen_limit;
  if (daily_chat_adjust_limit !== undefined) updateFields.daily_chat_adjust_limit = daily_chat_adjust_limit;
  
  if (Object.keys(updateFields).length === 0) {
    return;
  }
  
  const keys = Object.keys(updateFields);
  const values = Object.values(updateFields);
  
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const sql = `UPDATE security_config SET ${setClause}, updated_at = unixepoch() WHERE id = 1`;
  
  const stmt = db.prepare(sql);
  stmt.bind(values);
  stmt.step();
  stmt.free();
  
  saveDb();
}

export function getOrCreateDailyQuota(userId: number, date: string): any {
  const selectStmt = db.prepare('SELECT * FROM daily_usage_quotas WHERE user_id = ? AND date = ?');
  selectStmt.bind([userId, date]);
  let row: Record<string, unknown> | null = null;
  if (selectStmt.step()) {
    row = selectStmt.getAsObject() as Record<string, unknown>;
  }
  selectStmt.free();
  
  if (row) {
    return row;
  }
  
  const insertStmt = db.prepare('INSERT INTO daily_usage_quotas (user_id, date, image_gen_count, chat_adjust_count) VALUES (?, ?, 0, 0)');
  insertStmt.bind([userId, date]);
  insertStmt.step();
  insertStmt.free();
  
  saveDb();
  
  return { user_id: userId, date, image_gen_count: 0, chat_adjust_count: 0 };
}

export function getDailyUsageCounts(userId: number, date: string): { imageGenCount: number; chatAdjustCount: number } {
  const quota = getOrCreateDailyQuota(userId, date);
  return {
    imageGenCount: Number(quota.image_gen_count ?? 0),
    chatAdjustCount: Number(quota.chat_adjust_count ?? 0),
  };
}

export function incrementUsageCount(userId: number, date: string, usageType: 'image_gen' | 'chat_adjust'): number {
  const quota = getOrCreateDailyQuota(userId, date);
  
  let newCount = 0;
  if (usageType === 'image_gen') {
    newCount = quota.image_gen_count + 1;
    const updateStmt = db.prepare('UPDATE daily_usage_quotas SET image_gen_count = ? WHERE user_id = ? AND date = ?');
    updateStmt.bind([newCount, userId, date]);
    updateStmt.step();
    updateStmt.free();
  } else if (usageType === 'chat_adjust') {
    newCount = quota.chat_adjust_count + 1;
    const updateStmt = db.prepare('UPDATE daily_usage_quotas SET chat_adjust_count = ? WHERE user_id = ? AND date = ?');
    updateStmt.bind([newCount, userId, date]);
    updateStmt.step();
    updateStmt.free();
  }
  
  saveDb();
  return newCount;
}

export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
