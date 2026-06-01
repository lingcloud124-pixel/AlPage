import { Router } from 'express';
import { db, saveDb } from '../db.js';

export const industryCasesRouter = Router();

// 列出案例（支持行业+关键词过滤）
industryCasesRouter.get('/', (req, res) => {
  try {
    const industry = String(req.query.industry || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const referenceOnly = req.query.referenceOnly === 'true';

    let where = 'WHERE 1=1';
    const params: any[] = [];
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

    const stmt = db.prepare(`SELECT id, user_id, customer_name, industry, keywords, project_id, summary, highlights, cover_image_url, display_enabled, reference_enabled, anonymized_requirement, created_at, updated_at FROM industry_cases ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`);
    stmt.bind([...params, limit, offset]);
    const rows: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      try { row.keywords = JSON.parse(row.keywords); } catch { row.keywords = []; }
      try { row.highlights = JSON.parse(row.highlights); } catch { row.highlights = []; }
      row.displayEnabled = Boolean(row.display_enabled);
      row.referenceEnabled = Boolean(row.reference_enabled);
      rows.push(row);
    }
    stmt.free();
    res.json({ total, items: rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个案例（含 portal_plan）
industryCasesRouter.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM industry_cases WHERE id = ?');
    stmt.bind([req.params.id]);
    let row: any = null;
    if (stmt.step()) {
      row = stmt.getAsObject() as any;
      try { row.keywords = JSON.parse(row.keywords); } catch { row.keywords = []; }
      try { row.portal_plan = JSON.parse(row.portal_plan); } catch { row.portal_plan = {}; }
      try { row.highlights = JSON.parse(row.highlights); } catch { row.highlights = []; }
      row.displayEnabled = Boolean(row.display_enabled);
      row.referenceEnabled = Boolean(row.reference_enabled);
    }
    stmt.free();
    if (!row) return res.status(404).json({ error: '案例不存在' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建案例
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

// 删除案例
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
