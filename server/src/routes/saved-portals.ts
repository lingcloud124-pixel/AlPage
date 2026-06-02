import { Router } from 'express';
import { db, saveDb } from '../db.js';

// 管理员路由：跨用户列出所有保存方案
export const savedPortalsAdminRouter = Router();

savedPortalsAdminRouter.get('/all', (_req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(_req.query.limit) || 50));
    const offset = Math.max(0, Number(_req.query.offset) || 0);
    const keyword = String(_req.query.keyword || '').trim();

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) {
      where += ' AND (sp.name LIKE ? OR sp.project_id LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM saved_portals sp ${where}`);
    if (params.length > 0) countStmt.bind(params);
    countStmt.step();
    const total = (countStmt.getAsObject() as any).total;
    countStmt.free();

    const stmt = db.prepare(`SELECT sp.id, sp.user_id, sp.project_id, sp.name, sp.template_type, sp.status,
      sp.curated_case_count, sp.published_at, sp.created_at, sp.updated_at,
      sp.project_snapshot,
      u.display_name
      FROM saved_portals sp
      LEFT JOIN users u ON sp.user_id = u.id
      ${where}
      ORDER BY sp.updated_at DESC LIMIT ? OFFSET ?`);
    stmt.bind([...params, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      // 从 project_snapshot 提取行业
      let industry = '';
      try {
        const snap = JSON.parse(row.project_snapshot || '{}');
        industry = snap?.portalProfile?.customerIndustry || '';
      } catch {}
      rows.push({
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        name: row.name,
        templateType: row.template_type,
        status: row.status,
        curatedCaseCount: row.curated_case_count || 0,
        publishedAt: row.published_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        displayName: row.display_name || '',
        industry,
      });
    }
    stmt.free();
    res.json({ total, items: rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

savedPortalsAdminRouter.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM saved_portals WHERE id = ?');
    stmt.bind([req.params.id]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

function parseJsonField(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : fallback;
  } catch {
    return fallback;
  }
}

function mapSavedPortalRow(row: any): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    conversationId: row.conversation_id || '',
    name: row.name,
    templateType: row.template_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    curatedCaseCount: row.curated_case_count || 0,
    publishedAt: row.published_at ?? null,
    ...(row.colors !== undefined ? { colors: parseJsonField(row.colors) } : {}),
    ...(row.workspace !== undefined ? { workspace: parseJsonField(row.workspace) } : {}),
    ...(row.portal_plan !== undefined ? { portalPlan: parseJsonField(row.portal_plan) } : {}),
    ...(row.project_snapshot !== undefined ? { projectSnapshot: parseJsonField(row.project_snapshot) } : {}),
    ...(row.conversation_snapshot !== undefined ? { conversationSnapshot: parseJsonField(row.conversation_snapshot) } : {}),
  };
}

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

    const stmt = db.prepare('SELECT id, user_id, project_id, conversation_id, name, template_type, status, curated_case_count, published_at, created_at, updated_at FROM saved_portals WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    stmt.bind([userId, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ total, items: rows.map(mapSavedPortalRow) });
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
    }
    stmt.free();
    if (!row) return res.status(404).json({ error: '门户不存在' });
    res.json(mapSavedPortalRow(row));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 保存门户
savedPortalsRouter.post('/', (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, templateType, colors, workspace, portalPlan, projectSnapshot, conversationSnapshot, projectId, conversationId, status } = req.body;
    const id = `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`INSERT INTO saved_portals (id, user_id, project_id, conversation_id, name, template_type, colors, workspace, portal_plan, project_snapshot, conversation_snapshot, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.bind([
      id, userId,
      String(projectId || ''),
      String(conversationId || ''),
      String(name || '未命名门户'),
      String(templateType || 'light-ui'),
      JSON.stringify(colors || {}),
      JSON.stringify(workspace || {}),
      JSON.stringify(portalPlan || {}),
      JSON.stringify(projectSnapshot || {}),
      JSON.stringify(conversationSnapshot || {}),
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
    const { name, templateType, colors, workspace, portalPlan, projectSnapshot, conversationSnapshot, conversationId, status } = req.body;

    const existing = db.prepare('SELECT id FROM saved_portals WHERE id = ? AND user_id = ?');
    existing.bind([req.params.id, userId]);
    const found = existing.step();
    existing.free();
    if (!found) return res.status(404).json({ error: '门户不存在' });

    const stmt = db.prepare(`UPDATE saved_portals SET
      name = COALESCE(?, name),
      template_type = COALESCE(?, template_type),
      conversation_id = COALESCE(?, conversation_id),
      colors = COALESCE(?, colors),
      workspace = COALESCE(?, workspace),
      portal_plan = COALESCE(?, portal_plan),
      project_snapshot = COALESCE(?, project_snapshot),
      conversation_snapshot = COALESCE(?, conversation_snapshot),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ? AND user_id = ?`);
    stmt.bind([
      name ?? null,
      templateType ?? null,
      conversationId ?? null,
      colors !== undefined ? JSON.stringify(colors) : null,
      workspace !== undefined ? JSON.stringify(workspace) : null,
      portalPlan !== undefined ? JSON.stringify(portalPlan) : null,
      projectSnapshot !== undefined ? JSON.stringify(projectSnapshot) : null,
      conversationSnapshot !== undefined ? JSON.stringify(conversationSnapshot) : null,
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

// 发布门户（生成只读 snapshot）
savedPortalsRouter.post('/:id/publish', (req, res) => {
  try {
    const userId = (req as any).userId;
    const now = Math.floor(Date.now() / 1000);

    const existing = db.prepare('SELECT id, colors, workspace, portal_plan, project_snapshot, template_type FROM saved_portals WHERE id = ? AND user_id = ?');
    existing.bind([req.params.id, userId]);
    if (!existing.step()) {
      existing.free();
      return res.status(404).json({ error: '门户不存在' });
    }
    const row = existing.getAsObject() as any;
    existing.free();

    const projectSnapshot = parseJsonField(row.project_snapshot);
    const snapshot = JSON.stringify({
      ...projectSnapshot,
      templateType: projectSnapshot.templateType || row.template_type || 'light-ui',
      colors: projectSnapshot.colors || parseJsonField(row.colors),
      workspace: projectSnapshot.workspace || parseJsonField(row.workspace),
      portalPlan: projectSnapshot.portalPlan || parseJsonField(row.portal_plan),
      projectSnapshot,
      publishedAt: now,
    });

    const stmt = db.prepare('UPDATE saved_portals SET published_snapshot = ?, published_at = ?, status = \'published\', updated_at = ? WHERE id = ? AND user_id = ?');
    stmt.bind([snapshot, now, now, req.params.id, userId]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true, publishedAt: now });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取发布的只读 snapshot（公开，不需要认证）
savedPortalsRouter.get('/published/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT published_snapshot, template_type, name FROM saved_portals WHERE id = ? AND published_snapshot IS NOT NULL AND published_snapshot != \'\'');
    stmt.bind([req.params.id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: '发布内容不存在' });
    }
    const row = stmt.getAsObject() as any;
    stmt.free();

    let snapshot: any = {};
    try { snapshot = JSON.parse(row.published_snapshot); } catch {}

    res.json({
      name: row.name || '未命名门户',
      templateType: snapshot.templateType || row.template_type || 'light-ui',
      colors: snapshot.colors || {},
      workspace: snapshot.workspace || {},
      portalPlan: snapshot.portalPlan || {},
      projectSnapshot: snapshot.projectSnapshot || snapshot,
      logoUrl: snapshot.logoUrl,
      logoHeight: snapshot.logoHeight,
      logoMaxWidth: snapshot.logoMaxWidth,
      publishedAt: snapshot.publishedAt,
    });
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
