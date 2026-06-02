import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

/**
 * Phase B1 测试: 验证卡片库后台管理的 DB schema、API 合约、seed 数据幂等。
 */
describe('Phase B1: card library backend management', () => {
  // --- 1. 数据库 schema ---
  describe('database schema', () => {
    const dbSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/db.ts'),
      'utf8',
    );

    test('card_templates table has tag columns', () => {
      expect(dbSource).toContain('industry_tags TEXT NOT NULL DEFAULT');
      expect(dbSource).toContain('capability_tags TEXT NOT NULL DEFAULT');
      expect(dbSource).toContain('scenario_tags TEXT NOT NULL DEFAULT');
    });

    test('card_template_fields table exists', () => {
      expect(dbSource).toContain('CREATE TABLE IF NOT EXISTS card_template_fields');
      expect(dbSource).toContain('field_key TEXT NOT NULL');
      expect(dbSource).toContain('ai_writable INTEGER NOT NULL DEFAULT');
      expect(dbSource).toContain('item_schema TEXT NOT NULL DEFAULT');
    });

    test('tag column migration for existing DBs', () => {
      // Should have ALTER TABLE for backward compat
      expect(dbSource).toContain("ALTER TABLE card_templates ADD COLUMN industry_tags");
      expect(dbSource).toContain("ALTER TABLE card_templates ADD COLUMN capability_tags");
      expect(dbSource).toContain("ALTER TABLE card_templates ADD COLUMN scenario_tags");
    });
  });

  // --- 2. Seed 数据幂等 ---
  describe('seed data idempotency', () => {
    const dbSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/db.ts'),
      'utf8',
    );

    test('card templates use INSERT OR IGNORE', () => {
      expect(dbSource).toContain('INSERT OR IGNORE INTO card_templates');
    });

    test('card template fields use INSERT OR IGNORE', () => {
      expect(dbSource).toContain('INSERT OR IGNORE INTO card_template_fields');
    });

    test('four templates are seeded', () => {
      expect(dbSource).toContain("'tpl-message-todo'");
      expect(dbSource).toContain("'tpl-news-carousel'");
      expect(dbSource).toContain("'tpl-my-schedule'");
      expect(dbSource).toContain("'tpl-quick-access'");
    });
  });

  // --- 3. API 路由扩展 ---
  describe('API routes include tags and fields', () => {
    const routeSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/routes/card-templates.ts'),
      'utf8',
    );

    test('GET / returns industryTags, capabilityTags, scenarioTags', () => {
      expect(routeSource).toContain('industry_tags');
      expect(routeSource).toContain('capability_tags');
      expect(routeSource).toContain('scenario_tags');
      expect(routeSource).toContain('industryTags');
      expect(routeSource).toContain('capabilityTags');
      expect(routeSource).toContain('scenarioTags');
    });

    test('GET / returns fields from card_template_fields', () => {
      expect(routeSource).toContain('card_template_fields');
      expect(routeSource).toContain('aiWritable');
      expect(routeSource).toContain('ai_writable');
    });

    test('POST / accepts tags and fields', () => {
      expect(routeSource).toContain('body.industryTags');
      expect(routeSource).toContain('body.capabilityTags');
      expect(routeSource).toContain('body.scenarioTags');
      expect(routeSource).toContain('insertFields');
    });

    test('PUT / replaces fields when provided', () => {
      const putIdx = routeSource.indexOf("router.put('/:id'");
      const putBlock = routeSource.substring(putIdx, putIdx + 2000);
      expect(putBlock).toContain('DELETE FROM card_template_fields');
      expect(putBlock).toContain('insertFields');
    });

    test('PATCH /:id/toggle endpoint exists', () => {
      expect(routeSource).toContain("router.patch('/:id/toggle'");
    });
  });

  // --- 4. 前端 API 扩展 ---
  describe('frontend API client extended', () => {
    const apiSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/api/card-templates.ts'),
      'utf8',
    );

    test('CardTemplateListItem includes tags and fields', () => {
      expect(apiSource).toContain('industryTags?: string[]');
      expect(apiSource).toContain('capabilityTags?: string[]');
      expect(apiSource).toContain('scenarioTags?: string[]');
      expect(apiSource).toContain('fields?: CardFieldSchemaItem[]');
    });

    test('CardFieldSchemaItem has aiWritable', () => {
      expect(apiSource).toContain('aiWritable: boolean');
      expect(apiSource).toContain('itemSchema?: Record<string, string>');
    });

    test('has toggleCardTemplate function', () => {
      expect(apiSource).toContain('toggleCardTemplate');
    });
  });

  // --- 5. Admin UI 扩展 ---
  describe('admin UI has tag and field editing', () => {
    const adminSource = fs.readFileSync(
      path.join(projectRoot, 'server/admin/index.html'),
      'utf8',
    );

    test('has tag input fields', () => {
      expect(adminSource).toContain('cardTemplateIndustryTags');
      expect(adminSource).toContain('cardTemplateCapabilityTags');
      expect(adminSource).toContain('cardTemplateScenarioTags');
    });

    test('has field schema editor', () => {
      expect(adminSource).toContain('cardTemplateFieldEditor');
      expect(adminSource).toContain('addFieldRow');
      expect(adminSource).toContain('collectFields');
      expect(adminSource).toContain('field-ai-writable');
    });

    test('has toggle enable/disable button', () => {
      expect(adminSource).toContain('toggleCardTemplateEnable');
    });

    test('save function sends tags and fields', () => {
      const saveIdx = adminSource.indexOf('async function saveCardTemplateEditor()');
      const saveBlock = adminSource.substring(saveIdx, saveIdx + 3000);
      expect(saveBlock).toContain('industryTags:');
      expect(saveBlock).toContain('capabilityTags:');
      expect(saveBlock).toContain('scenarioTags:');
      expect(saveBlock).toContain('fields: collectFields()');
    });
  });
});
