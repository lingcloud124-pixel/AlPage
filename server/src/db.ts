import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync, rmSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

const DB_PATH = join(process.cwd(), 'data', 'theme-studio.db');
const BACKUP_DIR = join(process.cwd(), 'data', 'backups');
const BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BACKUP_RETENTION_COUNT = 8;
const DEFAULT_EXPORT_RETENTION_DAYS = 7;

let db: Database;
let backupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Schedule a debounced write to disk (500ms). Multiple rapid saves coalesce into one. */
export function saveDb(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(doSaveDb, 500);
}

/** Force-immediate write (used by graceful shutdown and backups). */
export function flushDb(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  doSaveDb();
}

function doSaveDb(): void {
  saveTimer = null;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    mkdirSync(join(DB_PATH, '..'), { recursive: true });
    writeFileSync(DB_PATH, buffer);
  } catch (err) {
    logger.error('Failed to save database', err);
  }
}

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

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      last_login_at INTEGER
    );
  `);

  // Migrate: add last_login_at column if missing (existing DBs)
  try {
    db.run('ALTER TABLE users ADD COLUMN last_login_at INTEGER');
  } catch { /* column already exists */ }

  // Seed users
  // Seed default users (kept for dev/legacy compat)
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

  // Create app_config table (key-value store for app-level configuration)
  db.run(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

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
      cors_origins TEXT NOT NULL DEFAULT '["http://localhost:5173","http://127.0.0.1:5173","http://localhost:4173","http://127.0.0.1:4173"]',
      proxy_image_hosts TEXT NOT NULL DEFAULT '["*.byteimg.com"]',
      rate_limits TEXT NOT NULL DEFAULT '{}',
      enabled_features TEXT NOT NULL DEFAULT '{"cors":true,"proxyImage":true,"rateLimiting":true,"adminAuth":true,"quota":true,"export":true,"image":true,"chat":true}',
      daily_image_gen_limit INTEGER NOT NULL DEFAULT 100,
      daily_chat_adjust_limit INTEGER NOT NULL DEFAULT 50,
      credits_per_conversation INTEGER NOT NULL DEFAULT 1,
      credits_per_image INTEGER NOT NULL DEFAULT 1,
      daily_credits_limit INTEGER NOT NULL DEFAULT 10,
      backup_retention_count INTEGER NOT NULL DEFAULT 8,
      export_retention_days INTEGER NOT NULL DEFAULT 7,
      credits_tooltip_content TEXT NOT NULL DEFAULT '1、每位用户每日可获得 10 积分\n2、每成功生成 1 次主题背景图，扣除 1 积分\n3、每日积分将在次日 06:00 自动清零并重新发放',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Migrate: add credits_per_image column if it doesn't exist (existing DBs)
  try {
    const cols = db.prepare("PRAGMA table_info(security_config)");
    const colNames: string[] = [];
    while (cols.step()) {
      const row = cols.getAsObject() as Record<string, unknown>;
      colNames.push(row.name as string);
    }
    cols.free();
    if (!colNames.includes('credits_per_image')) {
      db.run('ALTER TABLE security_config ADD COLUMN credits_per_image INTEGER NOT NULL DEFAULT 1');
    }
    if (!colNames.includes('backup_retention_count')) {
      db.run(`ALTER TABLE security_config ADD COLUMN backup_retention_count INTEGER NOT NULL DEFAULT ${DEFAULT_BACKUP_RETENTION_COUNT}`);
    }
    if (!colNames.includes('export_retention_days')) {
      db.run(`ALTER TABLE security_config ADD COLUMN export_retention_days INTEGER NOT NULL DEFAULT ${DEFAULT_EXPORT_RETENTION_DAYS}`);
    }
    if (!colNames.includes('credits_tooltip_content')) {
      db.run(`ALTER TABLE security_config ADD COLUMN credits_tooltip_content TEXT NOT NULL DEFAULT '1、每位用户每日可获得 10 积分
2、每成功生成 1 次主题背景图，扣除 1 积分
3、每日积分将在次日 06:00 自动清零并重新发放'`);
    }
    if (!colNames.includes('whitelist_enabled')) {
      db.run('ALTER TABLE security_config ADD COLUMN whitelist_enabled INTEGER NOT NULL DEFAULT 0');
    }
    if (!colNames.includes('whitelist_users')) {
      db.run("ALTER TABLE security_config ADD COLUMN whitelist_users TEXT NOT NULL DEFAULT '[]'");
    }
  } catch {
    // Column may already exist, ignore
  }

  db.run(`
    INSERT OR IGNORE INTO security_config (id, cors_origins, proxy_image_hosts, rate_limits, enabled_features, daily_image_gen_limit, daily_chat_adjust_limit, credits_per_conversation, credits_per_image, daily_credits_limit, backup_retention_count, export_retention_days, credits_tooltip_content)
    VALUES (1, '["http://localhost:5173","http://127.0.0.1:5173","http://localhost:4173","http://127.0.0.1:4173"]', '["*.byteimg.com"]', '{"chat":60,"image":20,"export":10,"proxyImage":60}', '{"cors":true,"proxyImage":true,"rateLimiting":true,"adminAuth":true,"quota":true,"export":true,"image":true,"chat":true}', 100, 50, 1, 1, 10, 8, 7, '1、每位用户每日可获得 10 积分\n2、每成功生成 1 次主题背景图，扣除 1 积分\n3、每日积分将在次日 06:00 自动清零并重新发放')
  `);

  db.run(`UPDATE security_config SET credits_tooltip_content = '1、每位用户每日可获得 10 积分\n2、每成功生成 1 次主题背景图，扣除 1 积分\n3、每日积分将在次日 06:00 自动清零并重新发放' WHERE credits_tooltip_content LIKE '%100 免费积分%'`);

  db.run(`UPDATE security_config SET daily_credits_limit = 10, credits_per_image = 1, credits_per_conversation = 1, credits_tooltip_content = '1、每位用户每日可获得 10 积分\n2、每成功生成 1 次主题背景图，扣除 1 积分\n3、每日积分将在次日 06:00 自动清零并重新发放' WHERE daily_credits_limit = 100 OR credits_per_image = 50`);

  db.run(`
    CREATE TABLE IF NOT EXISTS landing_prompts_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1,
      entries_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  try {
    db.run('ALTER TABLE landing_prompts_config ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
  } catch { /* column already exists */ }

  db.run(`
    INSERT OR IGNORE INTO landing_prompts_config (id, enabled, entries_json)
    VALUES (1, 1, '[]')
  `);

  // Create user_credits table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_credits (
      user_id INTEGER NOT NULL,
      credits INTEGER NOT NULL DEFAULT 10,
      last_reset_at INTEGER NOT NULL,
      PRIMARY KEY (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`UPDATE user_credits SET credits = 10 WHERE credits > 10`);

  // Seed credits for all users
  const creditNow = Math.floor(Date.now() / 1000);
  [1, 2, 3].forEach(uid => {
    const cs = db.prepare('INSERT OR IGNORE INTO user_credits (user_id, credits, last_reset_at) VALUES (?, 10, ?)');
    cs.bind([uid, creditNow]);
    cs.step();
    cs.free();
  });

  // Create conversations table for sidebar history
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '未命名项目',
      messages TEXT NOT NULL DEFAULT '[]',
      project_snapshot TEXT NOT NULL DEFAULT '{}',
      image_data TEXT,
      has_generated_theme INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS theme_export_jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      confirmed_version_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      selected_products TEXT NOT NULL DEFAULT '[]',
      snapshot TEXT NOT NULL DEFAULT '{}',
      error TEXT,
      result TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  if (!hasColumn('theme_export_jobs', 'confirmed_version_id')) {
    db.run(`ALTER TABLE theme_export_jobs ADD COLUMN confirmed_version_id TEXT NOT NULL DEFAULT ''`);
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_theme_export_jobs_user_updated ON theme_export_jobs(user_id, updated_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_theme_export_jobs_status_created ON theme_export_jobs(status, created_at ASC)');

  db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      login_name TEXT NOT NULL DEFAULT '',
      scene TEXT NOT NULL DEFAULT '',
      raw_input TEXT NOT NULL DEFAULT '',
      final_prompt TEXT NOT NULL DEFAULT '',
      model_provider TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT '',
      credits_cost INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      conversation_id TEXT NOT NULL DEFAULT '',
      job_id TEXT NOT NULL DEFAULT '',
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      duration_ms INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_usage_logs_started ON usage_logs(started_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_usage_logs_user_started ON usage_logs(user_id, started_at DESC)');

  // Save to disk
  flushDb();
  startBackupScheduler();
  logger.info('Database initialized successfully');
}

export function closeDb(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  try {
    flushDb();
    (db as any).close();
    logger.info('Database closed');
  } catch (err) {
    logger.error('Error closing database', err);
  }
}

function backupDb(): void {
  try {
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
    flushDb();
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
    const config = getSecurityConfig();
    const retentionCount = Math.max(1, Number(config?.backup_retention_count ?? DEFAULT_BACKUP_RETENTION_COUNT));
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('theme-studio-') && f.endsWith('.db'))
      .sort();
    while (files.length > retentionCount) {
      unlinkSync(join(BACKUP_DIR, files.shift()!));
    }
  } catch {}
}

function startBackupScheduler(): void {
  backupDb();
  backupTimer = setInterval(backupDb, BACKUP_INTERVAL_MS);
  cleanupTimer = setInterval(() => {
    cleanupOldExportFiles();
    vacuumDb();
  }, 24 * 60 * 60 * 1000);
  setTimeout(() => {
    cleanupOldExportFiles();
  }, 10000);
}

const EXPORT_OUTPUT_DIR = join(process.cwd(), 'data', 'output', 'service-jobs');

function cleanupOldExportFiles(): void {
  try {
    if (!existsSync(EXPORT_OUTPUT_DIR)) return;
    const config = getSecurityConfig();
    const retentionDays = Math.max(1, Number(config?.export_retention_days ?? DEFAULT_EXPORT_RETENTION_DAYS));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
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

export function getLandingPromptsConfig(): any {
  const stmt = db.prepare('SELECT * FROM landing_prompts_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();

  if (!row) return null;

  let entries: any[] = [];
  try {
    entries = JSON.parse(String(row.entries_json || '[]'));
    if (!Array.isArray(entries)) entries = [];
  } catch { entries = []; }

  return { enabled: row.enabled ? true : false, entries, updated_at: row.updated_at };
}

export function updateLandingPromptsConfig(entries: any[], enabled?: boolean): void {
  const json = JSON.stringify(entries);
  const enabledValue = typeof enabled === 'boolean' ? (enabled ? 1 : 0) : 1;
  const stmt = db.prepare(`
    INSERT INTO landing_prompts_config (id, enabled, entries_json, updated_at)
    VALUES (1, ?, ?, unixepoch())
    ON CONFLICT (id) DO UPDATE SET enabled = excluded.enabled, entries_json = excluded.entries_json, updated_at = unixepoch()
  `);
  stmt.bind([enabledValue, json]);
  stmt.step();
  stmt.free();
  saveDb();
}

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
  
  return {
    ...row,
    cors_origins: safeJsonParse(row.cors_origins as string, []),
    proxy_image_hosts: safeJsonParse(row.proxy_image_hosts as string, []),
    rate_limits: safeJsonParse(row.rate_limits as string, {}),
    enabled_features: safeJsonParse(row.enabled_features as string, {}),
  };
}

export async function updateSecurityConfig(
cors_origins?: string[],
proxy_image_hosts?: string[],
rate_limits?: Record<string, any>,
enabled_features?: Record<string, boolean>,
daily_image_gen_limit?: number,
daily_chat_adjust_limit?: number,
credits_per_conversation?: number,
credits_per_image?: number,
daily_credits_limit?: number,
backup_retention_count?: number,
export_retention_days?: number,
credits_tooltip_content?: string,
whitelist_enabled?: boolean,
whitelist_users?: string[]
): Promise<void> {
  const updateFields: Record<string, any> = {};
  if (cors_origins !== undefined) updateFields.cors_origins = JSON.stringify(cors_origins);
  if (proxy_image_hosts !== undefined) updateFields.proxy_image_hosts = JSON.stringify(proxy_image_hosts);
  if (rate_limits !== undefined) updateFields.rate_limits = JSON.stringify(rate_limits);
  if (enabled_features !== undefined) updateFields.enabled_features = JSON.stringify(enabled_features);
  if (daily_image_gen_limit !== undefined) updateFields.daily_image_gen_limit = daily_image_gen_limit;
  if (daily_chat_adjust_limit !== undefined) updateFields.daily_chat_adjust_limit = daily_chat_adjust_limit;
if (credits_per_conversation !== undefined) updateFields.credits_per_conversation = credits_per_conversation;
if (credits_per_image !== undefined) updateFields.credits_per_image = credits_per_image;
if (daily_credits_limit !== undefined) updateFields.daily_credits_limit = daily_credits_limit;
if (backup_retention_count !== undefined) updateFields.backup_retention_count = backup_retention_count;
if (export_retention_days !== undefined) updateFields.export_retention_days = export_retention_days;
if (credits_tooltip_content !== undefined) updateFields.credits_tooltip_content = credits_tooltip_content;
if (whitelist_enabled !== undefined) updateFields.whitelist_enabled = whitelist_enabled ? 1 : 0;
if (whitelist_users !== undefined) updateFields.whitelist_users = JSON.stringify(whitelist_users);
  
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
    const limit = config?.daily_credits_limit ?? 10;
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
  let result = { credits: 10, lastResetAt: 0 };
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

export function ensureUserByLoginName(loginName: string): number {
  const findStmt = db.prepare('SELECT id FROM users WHERE name = ?');
  findStmt.bind([loginName]);
  if (findStmt.step()) {
    const row = findStmt.getAsObject() as { id: number };
    findStmt.free();
    const now = Math.floor(Date.now() / 1000);
    const upd = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
    upd.bind([now, row.id]);
    upd.step();
    upd.free();
    saveDb();
    return row.id;
  }
  findStmt.free();

  const displayName = loginName;
  const now = Math.floor(Date.now() / 1000);
  const insertStmt = db.prepare('INSERT INTO users (name, display_name, last_login_at) VALUES (?, ?, ?)');
  insertStmt.bind([loginName, displayName, now]);
  insertStmt.step();
  insertStmt.free();

  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const row = idStmt.getAsObject() as { id: number };
  idStmt.free();

  const newUserId = row.id;
  const creditNow = Math.floor(Date.now() / 1000);
  const cs = db.prepare('INSERT INTO user_credits (user_id, credits, last_reset_at) VALUES (?, 10, ?)');
  cs.bind([newUserId, creditNow]);
  cs.step();
  cs.free();

  saveDb();
  logger.info('Auto-created user from EKP SSO', { loginName, userId: newUserId });
  return newUserId;
}
