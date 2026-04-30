import { randomUUID } from 'crypto';
import { db, saveDb } from './db.js';

export type ExportJobStatus =
  | 'queued'
  | 'preparing'
  | 'capturing'
  | 'packaging'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ExportJobSnapshot {
  projectId: string;
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: unknown;
  sourceUpdatedAt: number;
  confirmedAt: number;
}

export interface MemoryExportJob {
  id: string;
  userId: number;
  status: ExportJobStatus;
  selectedProducts: string[];
  snapshot: ExportJobSnapshot;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

type ExportJobRow = {
  id: string;
  user_id: number;
  confirmed_version_id: string;
  status: ExportJobStatus;
  selected_products: string;
  snapshot: string;
  error: string | null;
  result: string | null;
  created_at: number;
  updated_at: number;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRowToJob(row: ExportJobRow | null | undefined): MemoryExportJob | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    selectedProducts: parseJson<string[]>(row.selected_products, []),
    snapshot: parseJson<ExportJobSnapshot>(row.snapshot, {
      projectId: '',
      name: '',
      nameEn: '',
      templateType: 'light-ui',
      colors: {},
      sourceUpdatedAt: 0,
      confirmedAt: 0,
    }),
    error: row.error ?? null,
    result: parseJson<Record<string, unknown> | null>(row.result, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadSingleJob(sql: string, params: Array<string | number>): MemoryExportJob | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? (stmt.getAsObject() as unknown as ExportJobRow) : null;
  stmt.free();
  return mapRowToJob(row);
}

export function createExportJob(data: {
  userId: number;
  selectedProducts: string[];
  snapshot: ExportJobSnapshot;
}): MemoryExportJob {
  const now = Date.now();
  const job: MemoryExportJob = {
    id: `job-${Date.now()}-${randomUUID().slice(0, 8)}`,
    userId: data.userId,
    status: 'queued',
    selectedProducts: data.selectedProducts,
    snapshot: data.snapshot,
    error: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  };

  const stmt = db.prepare(`
    INSERT INTO theme_export_jobs (
      id, user_id, confirmed_version_id, status, selected_products, snapshot, error, result, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.bind([
    job.id,
    job.userId,
    '',
    job.status,
    JSON.stringify(job.selectedProducts),
    JSON.stringify(job.snapshot),
    job.error,
    job.result ? JSON.stringify(job.result) : null,
    job.createdAt,
    job.updatedAt,
  ]);
  stmt.step();
  stmt.free();
  saveDb();
  return job;
}

export function getExportJobById(jobId: string): MemoryExportJob | undefined {
  return loadSingleJob('SELECT * FROM theme_export_jobs WHERE id = ?', [jobId]);
}

export function getExportJobByIdAndUser(jobId: string, userId: number): MemoryExportJob | undefined {
  return loadSingleJob('SELECT * FROM theme_export_jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
}

function loadJobsByStatuses(statuses: ExportJobStatus[], limit: number): MemoryExportJob[] {
  if (statuses.length === 0) return [];
  const placeholders = statuses.map(() => '?').join(', ');
  const stmt = db.prepare(
    `SELECT * FROM theme_export_jobs WHERE status IN (${placeholders}) ORDER BY created_at ASC LIMIT ?`,
  );
  stmt.bind([...statuses, limit]);
  const jobs: MemoryExportJob[] = [];
  while (stmt.step()) {
    const job = mapRowToJob(stmt.getAsObject() as unknown as ExportJobRow);
    if (job) jobs.push(job);
  }
  stmt.free();
  return jobs;
}

export function listQueuedExportJobs(limit: number = 10): MemoryExportJob[] {
  return loadJobsByStatuses(['queued'], limit);
}

export function listRecoverableExportJobs(limit: number = 10): MemoryExportJob[] {
  return loadJobsByStatuses(['preparing', 'capturing', 'packaging', 'verifying'], limit);
}

export function requeueInFlightExportJobs(): number {
  const inFlight = listRecoverableExportJobs(1000);
  let updatedCount = 0;

  for (const job of inFlight) {
    const nextError = job.error ?? 'Job interrupted before completion; re-queued on service startup';
    const stmt = db.prepare(`
      UPDATE theme_export_jobs
      SET status = ?, error = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.bind(['queued', nextError, Date.now(), job.id]);
    stmt.step();
    stmt.free();
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    saveDb();
  }

  return updatedCount;
}

export function updateExportJob(
  jobId: string,
  updates: Partial<Pick<MemoryExportJob, 'status' | 'error' | 'result'>>,
): MemoryExportJob | null {
  const current = getExportJobById(jobId);
  if (!current) return null;

  const nextStatus = updates.status ?? current.status;
  const nextError = updates.error !== undefined ? updates.error : current.error;
  const nextResult = updates.result !== undefined ? updates.result : current.result;
  const nextUpdatedAt = Date.now();

  const stmt = db.prepare(`
    UPDATE theme_export_jobs
    SET status = ?, error = ?, result = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.bind([
    nextStatus,
    nextError,
    nextResult ? JSON.stringify(nextResult) : null,
    nextUpdatedAt,
    jobId,
  ]);
  stmt.step();
  stmt.free();
  saveDb();

  return getExportJobById(jobId) ?? null;
}
