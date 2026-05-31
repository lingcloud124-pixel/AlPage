import { Router } from 'express';
import { db, saveDb } from '../db.js';

export const savedPortalsRouter = Router();

// 列出保存的门户
savedPortalsRouter.get('/', (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const countStmt = db.prepare('SELECT COUNT(*) as total FROM saved_portals WHERE user_id = ?');
    countStmt.bind([userId]);
    countStmt.step();
    const total = (countStmt.getAsObject() as any).total;
    countStmt.free();

    const stmt = db.prepare('SELECT id, user_id, project_id, name, template_type, status, created_at, updated_at FROM saved_portals WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    stmt.bind([userId, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ total, items: rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个保存的门户（含完整数据）
savedPortalsRouter.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM saved_portals WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, (req as any).userId]);
    let row: any = null;
    if (stmt.step()) {
      row = stmt.getAsObject() as any;
      try { row.colors = JSON.parse(row.colors); } catch { row.colors = {}; }
      try { row.workspace = JSON.parse(row.workspace); } catch { row.workspace = {}; }
      try { row.portal_plan = JSON.parse(row.portal_plan); } catch { row.portal_plan = {}; }
    }
    stmt.free();
    if (!row) return res.status(404).json({ error: '门户不存在' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 保存门户
savedPortalsRouter.post('/', (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, templateType, colors, workspace, portalPlan, projectId, status } = req.body;
    const id = `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`INSERT INTO saved_portals (id, user_id, project_id, name, template_type, colors, workspace, portal_plan, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.bind([
      id, userId,
      String(projectId || ''),
      String(name || '未命名门户'),
      String(templateType || 'light-ui'),
      JSON.stringify(colors || {}),
      JSON.stringify(workspace || {}),
      JSON.stringify(portalPlan || {}),
      String(status || 'saved'),
      now, now,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新保存的门户
savedPortalsRouter.put('/:id', (req, res) => {
  try {
    const userId = (req as any).userId;
    const now = Math.floor(Date.now() / 1000);
    const { name, templateType, colors, workspace, portalPlan, status } = req.body;

    const existing = db.prepare('SELECT id FROM saved_portals WHERE id = ? AND user_id = ?');
    existing.bind([req.params.id, userId]);
    const found = existing.step();
    existing.free();
    if (!found) return res.status(404).json({ error: '门户不存在' });

    const stmt = db.prepare(`UPDATE saved_portals SET
      name = COALESCE(?, name),
      template_type = COALESCE(?, template_type),
      colors = COALESCE(?, colors),
      workspace = COALESCE(?, workspace),
      portal_plan = COALESCE(?, portal_plan),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ? AND user_id = ?`);
    stmt.bind([
      name ?? null,
      templateType ?? null,
      colors !== undefined ? JSON.stringify(colors) : null,
      workspace !== undefined ? JSON.stringify(workspace) : null,
      portalPlan !== undefined ? JSON.stringify(portalPlan) : null,
      status ?? null,
      now,
      req.params.id, userId,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除保存的门户
savedPortalsRouter.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM saved_portals WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, (req as any).userId]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
