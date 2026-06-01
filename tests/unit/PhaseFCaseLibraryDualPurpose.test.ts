import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  anonymizeRequirementSummary,
  buildCaseReferencePrompt,
} from '../../web/src/portal-agent';
import type { RequirementSummary } from '../../web/src/types';

const projectRoot = process.cwd();

describe('Phase F: case library dual-purpose', () => {
  // --- anonymizeRequirementSummary ---
  describe('anonymizeRequirementSummary', () => {
    const summary: RequirementSummary = {
      portalGoal: '为某某科技有限公司构建客户演示门户',
      requestedCapabilities: ['待办事项', '新闻公告'],
      stylePreferences: ['科技蓝白'],
      assumptions: ['客户名称已确认', '行业默认配置：基于科技行业'],
      coverableCards: ['待办事项'],
      uncoveredNeeds: [{
        id: '1',
        label: '数据分析',
        reason: '当前卡片库中没有直接匹配「数据分析」的卡片',
        requestedCapability: '数据分析',
      }],
    };

    test('removes company names', () => {
      const result = anonymizeRequirementSummary(summary);
      expect(result.portalGoal).not.toContain('某某科技');
      expect(result.portalGoal).toContain('某企业');
    });

    test('preserves capabilities', () => {
      const result = anonymizeRequirementSummary(summary);
      expect(result.requestedCapabilities).toEqual(summary.requestedCapabilities);
    });

    test('preserves style preferences', () => {
      const result = anonymizeRequirementSummary(summary);
      expect(result.stylePreferences).toEqual(summary.stylePreferences);
    });

    test('filters customer-name assumptions', () => {
      const result = anonymizeRequirementSummary(summary);
      expect(result.assumptions).not.toContain(expect.stringContaining('客户名称'));
      expect(result.assumptions).toContain('行业默认配置：基于科技行业');
    });

    test('anonymizes uncovered need reasons', () => {
      const result = anonymizeRequirementSummary(summary);
      expect(result.uncoveredNeeds?.[0]?.reason).toContain('该能力');
      expect(result.uncoveredNeeds?.[0]?.reason).not.toContain('数据分析');
    });
  });

  // --- buildCaseReferencePrompt ---
  describe('buildCaseReferencePrompt', () => {
    test('returns empty string for empty cases', () => {
      expect(buildCaseReferencePrompt([])).toBe('');
    });

    test('builds reference prompt from cases', () => {
      const result = buildCaseReferencePrompt([
        { industry: '能源', summary: '能源行业门户方案', anonymizedRequirement: '{"portalGoal":"..."}' },
      ]);
      expect(result).toContain('同行业案例参考');
      expect(result).toContain('能源');
      expect(result).toContain('仅供参考风格和布局方向');
    });

    test('truncates long anonymized requirement', () => {
      const longText = 'a'.repeat(200);
      const result = buildCaseReferencePrompt([
        { industry: '科技', summary: '', anonymizedRequirement: longText },
      ]);
      expect(result).toContain('需求:');
      expect(result!.length).toBeLessThan(longText.length + 200);
    });
  });

  // --- DB schema ---
  describe('database has dual-purpose columns', () => {
    const dbSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/db.ts'),
      'utf8',
    );

    test('has display_enabled column migration', () => {
      expect(dbSource).toContain('display_enabled');
    });

    test('has reference_enabled column migration', () => {
      expect(dbSource).toContain('reference_enabled');
    });

    test('has summary column migration', () => {
      expect(dbSource).toContain('ALTER TABLE industry_cases ADD COLUMN summary');
    });

    test('has highlights column migration', () => {
      expect(dbSource).toContain('highlights TEXT NOT NULL DEFAULT');
    });

    test('has anonymized_requirement column migration', () => {
      expect(dbSource).toContain('anonymized_requirement');
    });
  });

  // --- Server routes ---
  describe('server routes handle new fields', () => {
    const routeSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/routes/industry-cases.ts'),
      'utf8',
    );

    test('GET returns new fields', () => {
      expect(routeSource).toContain('summary');
      expect(routeSource).toContain('highlights');
      expect(routeSource).toContain('cover_image_url');
      expect(routeSource).toContain('display_enabled');
      expect(routeSource).toContain('reference_enabled');
    });

    test('POST accepts new fields', () => {
      expect(routeSource).toContain('displayEnabled');
      expect(routeSource).toContain('referenceEnabled');
      expect(routeSource).toContain('anonymizedRequirement');
    });

    test('supports referenceOnly filter', () => {
      expect(routeSource).toContain('referenceOnly');
      expect(routeSource).toContain("reference_enabled = 1");
    });
  });

  // --- Frontend API ---
  describe('frontend API extended', () => {
    const apiSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/api/industry-cases.ts'),
      'utf8',
    );

    test('has dual-purpose fields in type', () => {
      expect(apiSource).toContain('displayEnabled');
      expect(apiSource).toContain('referenceEnabled');
      expect(apiSource).toContain('anonymizedRequirement');
    });

    test('CreateIndustryCaseData has new fields', () => {
      expect(apiSource).toContain('summary');
      expect(apiSource).toContain('highlights');
      expect(apiSource).toContain('coverImageUrl');
    });

    test('listIndustryCases supports referenceOnly', () => {
      expect(apiSource).toContain('referenceOnly');
    });
  });

  // --- HTML has save case button ---
  describe('HTML has save case button', () => {
    const html = fs.readFileSync(
      path.join(projectRoot, 'web/index.html'),
      'utf8',
    );

    test('has resultSaveCaseBtn', () => {
      expect(html).toContain('resultSaveCaseBtn');
      expect(html).toContain('录入资料库');
    });
  });
});
