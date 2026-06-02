import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

/**
 * 阶段 A 测试: 验证新增类型定义和历史数据兼容。
 */
describe('Phase A: new portal types', () => {
  const typesSource = fs.readFileSync(
    path.join(projectRoot, 'web/src/types.ts'),
    'utf8',
  );
  const planSource = fs.readFileSync(
    path.join(projectRoot, 'web/src/portal-plan.ts'),
    'utf8',
  );

  // --- 1. 新增类型定义存在 ---
  describe('new type definitions exist', () => {
    test('RequirementSummary type is defined with generation-oriented fields', () => {
      expect(typesSource).toContain('export interface RequirementSummary');
      expect(typesSource).toContain('portalGoal: string');
      expect(typesSource).toContain('requestedCapabilities: string[]');
      expect(typesSource).toContain('assumptions: string[]');
      expect(typesSource).toContain('coverableCards');
      expect(typesSource).toContain('uncoveredNeeds');
    });

    test('RequirementSummary does not duplicate PortalSummary fields', () => {
      const rsStart = typesSource.indexOf('export interface RequirementSummary');
      const rsEnd = typesSource.indexOf('}', rsStart);
      const rsBlock = typesSource.substring(rsStart, rsEnd);
      // RequirementSummary should NOT have customerName, customerIndustry etc.
      // Those belong to PortalSummary / PortalCustomerProfile
      expect(rsBlock).not.toContain('customerName:');
      expect(rsBlock).not.toContain('customerIndustry:');
    });

    test('CardFieldSchema type is defined with aiWritable constraint', () => {
      expect(typesSource).toContain('export interface CardFieldSchema');
      expect(typesSource).toContain("type: 'text' | 'number' | 'image' | 'link' | 'list' | 'select' | 'boolean'");
      expect(typesSource).toContain('aiWritable: boolean');
      expect(typesSource).toContain('options?: string[]');
      expect(typesSource).toContain('itemSchema?: Record<string, string>');
    });

    test('CardTemplate type is defined with tags and schema', () => {
      expect(typesSource).toContain('export interface CardTemplate');
      expect(typesSource).toContain('industryTags: string[]');
      expect(typesSource).toContain('capabilityTags: string[]');
      expect(typesSource).toContain('scenarioTags: string[]');
      expect(typesSource).toContain('fields: CardFieldSchema[]');
      expect(typesSource).toContain('enabled: boolean');
    });

    test('UncoveredNeed type is defined', () => {
      expect(typesSource).toContain('export interface UncoveredNeed');
      expect(typesSource).toContain('requestedCapability: string');
      expect(typesSource).toContain('suggestedCardType?: string');
    });

    test('ThemeConfig type is defined without logoEditable field', () => {
      expect(typesSource).toContain('export interface ThemeConfig');
      expect(typesSource).toContain('logoUrl?: string');
      expect(typesSource).toContain('backgroundMode');
      // Logo 可编辑是产品规则，不应有 logoEditable 字段
      const tcStart = typesSource.indexOf('export interface ThemeConfig');
      const tcEnd = typesSource.indexOf('}', tcStart);
      const tcBlock = typesSource.substring(tcStart, tcEnd);
      expect(tcBlock).not.toContain('logoEditable');
    });
  });

  // --- 2. PortalPlan 扩展了新字段 ---
  describe('PortalPlan extended with new fields', () => {
    test('PortalPlan has uncoveredNeeds field', () => {
      expect(typesSource).toContain('uncoveredNeeds?: UncoveredNeed[]');
    });

    test('PortalPlan has requirementSummary field', () => {
      expect(typesSource).toContain('requirementSummary?: RequirementSummary');
    });
  });

  // --- 3. 历史数据兼容 ---
  describe('backward compatibility for existing data', () => {
    test('createPortalPlanFromProject defaults uncoveredNeeds from existing plan or empty', () => {
      // Should read from existing plan or default to empty
      expect(planSource).toContain("project.portalPlan?.uncoveredNeeds ?? []");
    });

    test('createPortalPlanFromProject preserves existing requirementSummary', () => {
      expect(planSource).toContain('project.portalPlan?.requirementSummary');
    });
  });
});
