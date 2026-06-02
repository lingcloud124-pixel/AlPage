import { describe, expect, test } from 'vitest';

import { buildPortalDraft, buildPortalSummary, extractPortalProfileFromMessage, mergePortalProfile } from '../../web/src/portal-agent';
import { createWorkspaceConfigFromPortalDraft } from '../../web/src/project-manager';

describe('portal workspace draft', () => {
  test('converts portal draft seed into a workspace config with portal-draft source metadata', () => {
    const profile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：华东医疗
客户行业：医疗
客户核心职能/业务特征：门诊协同、专家排班、患者服务
本次门户用途：客户演示门户
希望突出哪些卡片或信息：新闻公告、我的日程、快捷入口
品牌/视觉倾向：蓝白简洁，专业可信
    `), 'chat');
    const summary = buildPortalSummary(profile);
    const draft = buildPortalDraft(summary);
    const workspace = createWorkspaceConfigFromPortalDraft(draft);

    expect(workspace.meta.source).toBe('portal-draft');
    expect(workspace.items).toHaveLength(draft.workspaceSeed.length);
    expect(workspace.items[0]?.instanceProps).toMatchObject({
      title: expect.stringContaining('华东医疗'),
    });
    expect(workspace.items.some((item) => item.templateId === 'news-carousel')).toBe(true);
  });
});
