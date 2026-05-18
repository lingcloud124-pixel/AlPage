import { describe, expect, test } from 'vitest';
import { buildPortalDraft } from '../../web/src/portal-agent';
import type { PortalSummary } from '../../web/src/types';

const baseSummary: PortalSummary = {
  customerName: '国网电力',
  customerIndustry: '能源',
  customerFunctions: ['电力调度', '设备巡检'],
  portalPurpose: '调度指挥门户',
  highlightedCards: ['调度看板', '设备台账'],
  visualPreference: '科技蓝白',
  structureUnderstanding: ['工作台式门户'],
  styleUnderstanding: '深色科技风',
};

describe('industry-aware card content', () => {
  test('energy industry generates energy-specific todo items', () => {
    const draft = buildPortalDraft(baseSummary);
    const todoCard = draft.workspaceSeed.find((s) => s.templateId === 'message-todo');

    expect(todoCard).toBeTruthy();
    expect(todoCard!.summary).toBeTruthy();
    const items = todoCard!.items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => String(i.label));
    expect(labels.some((l) => l.includes('调度') || l.includes('巡检') || l.includes('能源'))).toBe(true);
  });

  test('energy industry generates energy-specific quick links', () => {
    const draft = buildPortalDraft(baseSummary);
    const qaCard = draft.workspaceSeed.find((s) => s.templateId === 'quick-access');

    expect(qaCard).toBeTruthy();
    expect(qaCard!.links).toBeTruthy();
    expect(qaCard!.links!.length).toBeGreaterThan(0);
    expect(qaCard!.links!.some((l) => l.includes('调度') || l.includes('巡检') || l.includes('设备'))).toBe(true);
  });

  test('finance industry generates finance-specific todo items', () => {
    const financeSummary: PortalSummary = {
      ...baseSummary,
      customerName: '中信银行',
      customerIndustry: '金融',
      customerFunctions: ['信贷审批', '风控管理'],
      portalPurpose: '运营管理门户',
      highlightedCards: ['审批', '风控'],
      visualPreference: '蓝金商务',
    };
    const draft = buildPortalDraft(financeSummary);
    const todoCard = draft.workspaceSeed.find((s) => s.templateId === 'message-todo');

    expect(todoCard).toBeTruthy();
    const items = todoCard!.items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => String(i.label));
    expect(labels.some((l) => l.includes('信贷') || l.includes('风控') || l.includes('审批') || l.includes('交易'))).toBe(true);
  });

  test('education industry generates education-specific quick links', () => {
    const eduSummary: PortalSummary = {
      ...baseSummary,
      customerName: '清华大学',
      customerIndustry: '教育',
      customerFunctions: ['教务管理', '科研管理'],
      portalPurpose: '运营管理门户',
      highlightedCards: ['教务', '科研'],
      visualPreference: '紫白学术',
    };
    const draft = buildPortalDraft(eduSummary);
    const qaCard = draft.workspaceSeed.find((s) => s.templateId === 'quick-access');

    expect(qaCard).toBeTruthy();
    expect(qaCard!.links!.some((l) => l.includes('教务') || l.includes('科研') || l.includes('课程') || l.includes('学生'))).toBe(true);
  });

  test('medical industry generates medical-specific content', () => {
    const medicalSummary: PortalSummary = {
      ...baseSummary,
      customerName: '仁济医院',
      customerIndustry: '医疗',
      customerFunctions: ['门诊排班', '患者管理'],
      portalPurpose: '运营管理门户',
      highlightedCards: ['排班', '患者服务'],
      visualPreference: '蓝白简洁',
    };
    const draft = buildPortalDraft(medicalSummary);
    const qaCard = draft.workspaceSeed.find((s) => s.templateId === 'quick-access');

    expect(qaCard).toBeTruthy();
    expect(qaCard!.links!.some((l) => l.includes('排班') || l.includes('患者') || l.includes('门诊'))).toBe(true);
  });

  test('unknown industry falls back to generic content', () => {
    const genericSummary: PortalSummary = {
      ...baseSummary,
      customerIndustry: '航空航天',
    };
    const draft = buildPortalDraft(genericSummary);
    expect(draft.workspaceSeed.length).toBeGreaterThanOrEqual(4);
  });

  test('card titles contain customer name', () => {
    const draft = buildPortalDraft(baseSummary);
    for (const seed of draft.workspaceSeed) {
      if (seed.title) {
        expect(seed.title).toContain('国网电力');
      }
    }
  });
});
