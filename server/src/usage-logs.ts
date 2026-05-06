import { randomUUID } from 'crypto';
import { db, saveDb } from './db.js';

export type UsageLogScene = 'chat' | 'image' | 'export';
export type UsageLogStatus = 'pending' | 'success' | 'failed';

export interface UsageLogRecord {
  id: string;
  userId: number;
  loginName: string;
  scene: UsageLogScene;
  rawInput: string;
  finalPrompt: string;
  modelProvider: string;
  modelName: string;
  creditsCost: number;
  status: UsageLogStatus;
  errorMessage: string | null;
  conversationId: string;
  jobId: string;
  startedAt: number;
  finishedAt: number | null;
  durationMs: number;
}

export interface UserUsageDetails {
  summary: {
    userId: number;
    totalImageCalls: number;
    totalDownloadCount: number;
  };
  trend: DailyImageTrendPoint[];
  items: UsageLogRecord[];
  downloadItems: UsageLogRecord[];
}

export interface DailyImageTrendPoint {
  dateKey: string;
  label: string;
  count: number;
}

export interface UsageOverviewSummary {
  totalImageCalls: number;
  activeUserCount: number;
  totalDownloadCount: number;
  trend: DailyImageTrendPoint[];
}

export interface UserImageUsageListItem {
  id: number;
  name: string;
  displayName: string;
  lastLoginAt: number | null;
  trend: DailyImageTrendPoint[];
}

type UsageLogRow = {
  id: string;
  user_id: number;
  login_name: string;
  scene: UsageLogScene;
  raw_input: string;
  final_prompt: string;
  model_provider: string;
  model_name: string;
  credits_cost: number;
  status: UsageLogStatus;
  error_message: string | null;
  conversation_id: string;
  job_id: string;
  started_at: number;
  finished_at: number | null;
  duration_ms: number;
};

type UserRow = {
  id: number;
  name: string;
  display_name: string;
  last_login_at: number | null;
};

function clipText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value === 'string') {
    return clipText(value.trim(), maxLength);
  }
  if (value == null) {
    return '';
  }
  try {
    return clipText(JSON.stringify(value), maxLength);
  } catch {
    return clipText(String(value), maxLength);
  }
}

function mapRow(row: UsageLogRow): UsageLogRecord {
  return {
    id: row.id,
    userId: row.user_id,
    loginName: row.login_name,
    scene: row.scene,
    rawInput: row.raw_input,
    finalPrompt: row.final_prompt,
    modelProvider: row.model_provider,
    modelName: row.model_name,
    creditsCost: row.credits_cost,
    status: row.status,
    errorMessage: row.error_message,
    conversationId: row.conversation_id,
    jobId: row.job_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
  };
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getTrendWindow(days: number, now: number = Date.now()): { startAt: number; dayStarts: number[] } {
  const safeDays = Math.min(Math.max(1, Math.floor(days)), 30);
  const todayStart = startOfDay(now);
  const startAt = todayStart - (safeDays - 1) * 24 * 60 * 60 * 1000;
  const dayStarts = Array.from({ length: safeDays }, (_value, index) => startAt + index * 24 * 60 * 60 * 1000);
  return { startAt, dayStarts };
}

export function buildDailyImageTrend(
  timestamps: number[],
  days: number = 7,
  now: number = Date.now(),
): DailyImageTrendPoint[] {
  const { dayStarts } = getTrendWindow(days, now);
  const counts = new Map<string, number>();

  for (const timestamp of timestamps) {
    const key = formatDayKey(timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return dayStarts.map((dayStart) => {
    const dateKey = formatDayKey(dayStart);
    return {
      dateKey,
      label: formatDayLabel(dayStart),
      count: counts.get(dateKey) ?? 0,
    };
  });
}

function listImageLogTimestamps(filters?: { userId?: number; fromTimestamp?: number }): number[] {
  const where = ["scene = 'image'"];
  const params: Array<number> = [];

  if (filters?.userId) {
    where.push('user_id = ?');
    params.push(filters.userId);
  }
  if (typeof filters?.fromTimestamp === 'number') {
    where.push('started_at >= ?');
    params.push(filters.fromTimestamp);
  }

  const stmt = db.prepare(`
    SELECT started_at
    FROM usage_logs
    WHERE ${where.join(' AND ')}
    ORDER BY started_at ASC
  `);
  stmt.bind(params);

  const timestamps: number[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { started_at?: number };
    if (typeof row.started_at === 'number') {
      timestamps.push(row.started_at);
    }
  }
  stmt.free();
  return timestamps;
}

export function createUsageLog(input: {
  userId: number;
  loginName: string;
  scene: UsageLogScene;
  rawInput?: unknown;
  finalPrompt?: unknown;
  modelProvider?: string;
  modelName?: string;
  creditsCost?: number;
  conversationId?: string;
  jobId?: string;
}): UsageLogRecord {
  const now = Date.now();
  const id = `usage-${now}-${randomUUID().slice(0, 8)}`;
  const stmt = db.prepare(`
    INSERT INTO usage_logs (
      id, user_id, login_name, scene, raw_input, final_prompt,
      model_provider, model_name, credits_cost, status, error_message,
      conversation_id, job_id, started_at, finished_at, duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.bind([
    id,
    input.userId,
    input.loginName,
    input.scene,
    normalizeText(input.rawInput, 2000),
    normalizeText(input.finalPrompt, 8000),
    normalizeText(input.modelProvider, 100),
    normalizeText(input.modelName, 200),
    Math.max(0, Math.floor(input.creditsCost ?? 0)),
    'pending',
    null,
    normalizeText(input.conversationId ?? '', 120),
    normalizeText(input.jobId ?? '', 120),
    now,
    null,
    0,
  ]);
  stmt.step();
  stmt.free();
  saveDb();

  return {
    id,
    userId: input.userId,
    loginName: input.loginName,
    scene: input.scene,
    rawInput: normalizeText(input.rawInput, 2000),
    finalPrompt: normalizeText(input.finalPrompt, 8000),
    modelProvider: normalizeText(input.modelProvider, 100),
    modelName: normalizeText(input.modelName, 200),
    creditsCost: Math.max(0, Math.floor(input.creditsCost ?? 0)),
    status: 'pending',
    errorMessage: null,
    conversationId: normalizeText(input.conversationId ?? '', 120),
    jobId: normalizeText(input.jobId ?? '', 120),
    startedAt: now,
    finishedAt: null,
    durationMs: 0,
  };
}

export function finalizeUsageLog(
  logId: string,
  result: {
    status: UsageLogStatus;
    errorMessage?: string | null;
    creditsCost?: number;
  },
): UsageLogRecord | null {
  const currentStmt = db.prepare('SELECT * FROM usage_logs WHERE id = ?');
  currentStmt.bind([logId]);
  const current = currentStmt.step() ? (currentStmt.getAsObject() as UsageLogRow) : null;
  currentStmt.free();
  if (!current) return null;

  const finishedAt = Date.now();
  const durationMs = Math.max(0, finishedAt - current.started_at);
  const creditsCost = result.creditsCost !== undefined
    ? Math.max(0, Math.floor(result.creditsCost))
    : current.credits_cost;
  const stmt = db.prepare(`
    UPDATE usage_logs
    SET status = ?, error_message = ?, credits_cost = ?, finished_at = ?, duration_ms = ?
    WHERE id = ?
  `);
  stmt.bind([
    result.status,
    result.errorMessage ? normalizeText(result.errorMessage, 2000) : null,
    creditsCost,
    finishedAt,
    durationMs,
    logId,
  ]);
  stmt.step();
  stmt.free();
  saveDb();

  const nextStmt = db.prepare('SELECT * FROM usage_logs WHERE id = ?');
  nextStmt.bind([logId]);
  const updated = nextStmt.step() ? (nextStmt.getAsObject() as UsageLogRow) : null;
  nextStmt.free();
  return updated ? mapRow(updated) : null;
}

export function listUsageLogs(filters?: {
  scene?: string;
  userKeyword?: string;
  limit?: number;
}): UsageLogRecord[] {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filters?.scene) {
    where.push('scene = ?');
    params.push(filters.scene);
  }
  if (filters?.userKeyword) {
    where.push('(login_name LIKE ? OR CAST(user_id AS TEXT) LIKE ?)');
    const keyword = `%${filters.userKeyword.trim()}%`;
    params.push(keyword, keyword);
  }

  const limit = Math.min(Math.max(1, Math.floor(filters?.limit ?? 100)), 500);
  const sql = `
    SELECT * FROM usage_logs
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY started_at DESC
    LIMIT ?
  `;
  const stmt = db.prepare(sql);
  stmt.bind([...params, limit]);
  const rows: UsageLogRecord[] = [];
  while (stmt.step()) {
    rows.push(mapRow(stmt.getAsObject() as UsageLogRow));
  }
  stmt.free();
  return rows;
}

export function getUsageOverview(days: number = 7): UsageOverviewSummary {
  const { startAt } = getTrendWindow(days);
  const trendTimestamps = listImageLogTimestamps({ fromTimestamp: startAt });

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) AS total_image_calls,
      COUNT(DISTINCT user_id) AS active_user_count,
      (
        SELECT COUNT(*) AS total_download_count
        FROM usage_logs
        WHERE scene = 'export'
      ) AS total_download_count
    FROM usage_logs
    WHERE scene = 'image' AND started_at >= ?
  `);
  summaryStmt.bind([startAt]);
  const summaryRow = summaryStmt.step()
    ? (summaryStmt.getAsObject() as { total_image_calls?: number; active_user_count?: number })
    : null;
  summaryStmt.free();

  return {
    totalImageCalls: Number(summaryRow?.total_image_calls ?? 0),
    activeUserCount: Number(summaryRow?.active_user_count ?? 0),
    totalDownloadCount: Number((summaryRow as { total_download_count?: number } | null)?.total_download_count ?? 0),
    trend: buildDailyImageTrend(trendTimestamps, days),
  };
}

export function listUsersWithImageUsage(days: number = 7): UserImageUsageListItem[] {
  const { startAt } = getTrendWindow(days);
  const stmt = db.prepare('SELECT id, name, display_name, last_login_at FROM users ORDER BY last_login_at DESC, id ASC');
  const users: UserImageUsageListItem[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as UserRow;
    users.push({
      id: Number(row.id),
      name: String(row.name ?? ''),
      displayName: String(row.display_name ?? ''),
      lastLoginAt: row.last_login_at == null ? null : Number(row.last_login_at),
      trend: buildDailyImageTrend(listImageLogTimestamps({ userId: Number(row.id), fromTimestamp: startAt }), days),
    });
  }

  stmt.free();
  return users;
}

export function getUserUsageOverview(userId: number, limit: number = 20, days: number = 7): UserUsageDetails {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const { startAt } = getTrendWindow(days);

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) AS total_image_calls,
      (
        SELECT COUNT(*) AS total_download_count
        FROM usage_logs
        WHERE user_id = ? AND scene = 'export'
      ) AS total_download_count
    FROM usage_logs
    WHERE user_id = ? AND scene = 'image'
  `);
  summaryStmt.bind([userId, userId]);
  const summaryRow = summaryStmt.step()
    ? (summaryStmt.getAsObject() as { total_image_calls?: number; total_download_count?: number })
    : null;
  summaryStmt.free();

  const detailStmt = db.prepare(`
    SELECT * FROM usage_logs
    WHERE user_id = ? AND scene = 'image'
    ORDER BY started_at DESC
    LIMIT ?
  `);
  detailStmt.bind([userId, safeLimit]);
  const items: UsageLogRecord[] = [];
  while (detailStmt.step()) {
    items.push(mapRow(detailStmt.getAsObject() as UsageLogRow));
  }
  detailStmt.free();

  const downloadStmt = db.prepare(`
    SELECT * FROM usage_logs
    WHERE user_id = ? AND scene = 'export'
    ORDER BY started_at DESC
    LIMIT ?
  `);
  downloadStmt.bind([userId, safeLimit]);
  const downloadItems: UsageLogRecord[] = [];
  while (downloadStmt.step()) {
    downloadItems.push(mapRow(downloadStmt.getAsObject() as UsageLogRow));
  }
  downloadStmt.free();

  return {
    summary: {
      userId,
      totalImageCalls: Number(summaryRow?.total_image_calls ?? 0),
      totalDownloadCount: Number(summaryRow?.total_download_count ?? 0),
    },
    trend: buildDailyImageTrend(listImageLogTimestamps({ userId, fromTimestamp: startAt }), days),
    items,
    downloadItems,
  };
}
