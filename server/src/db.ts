import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync, rmSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

const DB_PATH = join(process.cwd(), 'data', 'theme-studio.db');
const BACKUP_DIR = join(process.cwd(), 'data', 'backups');
const BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_BACKUPS = 24;

let db: Database;
let backupTimer: ReturnType<typeof setInterval> | null = null;

function hasColumn(tableName: string, columnName: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  let found = false;
  while (stmt.step()) {
    const row = stmt.getAsObject() as { name?: string };
    if (row.name === columnName) {
      found = true;
      break;
    }
  }
  stmt.free();
  return found;
}

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();
  
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    db = new SQL.Database();
  }
  
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA synchronous=NORMAL');
  db.run('PRAGMA busy_timeout=5000');

  db.run('DROP TABLE IF EXISTS theme_export_jobs');
  db.run('DROP TABLE IF EXISTS theme_confirmed_versions');
  db.run('DROP TABLE IF EXISTS theme_chat_messages');
  db.run('DROP TABLE IF EXISTS theme_projects');

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL
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
      image_provider TEXT NOT NULL DEFAULT 'minimax',
      image_endpoint TEXT NOT NULL DEFAULT '',
      image_api_key TEXT NOT NULL DEFAULT '',
      image_access_key_id TEXT NOT NULL DEFAULT '',
      image_secret_access_key TEXT NOT NULL DEFAULT '',
      image_model TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  if (!hasColumn('model_config', 'image_provider')) {
    db.run(`ALTER TABLE model_config ADD COLUMN image_provider TEXT NOT NULL DEFAULT 'minimax'`);
  }
  if (!hasColumn('model_config', 'image_access_key_id')) {
    db.run(`ALTER TABLE model_config ADD COLUMN image_access_key_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!hasColumn('model_config', 'image_secret_access_key')) {
    db.run(`ALTER TABLE model_config ADD COLUMN image_secret_access_key TEXT NOT NULL DEFAULT ''`);
  }

  db.run(`
    INSERT OR IGNORE INTO model_config (
      id, chat_endpoint, chat_api_key, chat_model,
      image_provider, image_endpoint, image_api_key, image_access_key_id, image_secret_access_key, image_model
    )
    VALUES (1, '', '', '', 'minimax', '', '', '', '', '')
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
      credits_per_conversation INTEGER NOT NULL DEFAULT 25,
      daily_credits_limit INTEGER NOT NULL DEFAULT 100,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  db.run(`
    INSERT OR IGNORE INTO security_config (id, cors_origins, proxy_image_hosts, rate_limits, enabled_features, daily_image_gen_limit, daily_chat_adjust_limit, credits_per_conversation, daily_credits_limit)
    VALUES (1, '["http://localhost:5173"]', '[]', '{"chat":60,"image":20,"export":10,"proxyImage":60}', '{"cors":true,"proxyImage":true,"rateLimiting":true,"adminAuth":true,"quota":true,"export":true,"image":true,"chat":true}', 100, 50, 25, 100)
  `);

  // Create user_credits table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_credits (
      user_id INTEGER NOT NULL,
      credits INTEGER NOT NULL DEFAULT 100,
      last_reset_at INTEGER NOT NULL,
      PRIMARY KEY (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed credits for all users
  const creditNow = Math.floor(Date.now() / 1000);
  [1, 2, 3].forEach(uid => {
    const cs = db.prepare('INSERT OR IGNORE INTO user_credits (user_id, credits, last_reset_at) VALUES (?, 100, ?)');
    cs.bind([uid, creditNow]);
    cs.step();
    cs.free();
  });

  // Save to disk
  saveDb();
  startBackupScheduler();
  logger.info('Database initialized successfully');
}

export function saveDb() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    mkdirSync(join(DB_PATH, '..'), { recursive: true });
    writeFileSync(DB_PATH, buffer);
  } catch (err) {
    logger.error('Failed to save database', err);
  }
}

export function closeDb(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  try {
    saveDb();
    (db as any).close();
    logger.info('Database closed');
  } catch (err) {
    logger.error('Error closing database', err);
  }
}

function backupDb(): void {
  try {
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;
    const backupPath = join(BACKUP_DIR, `theme-studio-${ts}.db`);
    const data = db.export();
    writeFileSync(backupPath, Buffer.from(data));
    logger.info('Database backup created', { path: backupPath });
    rotateBackups();
  } catch (err) {
    logger.error('Database backup failed', err);
  }
}

function rotateBackups(): void {
  try {
    if (!existsSync(BACKUP_DIR)) return;
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('theme-studio-') && f.endsWith('.db'))
      .sort();
    while (files.length > MAX_BACKUPS) {
      unlinkSync(join(BACKUP_DIR, files.shift()!));
    }
  } catch {}
}

function startBackupScheduler(): void {
  backupDb();
  backupTimer = setInterval(backupDb, BACKUP_INTERVAL_MS);
  setInterval(() => {
    cleanupOldExportFiles();
    vacuumDb();
  }, 24 * 60 * 60 * 1000);
  setTimeout(() => {
    cleanupOldExportFiles();
  }, 10000);
}

const EXPORT_OUTPUT_DIR = join(process.cwd(), '..', 'output', 'service-jobs');
const EXPORT_RETENTION_DAYS = 30;

function cleanupOldExportFiles(): void {
  try {
    if (!existsSync(EXPORT_OUTPUT_DIR)) return;
    const cutoff = Date.now() - EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const jobDirs = readdirSync(EXPORT_OUTPUT_DIR);
    let cleaned = 0;
    for (const dir of jobDirs) {
      const dirPath = join(EXPORT_OUTPUT_DIR, dir);
      try {
        const st = statSync(dirPath);
        if (st.isDirectory() && st.mtimeMs < cutoff) {
          rmSync(dirPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch {}
    }
    if (cleaned > 0) logger.info('Cleaned old export files', { count: cleaned });
  } catch (err) {
    logger.error('Export cleanup failed', err);
  }
}

function vacuumDb(): void {
  try {
    db.run('VACUUM');
    logger.info('Database VACUUM completed');
  } catch (err) {
    logger.error('VACUUM failed', err);
  }
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
  daily_chat_adjust_limit?: number,
  credits_per_conversation?: number,
  daily_credits_limit?: number
): Promise<void> {
  const current = getSecurityConfig();
  
  const updateFields: Record<string, any> = {};
  if (cors_origins !== undefined) updateFields.cors_origins = JSON.stringify(cors_origins);
  if (proxy_image_hosts !== undefined) updateFields.proxy_image_hosts = JSON.stringify(proxy_image_hosts);
  if (rate_limits !== undefined) updateFields.rate_limits = JSON.stringify(rate_limits);
  if (enabled_features !== undefined) updateFields.enabled_features = JSON.stringify(enabled_features);
  if (daily_image_gen_limit !== undefined) updateFields.daily_image_gen_limit = daily_image_gen_limit;
  if (daily_chat_adjust_limit !== undefined) updateFields.daily_chat_adjust_limit = daily_chat_adjust_limit;
  if (credits_per_conversation !== undefined) updateFields.credits_per_conversation = credits_per_conversation;
  if (daily_credits_limit !== undefined) updateFields.daily_credits_limit = daily_credits_limit;
  
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

function getLastResetPoint(): number {
  const now = new Date();
  const today6am = new Date(now);
  today6am.setHours(6, 0, 0, 0);
  if (now < today6am) {
    today6am.setDate(today6am.getDate() - 1);
  }
  return Math.floor(today6am.getTime() / 1000);
}

export function checkAndResetCredits(userId: number): void {
  const stmt = db.prepare('SELECT last_reset_at FROM user_credits WHERE user_id = ?');
  stmt.bind([userId]);
  let lastResetAt = 0;
  if (stmt.step()) {
    lastResetAt = (stmt.getAsObject() as any).last_reset_at as number;
  }
  stmt.free();

  const resetPoint = getLastResetPoint();
  if (lastResetAt < resetPoint) {
    const config = getSecurityConfig();
    const limit = config?.daily_credits_limit ?? 100;
    const updateStmt = db.prepare('UPDATE user_credits SET credits = ?, last_reset_at = ? WHERE user_id = ?');
    updateStmt.bind([limit, Math.floor(Date.now() / 1000), userId]);
    updateStmt.step();
    updateStmt.free();
    saveDb();
  }
}

export function getCredits(userId: number): { credits: number; lastResetAt: number } {
  checkAndResetCredits(userId);
  const stmt = db.prepare('SELECT credits, last_reset_at FROM user_credits WHERE user_id = ?');
  stmt.bind([userId]);
  let result = { credits: 100, lastResetAt: 0 };
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result = { credits: row.credits as number, lastResetAt: row.last_reset_at as number };
  }
  stmt.free();
  return result;
}

export function deductCredits(userId: number, amount: number): { success: boolean; remaining: number } {
  checkAndResetCredits(userId);
  const current = getCredits(userId);
  if (current.credits < amount) {
    return { success: false, remaining: current.credits };
  }
  const newCredits = current.credits - amount;
  const updateStmt = db.prepare('UPDATE user_credits SET credits = ? WHERE user_id = ?');
  updateStmt.bind([newCredits, userId]);
  updateStmt.step();
  updateStmt.free();
  saveDb();
  return { success: true, remaining: newCredits };
}

export function getNextResetTime(): string {
  const now = new Date();
  const next6am = new Date(now);
  next6am.setHours(6, 0, 0, 0);
  if (now >= next6am) {
    next6am.setDate(next6am.getDate() + 1);
  }
  return next6am.toISOString();
}
