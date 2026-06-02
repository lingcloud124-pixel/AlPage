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
        t.industry_tags,
        t.capability_tags,
        t.scenario_tags,
        c.name AS category_name
      FROM card_templates t
      LEFT JOIN card_template_categories c ON c.id = t.category_id
      ORDER BY t.updated_at DESC
    `);
    const items: Array<Record<string, unknown>> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      const templateId = String(row.id);

      // Fetch fields for this template
      const fieldsStmt = db.prepare('SELECT field_key, label, type, ai_writable, required, options, item_schema, sort_order FROM card_template_fields WHERE template_id = ? ORDER BY sort_order ASC');
      fieldsStmt.bind([templateId]);
      const fields: Array<Record<string, unknown>> = [];
      while (fieldsStmt.step()) {
        const fRow = fieldsStmt.getAsObject() as Record<string, unknown>;
        fields.push({
          key: fRow.field_key,
          label: fRow.label,
          type: fRow.type,
          aiWritable: Boolean(fRow.ai_writable),
          required: Boolean(fRow.required),
          options: JSON.parse(String(fRow.options ?? '[]')),
          itemSchema: JSON.parse(String(fRow.item_schema ?? '{}')),
          sortOrder: fRow.sort_order,
        });
      }
      fieldsStmt.free();

      items.push({
        id: templateId,
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
        industryTags: JSON.parse(String(row.industry_tags ?? '[]')),
        capabilityTags: JSON.parse(String(row.capability_tags ?? '[]')),
        scenarioTags: JSON.parse(String(row.scenario_tags ?? '[]')),
        fields,
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
        default_props, layout_rules, preview_image_url,
        industry_tags, capability_tags, scenario_tags,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(body.industryTags ?? []),
      JSON.stringify(body.capabilityTags ?? []),
      JSON.stringify(body.scenarioTags ?? []),
      now,
      now,
    ]);
    stmt.step();
    stmt.free();

    // Insert fields if provided
    insertFields(id, body.fields);
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
        industry_tags = ?,
        capability_tags = ?,
        scenario_tags = ?,
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
      JSON.stringify(body.industryTags ?? []),
      JSON.stringify(body.capabilityTags ?? []),
      JSON.stringify(body.scenarioTags ?? []),
      now,
      req.params.id,
    ]);
    stmt.step();
    stmt.free();

    // Replace fields if provided
    if (Array.isArray(body.fields)) {
      const delStmt = db.prepare('DELETE FROM card_template_fields WHERE template_id = ?');
      delStmt.bind([req.params.id]);
      delStmt.step();
      delStmt.free();
      insertFields(req.params.id, body.fields);
    }
    saveDb();
    res.json({ id: req.params.id });
  } catch (error) {
    logger.error('Update card template error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function insertFields(templateId: string, fields: unknown): void {
  if (!Array.isArray(fields)) return;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i] as Record<string, unknown>;
    const fStmt = db.prepare(`
      INSERT INTO card_template_fields (template_id, field_key, label, type, ai_writable, required, options, item_schema, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    fStmt.bind([
      templateId,
      String(f.key ?? ''),
      String(f.label ?? ''),
      String(f.type ?? 'text'),
      f.aiWritable === false ? 0 : 1,
      f.required === true ? 1 : 0,
      JSON.stringify(f.options ?? []),
      JSON.stringify(f.itemSchema ?? {}),
      i,
    ]);
    fStmt.step();
    fStmt.free();
  }
}

router.patch('/:id/toggle', (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare('UPDATE card_templates SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?');
    stmt.bind([now, req.params.id]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ id: req.params.id });
  } catch (error) {
    logger.error('Toggle card template error', error);
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
