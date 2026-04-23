import { db, saveDb } from './db.js';

export type ExportJobStatus =
  | 'queued'
  | 'preparing'
  | 'capturing'
  | 'packaging'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ExportJobRecord {
  id: string;
  projectId: string;
  userId: number;
  confirmedVersionId: string;
  status: ExportJobStatus;
  selectedProducts: string[];
  error?: string;
  result?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

function parseRecord(row: Record<string, unknown>): ExportJobRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: Number(row.user_id),
    confirmedVersionId: String(row.confirmed_version_id),
    status: String(row.status) as ExportJobStatus,
    selectedProducts: typeof row.selected_products === 'string' ? JSON.parse(row.selected_products) : [],
    error: row.error ? String(row.error) : undefined,
    result: typeof row.result_json === 'string' && row.result_json ? JSON.parse(row.result_json) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function listQueuedExportJobs(limit: number = 10): ExportJobRecord[] {
  const stmt = db.prepare(`
    SELECT id, project_id, user_id, confirmed_version_id, status, selected_products, result_json, error, created_at, updated_at
    FROM theme_export_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const jobs: ExportJobRecord[] = [];
  while (stmt.step()) {
    jobs.push(parseRecord(stmt.getAsObject()));
  }
  stmt.free();
  return jobs;
}

export function getExportJobById(jobId: string): ExportJobRecord | null {
  const stmt = db.prepare(`
    SELECT id, project_id, user_id, confirmed_version_id, status, selected_products, result_json, error, created_at, updated_at
    FROM theme_export_jobs
    WHERE id = ?
  `);
  stmt.bind([jobId]);

  let job: ExportJobRecord | null = null;
  if (stmt.step()) {
    job = parseRecord(stmt.getAsObject());
  }
  stmt.free();
  return job;
}

export function updateExportJob(jobId: string, patch: {
  status?: ExportJobStatus;
  error?: string | null;
  result?: Record<string, unknown> | null;
}): ExportJobRecord | null {
  const existing = getExportJobById(jobId);
  if (!existing) return null;

  const updatedAt = Date.now();
  const stmt = db.prepare(`
    UPDATE theme_export_jobs
    SET status = COALESCE(?, status),
        error = ?,
        result_json = ?,
        updated_at = ?
    WHERE id = ?
  `);
  stmt.bind([
    patch.status ?? null,
    patch.error ?? null,
    patch.result ? JSON.stringify(patch.result) : null,
    updatedAt,
    jobId,
  ]);
  stmt.step();
  stmt.free();
  saveDb();
  return getExportJobById(jobId);
}

export function getConfirmedVersionSnapshot(confirmedVersionId: string, projectId: string, userId: number): Record<string, unknown> | null {
  const stmt = db.prepare(`
    SELECT snapshot_json
    FROM theme_confirmed_versions
    WHERE id = ? AND project_id = ? AND user_id = ?
  `);
  stmt.bind([confirmedVersionId, projectId, userId]);
  let snapshot: Record<string, unknown> | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    snapshot = typeof row.snapshot_json === 'string' ? JSON.parse(row.snapshot_json) : null;
  }
  stmt.free();
  return snapshot;
}
