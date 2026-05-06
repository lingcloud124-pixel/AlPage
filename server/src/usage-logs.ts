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
    totalCalls: number;
    totalCreditsCost: number;
    latestStartedAt: number | null;
  };
  items: UsageLogRecord[];
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

export function getUserUsageDetails(userId: number, limit: number = 20): UserUsageDetails {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) AS total_calls,
      COALESCE(SUM(credits_cost), 0) AS total_credits_cost,
      MAX(started_at) AS latest_started_at
    FROM usage_logs
    WHERE user_id = ? AND scene IN ('chat', 'image')
  `);
  summaryStmt.bind([userId]);
  const summaryRow = summaryStmt.step()
    ? (summaryStmt.getAsObject() as { total_calls?: number; total_credits_cost?: number; latest_started_at?: number | null })
    : null;
  summaryStmt.free();

  const detailStmt = db.prepare(`
    SELECT * FROM usage_logs
    WHERE user_id = ? AND scene IN ('chat', 'image')
    ORDER BY started_at DESC
    LIMIT ?
  `);
  detailStmt.bind([userId, safeLimit]);
  const items: UsageLogRecord[] = [];
  while (detailStmt.step()) {
    items.push(mapRow(detailStmt.getAsObject() as UsageLogRow));
  }
  detailStmt.free();

  return {
    summary: {
      userId,
      totalCalls: Number(summaryRow?.total_calls ?? 0),
      totalCreditsCost: Number(summaryRow?.total_credits_cost ?? 0),
      latestStartedAt: summaryRow?.latest_started_at == null ? null : Number(summaryRow.latest_started_at),
    },
    items,
  };
}
