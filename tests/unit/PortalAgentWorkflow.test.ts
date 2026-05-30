import { describe, expect, test } from 'vitest';

import {
  buildPortalDraft,
  buildPortalSummary,
  extractPortalProfileFromMessage,
  getPortalMissingFields,
  getPortalWorkflowState,
  isPortalSummaryConfirmationMessage,
  mergePortalProfile,
} from '../../web/src/portal-agent';

describe('portal agent workflow', () => {
  test('keeps collecting until all required customer fields are present', () => {
    const partialProfile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：申能集团
客户行业：能源
本次门户用途：运营门户
    `), 'chat');

    expect(getPortalMissingFields(partialProfile)).toEqual([
      'customerFunctions',
      'highlightedCards',
      'visualPreference',
    ]);
    expect(getPortalWorkflowState(partialProfile, null).status).toBe('collecting');
  });

  test('moves to summary confirmation after the six required fields are complete', () => {
    const completedProfile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：申能集团
客户行业：能源
客户核心职能/业务特征：安全生产、设备巡检、调度协同
本次门户用途：运营门户
希望突出哪些卡片或信息：待办事务、快捷入口、公告速览
品牌/视觉倾向：稳重企业蓝，强调能源行业的专业感
    `), 'chat');

    const summary = buildPortalSummary(completedProfile);

    expect(summary.customerName).toBe('申能集团');
    expect(summary.customerIndustry).toBe('能源');
    expect(summary.structureUnderstanding.length).toBeGreaterThan(0);
    expect(getPortalWorkflowState(completedProfile, summary).status).toBe('summary_pending');
    expect(
      getPortalWorkflowState(completedProfile, {
        ...summary,
        confirmedAt: Date.now(),
      }).status,
    ).toBe('ready_to_generate');
  });

  test('treats confirmation replies as approval to continue generation', () => {
    expect(isPortalSummaryConfirmationMessage('确认，开始生成')).toBe(true);
    expect(isPortalSummaryConfirmationMessage('就这样，生成吧')).toBe(true);
    expect(isPortalSummaryConfirmationMessage('我想把用途改成活动门户')).toBe(false);
  });

  test('builds a customer-aware portal draft with prioritized cards and example content', () => {
    const profile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：申能集团
客户行业：能源
客户核心职能/业务特征：安全生产、设备巡检、调度协同
本次门户用途：运营门户
希望突出哪些卡片或信息：快捷入口、待办事务、新闻公告
品牌/视觉倾向：稳重企业蓝
    `), 'chat');
    const summary = buildPortalSummary(profile);
    const draft = buildPortalDraft(summary);

    expect(draft.workspaceSeed[0]?.templateId).toBe('quick-access');
    expect(draft.workspaceSeed.some((item) => item.title?.includes('申能集团'))).toBe(true);
    expect(draft.workspaceSeed.some((item) => item.summary?.includes('能源'))).toBe(true);
  });
});
