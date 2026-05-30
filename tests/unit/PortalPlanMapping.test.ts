import { describe, expect, test } from 'vitest';
import { buildPortalDraft, buildPortalSummary, extractPortalProfileFromMessage, mergePortalProfile } from '../../web/src/portal-agent';
import { createWorkspaceConfigFromPortalDraft, type Project } from '../../web/src/project-manager';
import {
  applyPortalPlanToProject,
  createPortalPlanFromProject,
  createWorkspaceFromPortalPlan,
  syncPortalPlanFromWorkspace,
} from '../../web/src/portal-plan';

function createProjectFixture(): Project {
  const profile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：申能集团
客户行业：能源
客户核心职能/业务特征：安全生产、设备巡检、调度协同
本次门户用途：运营门户
希望突出哪些卡片或信息：快捷入口、待办事务、新闻公告
品牌/视觉倾向：稳重企业蓝
  `), 'chat');
  const summary = { ...buildPortalSummary(profile), confirmedAt: 1780000000000 };
  const draft = buildPortalDraft(summary);
  const workspace = createWorkspaceConfigFromPortalDraft(draft);

  return {
    id: 'project-1',
    name: '申能集团门户',
    lifecycle: 'active',
    templateType: 'light-ui',
    colors: { primary: '#2C615C' },
    portalProfile: profile,
    portalSummary: summary,
    portalDraft: draft,
    workspace,
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  };
}

describe('PortalPlan mapping helpers', () => {
  test('creates a generated PortalPlan from existing project profile, draft, colors, and workspace', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);

    expect(plan.status).toBe('generated');
    expect(plan.enterpriseProfile.customerName).toBe('申能集团');
    expect(plan.enterpriseProfile.industry).toBe('能源');
    expect(plan.themeLayer.colors.primary).toBe('#2C615C');
    expect(plan.themeLayer.themeDirection).toContain('能源');
    expect(plan.workspaceRuleLayer.cardPlacements).toHaveLength(project.workspace?.items.length ?? 0);
    expect(plan.cardContentLayer.cards[0]?.title).toContain('申能集团');
  });

  test('derives a WorkspaceConfig from PortalPlan card placements and card content', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);
    const workspace = createWorkspaceFromPortalPlan(plan);

    expect(workspace.settings.columns).toBe(plan.workspaceRuleLayer.gridColumns);
    expect(workspace.items[0]?.x).toBe(plan.workspaceRuleLayer.cardPlacements[0]?.column);
    expect(workspace.items[0]?.w).toBe(plan.workspaceRuleLayer.cardPlacements[0]?.columnSpan);
    expect(workspace.items[0]?.instanceProps?.title).toBe(plan.cardContentLayer.cards[0]?.title);
  });

  test('applies PortalPlan to project and keeps transition fields aligned', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);
    const updated = applyPortalPlanToProject(project, plan);

    expect(updated.portalPlan).toBe(plan);
    expect(updated.portalPlanStatus).toBe('generated');
    expect(updated.workspace?.items).toHaveLength(plan.workspaceRuleLayer.cardPlacements.length);
  });

  test('syncs workspace layout changes back into PortalPlan card placements', () => {
    const project = applyPortalPlanToProject(createProjectFixture(), createPortalPlanFromProject(createProjectFixture()));
    const workspace = project.workspace!;
    const movedWorkspace = {
      ...workspace,
      items: workspace.items.map((item, index) => index === 0 ? { ...item, x: 1, y: 2, w: 3, h: 10 } : item),
    };

    const updated = syncPortalPlanFromWorkspace({ ...project, workspace: movedWorkspace });
    const placement = updated.portalPlan?.workspaceRuleLayer.cardPlacements.find((item) => item.cardId === movedWorkspace.items[0]?.id);

    expect(placement).toMatchObject({ column: 1, row: 2, columnSpan: 3, rowSpan: 10 });
    expect(updated.portalPlan?.status).toBe('editing');
    expect(updated.portalPlanStatus).toBe('editing');
  });

  test('syncs workspace instanceProps title back into PortalPlan card content', () => {
    const baseProject = createProjectFixture();
    const project = applyPortalPlanToProject(baseProject, createPortalPlanFromProject(baseProject));
    const workspace = project.workspace!;
    const targetItem = workspace.items[0]!;
    const changedWorkspace = {
      ...workspace,
      items: workspace.items.map((item, index) => index === 0
        ? { ...item, instanceProps: { ...item.instanceProps, title: '新的卡片标题' } }
        : item),
    };

    const updated = syncPortalPlanFromWorkspace({ ...project, workspace: changedWorkspace });
    const card = updated.portalPlan?.cardContentLayer.cards.find((item) => item.id === targetItem.id);

    expect(card?.title).toBe('新的卡片标题');
  });
});
