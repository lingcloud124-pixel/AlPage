import { Router } from 'express';
import { db, saveDb } from '../db.js';
import { updateExportJob } from '../export-jobs-store.js';
import { getSecurityConfig } from '../db.js';

const router = Router();

function projectExistsForUser(projectId: string, userId: number): boolean {
  const stmt = db.prepare('SELECT 1 FROM theme_projects WHERE id = ? AND user_id = ?');
  stmt.bind([projectId, userId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function confirmedVersionExistsForUser(confirmedVersionId: string, projectId: string, userId: number): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM theme_confirmed_versions
    WHERE id = ? AND project_id = ? AND user_id = ?
  `);
  stmt.bind([confirmedVersionId, projectId, userId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function parseExportJob(row: Record<string, unknown>) {
  const selectedProducts = typeof row.selected_products === 'string'
    ? JSON.parse(row.selected_products)
    : [];
  const result = typeof row.result_json === 'string' && row.result_json
    ? JSON.parse(row.result_json)
    : undefined;

  return {
    id: String(row.id),
    projectId: String(row.project_id),
    confirmedVersionId: String(row.confirmed_version_id),
    status: String(row.status),
    selectedProducts,
    error: row.error ? String(row.error) : undefined,
    result,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

router.get('/projects/:id/export-jobs', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    if (!projectExistsForUser(id, userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stmt = db.prepare(`
      SELECT id, project_id, confirmed_version_id, status, selected_products, result_json, error, created_at, updated_at
      FROM theme_export_jobs
      WHERE project_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `);
    stmt.bind([id, userId]);

    const jobs = [];
    while (stmt.step()) {
      jobs.push(parseExportJob(stmt.getAsObject()));
    }
    stmt.free();

    res.json(jobs);
  } catch (error) {
    console.error('List export jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/export-jobs', async (req, res) => {
  try {
    const securityConfig = getSecurityConfig();
    if (securityConfig?.enabled_features?.export === false) {
      return res.status(403).json({ error: '主题导出功能已关闭' });
    }

    const userId = (req as any).userId as number;
    const { projectId, confirmedVersionId, selectedProducts } = req.body ?? {};

    if (!projectId || !confirmedVersionId || !Array.isArray(selectedProducts) || selectedProducts.length === 0) {
      return res.status(400).json({ error: 'projectId, confirmedVersionId and selectedProducts are required' });
    }

    if (!projectExistsForUser(projectId, userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!confirmedVersionExistsForUser(confirmedVersionId, projectId, userId)) {
      return res.status(404).json({ error: 'Confirmed version not found' });
    }

    const now = Date.now();
    const exportJobId = `job-${now}`;
    const stmt = db.prepare(`
      INSERT INTO theme_export_jobs (
        id, project_id, user_id, confirmed_version_id, status, selected_products, result_json, error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([
      exportJobId,
      projectId,
      userId,
      confirmedVersionId,
      'queued',
      JSON.stringify(selectedProducts),
      null,
      null,
      now,
      now,
    ]);
    stmt.step();
    stmt.free();

    saveDb();

    res.status(201).json({
      id: exportJobId,
      projectId,
      confirmedVersionId,
      status: 'queued',
      selectedProducts,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Create export job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-jobs/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT id, project_id, confirmed_version_id, status, selected_products, result_json, error, created_at, updated_at
      FROM theme_export_jobs
      WHERE id = ? AND user_id = ?
    `);
    stmt.bind([id, userId]);
    let job: Record<string, unknown> | null = null;
    if (stmt.step()) {
      job = stmt.getAsObject();
    }
    stmt.free();

    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json(parseExportJob(job));
  } catch (error) {
    console.error('Get export job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-jobs/:id/download', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT id, status, user_id, result_json
      FROM theme_export_jobs
      WHERE id = ? AND user_id = ?
    `);
    stmt.bind([id, userId]);

    let row: Record<string, unknown> | null = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();

    if (!row) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    if (String(row.status) !== 'completed') {
      return res.status(409).json({ error: 'Export job is not ready for download' });
    }

    const result = typeof row.result_json === 'string' && row.result_json
      ? JSON.parse(row.result_json)
      : {};

    res.json({
      id,
      status: 'completed',
      result,
      message: 'Simulated download endpoint is ready. Real artifact download will be wired in the next stage.',
    });
  } catch (error) {
    console.error('Download export job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/export-jobs/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const { status, error, result } = req.body ?? {};

    const stmt = db.prepare(`
      SELECT id FROM theme_export_jobs
      WHERE id = ? AND user_id = ?
    `);
    stmt.bind([id, userId]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    const job = updateExportJob(id, {
      status,
      error,
      result,
    });

    if (!job || job.projectId === undefined) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Update export job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as exportJobsRouter };
