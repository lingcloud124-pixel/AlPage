import { Router } from 'express';

import { db, saveDb } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

const DEFAULT_WORKSPACE_SETTINGS = {
  columns: 4,
  rowHeight: 24,
  gapX: 16,
  gapY: 16,
  paddingX: 20,
  paddingY: 20,
  maxWidth: 1440,
  backgroundMode: 'theme',
};

const DEFAULT_WORKSPACE_ITEMS = [
  { id: 'workspace-card-message-todo', templateId: 'message-todo', x: 0, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { id: 'workspace-card-news-carousel', templateId: 'news-carousel', x: 2, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { id: 'workspace-card-my-schedule', templateId: 'my-schedule', x: 0, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
  { id: 'workspace-card-quick-access', templateId: 'quick-access', x: 2, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
];

function createDefaultWorkspace() {
  const now = Date.now();
  return {
    settings: DEFAULT_WORKSPACE_SETTINGS,
    items: DEFAULT_WORKSPACE_ITEMS,
    meta: {
      initializedAt: now,
      updatedAt: now,
      source: 'default',
    },
  };
}

router.post('/:id/workspace/initialize', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const projectId = req.params.id;
    const now = Math.floor(Date.now() / 1000);
    const workspace = createDefaultWorkspace();
    const stmt = db.prepare(`
      INSERT INTO project_workspaces (project_id, user_id, workspace_settings, workspace_items, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, user_id) DO UPDATE SET
        workspace_settings = excluded.workspace_settings,
        workspace_items = excluded.workspace_items,
        updated_at = excluded.updated_at
    `);
    stmt.bind([
      projectId,
      userId,
      JSON.stringify(workspace.settings),
      JSON.stringify(workspace.items),
      now,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json(workspace);
  } catch (error) {
    logger.error('Initialize project workspace error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/workspace', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const projectId = req.params.id;
    const stmt = db.prepare('SELECT workspace_settings, workspace_items, updated_at FROM project_workspaces WHERE project_id = ? AND user_id = ?');
    stmt.bind([projectId, userId]);
    if (!stmt.step()) {
      stmt.free();
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    res.json({
      settings: JSON.parse(String(row.workspace_settings ?? '{}')),
      items: JSON.parse(String(row.workspace_items ?? '[]')),
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error('Get project workspace error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/workspace/settings', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const projectId = req.params.id;
    const now = Math.floor(Date.now() / 1000);
    const getStmt = db.prepare('SELECT workspace_items FROM project_workspaces WHERE project_id = ? AND user_id = ?');
    getStmt.bind([projectId, userId]);
    const items = getStmt.step() ? (getStmt.getAsObject() as Record<string, unknown>).workspace_items : '[]';
    getStmt.free();

    const stmt = db.prepare(`
      INSERT INTO project_workspaces (project_id, user_id, workspace_settings, workspace_items, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, user_id) DO UPDATE SET
        workspace_settings = excluded.workspace_settings,
        workspace_items = excluded.workspace_items,
        updated_at = excluded.updated_at
    `);
    stmt.bind([projectId, userId, JSON.stringify(req.body ?? {}), items, now]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ projectId });
  } catch (error) {
    logger.error('Update project workspace settings error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/workspace/items', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const projectId = req.params.id;
    const now = Math.floor(Date.now() / 1000);
    const getStmt = db.prepare('SELECT workspace_settings FROM project_workspaces WHERE project_id = ? AND user_id = ?');
    getStmt.bind([projectId, userId]);
    const settings = getStmt.step() ? (getStmt.getAsObject() as Record<string, unknown>).workspace_settings : '{}';
    getStmt.free();

    const stmt = db.prepare(`
      INSERT INTO project_workspaces (project_id, user_id, workspace_settings, workspace_items, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, user_id) DO UPDATE SET
        workspace_settings = excluded.workspace_settings,
        workspace_items = excluded.workspace_items,
        updated_at = excluded.updated_at
    `);
    stmt.bind([projectId, userId, settings, JSON.stringify(req.body ?? []), now]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ projectId });
  } catch (error) {
    logger.error('Update project workspace items error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as workspaceRouter };
