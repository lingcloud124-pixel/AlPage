import { Router } from 'express';
import { db, saveDb } from '../db.js';

const router = Router();

function projectExistsForUser(projectId: string, userId: number): boolean {
  const stmt = db.prepare('SELECT 1 FROM theme_projects WHERE id = ? AND user_id = ?');
  stmt.bind([projectId, userId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function parseSnapshot(row: Record<string, unknown>) {
  const snapshotJson = typeof row.snapshot_json === 'string' ? row.snapshot_json : '{}';
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    projectSnapshot: JSON.parse(snapshotJson),
  };
}

router.get('/:id/confirmed-versions', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    if (!projectExistsForUser(id, userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stmt = db.prepare(`
      SELECT id, project_id, snapshot_json, created_at, updated_at
      FROM theme_confirmed_versions
      WHERE project_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `);
    stmt.bind([id, userId]);

    const versions = [];
    while (stmt.step()) {
      versions.push(parseSnapshot(stmt.getAsObject()));
    }
    stmt.free();

    res.json(versions);
  } catch (error) {
    console.error('List confirmed versions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/confirmed-versions', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const { projectSnapshot } = req.body ?? {};

    if (!projectExistsForUser(id, userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!projectSnapshot || typeof projectSnapshot !== 'object') {
      return res.status(400).json({ error: 'projectSnapshot is required' });
    }

    const now = Date.now();
    const confirmedVersionId = `confirmed-${now}`;
    const stmt = db.prepare(`
      INSERT INTO theme_confirmed_versions (
        id, project_id, user_id, snapshot_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([
      confirmedVersionId,
      id,
      userId,
      JSON.stringify(projectSnapshot),
      now,
      now,
    ]);
    stmt.step();
    stmt.free();

    saveDb();

    res.status(201).json({
      id: confirmedVersionId,
      projectId: id,
      createdAt: now,
      updatedAt: now,
      projectSnapshot,
    });
  } catch (error) {
    console.error('Create confirmed version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as confirmedVersionsRouter };
