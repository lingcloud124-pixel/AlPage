import { randomUUID } from 'node:crypto';
import { Router } from 'express';

import { db, saveDb } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.type,
        t.description,
        t.enabled,
        t.configurable,
        t.default_w,
        t.default_h,
        t.min_w,
        t.min_h,
        t.max_w,
        t.max_h,
        t.default_props,
        t.layout_rules,
        t.preview_image_url,
        c.name AS category_name
      FROM card_templates t
      LEFT JOIN card_template_categories c ON c.id = t.category_id
      ORDER BY t.updated_at DESC
    `);
    const items: Array<Record<string, unknown>> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      items.push({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        enabled: Boolean(row.enabled),
        configurable: Boolean(row.configurable),
        defaultW: row.default_w,
        defaultH: row.default_h,
        minW: row.min_w,
        minH: row.min_h,
        maxW: row.max_w,
        maxH: row.max_h,
        category: row.category_name ?? '',
        defaultProps: JSON.parse(String(row.default_props ?? '{}')),
        layoutRules: JSON.parse(String(row.layout_rules ?? '{}')),
        previewImageUrl: row.preview_image_url ?? '',
      });
    }
    stmt.free();
    res.json(items);
  } catch (error) {
    logger.error('List card templates error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/categories', (_req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, sort_order FROM card_template_categories ORDER BY sort_order ASC, updated_at DESC');
    const items: Array<Record<string, unknown>> = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as Record<string, unknown>);
    }
    stmt.free();
    res.json(items);
  } catch (error) {
    logger.error('List card template categories error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM card_templates WHERE id = ?');
    stmt.bind([req.params.id]);
    if (!stmt.step()) {
      stmt.free();
      res.status(404).json({ error: 'Card template not found' });
      return;
    }
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    res.json(row);
  } catch (error) {
    logger.error('Get card template error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const id = randomUUID();
    const body = req.body ?? {};
    const stmt = db.prepare(`
      INSERT INTO card_templates (
        id, name, type, category_id, description, enabled, configurable,
        default_w, default_h, min_w, min_h, max_w, max_h,
        default_props, layout_rules, preview_image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([
      id,
      body.name ?? '未命名卡片',
      body.type ?? 'text',
      body.categoryId ?? '',
      body.description ?? '',
      body.enabled === false ? 0 : 1,
      body.configurable === false ? 0 : 1,
      body.defaultW ?? 2,
      body.defaultH ?? 12,
      body.minW ?? null,
      body.minH ?? null,
      body.maxW ?? null,
      body.maxH ?? null,
      JSON.stringify(body.defaultProps ?? {}),
      JSON.stringify(body.layoutRules ?? {}),
      body.previewImageUrl ?? '',
      now,
      now,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.status(201).json({ id });
  } catch (error) {
    logger.error('Create card template error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const body = req.body ?? {};
    const stmt = db.prepare(`
      UPDATE card_templates SET
        name = ?,
        type = ?,
        category_id = ?,
        description = ?,
        enabled = ?,
        configurable = ?,
        default_w = ?,
        default_h = ?,
        min_w = ?,
        min_h = ?,
        max_w = ?,
        max_h = ?,
        default_props = ?,
        layout_rules = ?,
        preview_image_url = ?,
        updated_at = ?
      WHERE id = ?
    `);
    stmt.bind([
      body.name ?? '未命名卡片',
      body.type ?? 'text',
      body.categoryId ?? '',
      body.description ?? '',
      body.enabled === false ? 0 : 1,
      body.configurable === false ? 0 : 1,
      body.defaultW ?? 2,
      body.defaultH ?? 12,
      body.minW ?? null,
      body.minH ?? null,
      body.maxW ?? null,
      body.maxH ?? null,
      JSON.stringify(body.defaultProps ?? {}),
      JSON.stringify(body.layoutRules ?? {}),
      body.previewImageUrl ?? '',
      now,
      req.params.id,
    ]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ id: req.params.id });
  } catch (error) {
    logger.error('Update card template error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM card_templates WHERE id = ?');
    stmt.bind([req.params.id]);
    stmt.step();
    stmt.free();
    saveDb();
    res.status(204).end();
  } catch (error) {
    logger.error('Delete card template error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as cardTemplatesRouter };
