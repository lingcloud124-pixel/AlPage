import { Router } from 'express';
import { db, saveDb } from '../db.js';

export const industryCasesRouter = Router();
export const industryCasesAdminRouter = Router();

// ─── 普通用户路由（全部按 user_id 隔离） ───

// 列出当前用户的案例
industryCasesRouter.get('/', (req, res) => {
  try {
    const userId = (req as any).userId;
    const industry = String(req.query.industry || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const referenceOnly = req.query.referenceOnly === 'true';

    let where = 'WHERE user_id = ?';
    const params: any[] = [userId];
    if (industry) {
      where += ' AND industry = ?';
      params.push(industry);
    }
    if (keyword) {
      where += ' AND (customer_name LIKE ? OR keywords LIKE ? OR summary LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (referenceOnly) {
      where += ' AND reference_enabled = 1';
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM industry_cases ${where}`);
    if (params.length > 0) countStmt.bind(params);
    countStmt.step();
    const total = (countStmt.getAsObject() as any).total;
    countStmt.free();

    const stmt = db.prepare(`SELECT id, user_id, customer_name, industry, keywords, project_id, summary, highlights, cover_image_url, display_enabled, reference_enabled, anonymized_requirement, source_portal_id, case_title, created_at, updated_at FROM industry_cases ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`);
    stmt.bind([...params, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      try { row.keywords = JSON.parse(row.keywords); } catch { row.keywords = []; }
      try { row.highlights = JSON.parse(row.highlights); } catch { row.highlights = []; }
      row.displayEnabled = Boolean(row.display_enabled);
      row.referenceEnabled = Boolean(row.reference_enabled);
      row.sourcePortalId = row.source_portal_id || '';
      row.caseTitle = row.case_title || '';
      rows.push(row);
    }
    stmt.free();
    res.json({ total, items: rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取当前用户单个案例（含 portal_plan）
industryCasesRouter.get('/:id', (req, res) => {
  try {
    const userId = (req as any).userId;
    const stmt = db.prepare('SELECT * FROM industry_cases WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, userId]);
    let row: any = null;
    if (stmt.step()) {
      row = stmt.getAsObject() as any;
      try { row.keywords = JSON.parse(row.keywords); } catch { row.keywords = []; }
      try { row.portal_plan = JSON.parse(row.portal_plan); } catch { row.portal_plan = {}; }
      try { row.highlights = JSON.parse(row.highlights); } catch { row.highlights = []; }
      row.displayEnabled = Boolean(row.display_enabled);
      row.referenceEnabled = Boolean(row.reference_enabled);
      row.sourcePortalId = row.source_portal_id || '';
      row.sourceSnapshot = (() => { try { return JSON.parse(row.source_snapshot || '{}'); } catch { return {}; } })();
      row.caseTitle = row.case_title || '';
    }
    stmt.free();
    if (!row) return res.status(404).json({ error: '案例不存在' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建案例（普通用户）
industryCasesRouter.post('/', (req, res) => {
  try {
    const userId = (req as any).userId;
    const { customerName, industry, keywords, portalPlan, projectId, summary, highlights, coverImageUrl, displayEnabled, referenceEnabled, anonymizedRequirement } = req.body;
    const id = `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`INSERT INTO industry_cases (id, user_id, customer_name, industry, keywords, portal_plan, project_id, summary, highlights, cover_image_url, display_enabled, reference_enabled, anonymized_requirement, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.bind([
      id, userId,
      String(customerName || ''),
      String(industry || ''),
      JSON.stringify(keywords || []),
      JSON.stringify(portalPlan || {}),
      String(projectId || ''),
      String(summary || ''),
      JSON.stringify(highlights || []),
      String(coverImageUrl || ''),
      displayEnabled ? 1 : 0,
      referenceEnabled === false ? 0 : 1,
      String(anonymizedRequirement || ''),
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

// 删除案例（普通用户，校验归属）
industryCasesRouter.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM industry_cases WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, (req as any).userId]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 管理员路由（跨用户，挂在 adminAuth 下） ───

// 管理员列出所有案例
industryCasesAdminRouter.get('/', (req, res) => {
  try {
    const industry = String(req.query.industry || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (industry) {
      where += ' AND industry = ?';
      params.push(industry);
    }
    if (keyword) {
      where += ' AND (customer_name LIKE ? OR keywords LIKE ? OR summary LIKE ? OR case_title LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM industry_cases ${where}`);
    if (params.length > 0) countStmt.bind(params);
    countStmt.step();
    const total = (countStmt.getAsObject() as any).total;
    countStmt.free();

    const stmt = db.prepare(`SELECT id, user_id, customer_name, industry, keywords, project_id, summary, highlights, cover_image_url, display_enabled, reference_enabled, source_portal_id, case_title, created_at, updated_at FROM industry_cases ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`);
    stmt.bind([...params, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      try { row.keywords = JSON.parse(row.keywords); } catch { row.keywords = []; }
      try { row.highlights = JSON.parse(row.highlights); } catch { row.highlights = []; }
      row.displayEnabled = Boolean(row.display_enabled);
      row.referenceEnabled = Boolean(row.reference_enabled);
      row.sourcePortalId = row.source_portal_id || '';
      row.caseTitle = row.case_title || '';
      rows.push(row);
    }
    stmt.free();
    res.json({ total, items: rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 管理员从已保存方案沉淀为案例（不校验 portal 归属当前用户）
industryCasesAdminRouter.post('/from-saved-portal/:portalId', (req, res) => {
  try {
    const { portalId } = req.params;

    // 读取原保存方案（管理员可操作任意用户的方案）
    const spStmt = db.prepare('SELECT * FROM saved_portals WHERE id = ?');
    spStmt.bind([portalId]);
    let portal: any = null;
    if (spStmt.step()) {
      portal = spStmt.getAsObject() as any;
    }
    spStmt.free();

    if (!portal) return res.status(404).json({ error: '保存方案不存在' });

    // 深拷贝快照
    let snapshotBase: any = {};
    try { snapshotBase = JSON.parse(portal.project_snapshot || '{}'); } catch {}
    const sourceSnapshot = JSON.parse(JSON.stringify({
      ...snapshotBase,
      colors: (() => { try { return JSON.parse(portal.colors || '{}'); } catch { return {}; } })(),
      workspace: (() => { try { return JSON.parse(portal.workspace || '{}'); } catch { return {}; } })(),
      portalPlan: (() => { try { return JSON.parse(portal.portal_plan || '{}'); } catch { return {}; } })(),
      templateType: portal.template_type || 'light-ui',
      name: portal.name || '',
    }));

    // 提取行业
    const industry = req.body.industry || snapshotBase?.portalProfile?.customerIndustry || '';

    const id = `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const caseTitle = req.body.caseTitle || portal.name || '';
    const keywords = req.body.keywords || [];
    const summary = req.body.summary || '';

    const stmt = db.prepare(`INSERT INTO industry_cases
      (id, user_id, customer_name, industry, keywords, portal_plan, project_id, summary, highlights,
       cover_image_url, display_enabled, reference_enabled, anonymized_requirement,
       source_portal_id, source_snapshot, case_title, source_project_id, source_saved_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.bind([
      id, portal.user_id, // 案例归属原方案所属用户
      '', // customerName 留空（匿名化）
      String(industry),
      JSON.stringify(keywords),
      JSON.stringify((() => { try { return JSON.parse(portal.portal_plan || '{}'); } catch { return {}; } })()),
      String(portal.project_id || ''),
      String(summary),
      JSON.stringify(keywords),
      '', // cover_image_url
      req.body.displayEnabled ? 1 : 0,
      req.body.referenceEnabled === false ? 0 : 1,
      '', // anonymized_requirement
      String(portalId),
      JSON.stringify(sourceSnapshot),
      String(caseTitle),
      String(portal.project_id || ''),
      portal.updated_at || now,
      now, now,
    ]);
    stmt.step();
    stmt.free();

    // 递增原保存方案的沉淀计数
    const countStmt = db.prepare('SELECT curated_case_count FROM saved_portals WHERE id = ?');
    countStmt.bind([portalId]);
    let curCount = 0;
    if (countStmt.step()) {
      curCount = (countStmt.getAsObject() as any).curated_case_count || 0;
    }
    countStmt.free();
    const updateStmt = db.prepare('UPDATE saved_portals SET curated_case_count = ? WHERE id = ?');
    updateStmt.bind([curCount + 1, portalId]);
    updateStmt.step();
    updateStmt.free();

    saveDb();
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 管理员更新案例元数据（不校验 user_id）
industryCasesAdminRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const checkStmt = db.prepare('SELECT id FROM industry_cases WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) return res.status(404).json({ error: '案例不存在' });

    const { caseTitle, keywords, summary, referenceEnabled, displayEnabled } = req.body;
    const stmt = db.prepare(`UPDATE industry_cases SET
      case_title = COALESCE(?, case_title),
      keywords = COALESCE(?, keywords),
      summary = COALESCE(?, summary),
      reference_enabled = COALESCE(?, reference_enabled),
      display_enabled = COALESCE(?, display_enabled),
      updated_at = ?
      WHERE id = ?`);
    const now = Math.floor(Date.now() / 1000);
    stmt.bind([
      caseTitle ?? null,
      keywords != null ? JSON.stringify(keywords) : null,
      summary ?? null,
      referenceEnabled != null ? (referenceEnabled ? 1 : 0) : null,
      displayEnabled != null ? (displayEnabled ? 1 : 0) : null,
      now, id,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 管理员删除案例（不校验 user_id）
industryCasesAdminRouter.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM industry_cases WHERE id = ?');
    stmt.bind([req.params.id]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
