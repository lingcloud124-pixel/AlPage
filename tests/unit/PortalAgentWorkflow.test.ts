import fs from 'node:fs';
import path from 'node:path';

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

  test('chat confirmation flow rebuilds summary from the current profile before generating plan', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'web/src/chat-manager.ts'), 'utf8');
    const confirmGenerator = source.match(/async function generatePortalPlanFromConfirmedProject[\s\S]*?\n  \}/)?.[0] ?? '';

    expect(confirmGenerator).toContain('const portalSummary = buildPortalSummary(project.portalProfile);');
    expect(confirmGenerator).not.toContain('project.portalSummary ?? buildPortalSummary(project.portalProfile)');
    expect(confirmGenerator.indexOf('const portalSummary = buildPortalSummary(project.portalProfile);')).toBeLessThan(
      confirmGenerator.indexOf('const portalDraft = buildPortalDraft(portalSummary);'),
    );
    expect(confirmGenerator.indexOf('project.portalSummary = {')).toBeLessThan(
      confirmGenerator.indexOf('const portalPlan = createPortalPlanFromProject(project);'),
    );
  });

  test('message workflow only downgrades plan status when profile data changes or status is new', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'web/src/chat/chat-portal-workflow.ts'), 'utf8');

    expect(source).toContain('if (!project.portalPlanStatus)');
    expect(source).toContain('if (profileChanged && nextProfile)');
    expect(source).not.toContain("if (nextProfile) {\n    project.portalProfile = nextProfile;\n    Object.assign(project, setPortalPlanStatus(project, 'collecting'));");
  });

  test('chat confirmation flow creates and applies a PortalPlan before rendering workspace', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'web/src/chat-manager.ts'), 'utf8');
    const confirmGenerator = source.match(/async function generatePortalPlanFromConfirmedProject[\s\S]*?\n  \}/)?.[0] ?? '';

    expect(confirmGenerator).toContain('createPortalPlanFromProject(project)');
    expect(confirmGenerator).toContain('applyPortalPlanToProject(project, portalPlan)');
    expect(confirmGenerator).toContain("portalPlan.status = 'generated'");
    expect(confirmGenerator).toContain('renderWorkspaceEditorShell(project.workspace ?? null)');
    expect(confirmGenerator).toContain('renderWorkspacePreview(document.getElementById(\'mainPage\'), project.workspace ?? null, getWorkspaceTemplateCache())');
  });

  test('text confirmation in ready workflow triggers PortalPlan generation before generic AI', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'web/src/chat-manager.ts'), 'utf8');
    const sendFlow = source.match(/if \(activeProjectId\) \{[\s\S]*?\n\s*if \(\(content\) && !shouldSkipAiForPrimaryImage/)?.[0] ?? '';

    expect(sendFlow).toContain('isPortalSummaryConfirmationMessage(content)');
    expect(sendFlow).toContain("workflow.status === 'ready_to_generate'");
    expect(sendFlow).toContain('await generatePortalPlanFromConfirmedProject(activeProject);');
    expect(sendFlow).toContain('return;');
    expect(sendFlow.indexOf('await generatePortalPlanFromConfirmedProject(activeProject);')).toBeLessThan(
      sendFlow.indexOf('if ((content) && !shouldSkipAiForPrimaryImage'),
    );
  });
});
