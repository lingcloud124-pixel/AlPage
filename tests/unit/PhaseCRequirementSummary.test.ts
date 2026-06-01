import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildRequirementSummary,
  buildRequirementSummaryPrompt,
} from '../../web/src/portal-agent';
import type { PortalCustomerProfile } from '../../web/src/types';
import type { CardTemplateListItem } from '../../web/src/api/card-templates';

const projectRoot = process.cwd();

const mockProfile: PortalCustomerProfile = {
  customerName: '示例公司',
  customerIndustry: '能源',
  customerFunctions: ['电力调度', '设备巡检'],
  portalPurpose: '客户演示门户',
  highlightedCards: ['待办事项', '新闻公告'],
  visualPreference: '科技蓝白，稳重企业风',
  source: ['chat'],
  completeness: 1,
  updatedAt: Date.now(),
};

const mockTemplates: CardTemplateListItem[] = [
  {
    id: 'tpl-message-todo',
    name: '待办事项',
    type: 'list',
    enabled: true,
    capabilityTags: ['待办'],
    industryTags: [],
    scenarioTags: [],
    fields: [],
  },
  {
    id: 'tpl-news-carousel',
    name: '新闻轮播',
    type: 'carousel',
    enabled: true,
    capabilityTags: ['资讯'],
    industryTags: [],
    scenarioTags: ['首页'],
    fields: [],
  },
];

describe('Phase C: requirement summary and generation confirmation', () => {
  // --- buildRequirementSummary ---
  describe('buildRequirementSummary', () => {
    test('builds portal goal from profile', () => {
      const summary = buildRequirementSummary(mockProfile);
      expect(summary.portalGoal).toContain('示例公司');
      expect(summary.portalGoal).toContain('客户演示门户');
      expect(summary.portalGoal).toContain('能源');
    });

    test('includes requested capabilities from highlighted cards and functions', () => {
      const summary = buildRequirementSummary(mockProfile);
      expect(summary.requestedCapabilities).toContain('待办事项');
      expect(summary.requestedCapabilities).toContain('电力调度');
      expect(summary.requestedCapabilities).toContain('设备巡检');
    });

    test('includes style preferences', () => {
      const summary = buildRequirementSummary(mockProfile);
      expect(summary.stylePreferences).toContain('科技蓝白，稳重企业风');
    });

    test('matches capabilities against card library for coverableCards', () => {
      const summary = buildRequirementSummary(mockProfile, mockTemplates);
      expect(summary.coverableCards).toBeDefined();
      expect(summary.coverableCards!.length).toBeGreaterThan(0);
    });

    test('identifies uncovered needs for unmatched capabilities', () => {
      const summary = buildRequirementSummary(mockProfile, mockTemplates);
      // '电力调度' and '设备巡检' should not match any template
      expect(summary.uncoveredNeeds).toBeDefined();
      expect(summary.uncoveredNeeds!.length).toBeGreaterThan(0);
    });

    test('generates assumptions', () => {
      const summary = buildRequirementSummary(mockProfile);
      expect(summary.assumptions.length).toBeGreaterThan(0);
      expect(summary.assumptions[0]).toContain('能源');
    });

    test('handles empty profile gracefully', () => {
      const emptyProfile: PortalCustomerProfile = {
        source: ['chat'],
        completeness: 0,
        updatedAt: Date.now(),
      };
      const summary = buildRequirementSummary(emptyProfile);
      expect(summary.portalGoal).toBeDefined();
      expect(summary.requestedCapabilities).toEqual([]);
      expect(summary.assumptions.length).toBeGreaterThan(0);
    });

    test('without card library, all highlighted cards are coverable', () => {
      const summary = buildRequirementSummary(mockProfile);
      expect(summary.coverableCards).toContain('待办事项');
      expect(summary.coverableCards).toContain('新闻公告');
    });
  });

  // --- buildRequirementSummaryPrompt ---
  describe('buildRequirementSummaryPrompt', () => {
    test('formats all sections', () => {
      const summary = buildRequirementSummary(mockProfile, mockTemplates);
      const prompt = buildRequirementSummaryPrompt(summary);
      expect(prompt).toContain('需求理解确认');
      expect(prompt).toContain('门户目标');
      expect(prompt).toContain('模块需求');
      expect(prompt).toContain('风格偏好');
      expect(prompt).toContain('确认');
    });

    test('includes uncovered needs section when present', () => {
      const summary = buildRequirementSummary(mockProfile, mockTemplates);
      const prompt = buildRequirementSummaryPrompt(summary);
      if (summary.uncoveredNeeds && summary.uncoveredNeeds.length > 0) {
        expect(prompt).toContain('未覆盖需求');
      }
    });

    test('includes assumptions section', () => {
      const summary = buildRequirementSummary(mockProfile);
      const prompt = buildRequirementSummaryPrompt(summary);
      expect(prompt).toContain('AI 假设');
    });
  });

  // --- Chat-manager wiring ---
  describe('chat-manager wires requirement summary', () => {
    const chatSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/chat-manager.ts'),
      'utf8',
    );

    test('imports buildRequirementSummary and buildRequirementSummaryPrompt', () => {
      expect(chatSource).toContain('buildRequirementSummary');
      expect(chatSource).toContain('buildRequirementSummaryPrompt');
    });

    test('has _pendingRequirementProject state', () => {
      expect(chatSource).toContain('_pendingRequirementProject');
    });

    test('requirement confirmation intercepts callAI', () => {
      // Should check _pendingRequirementProject at the start of callAI
      const callAiStart = chatSource.indexOf('async function callAI(userMessage: string)');
      const first200 = chatSource.substring(callAiStart, callAiStart + 500);
      expect(first200).toContain('_pendingRequirementProject');
      expect(first200).toContain('generatePortalPlanFromConfirmedProject');
    });
  });

  // --- Portal-agent exports ---
  describe('portal-agent exports new functions', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/portal-agent.ts'),
      'utf8',
    );

    test('exports buildRequirementSummary', () => {
      expect(source).toContain('export function buildRequirementSummary');
    });

    test('exports buildRequirementSummaryPrompt', () => {
      expect(source).toContain('export function buildRequirementSummaryPrompt');
    });
  });
});
