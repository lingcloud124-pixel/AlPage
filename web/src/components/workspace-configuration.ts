import { getCurrentProjectId, loadProject } from '../project-manager';
import type { WorkspaceConfig } from '../types';

function countThemeVariables(project: NonNullable<Awaited<ReturnType<typeof loadProject>>> | null): number {
  return Object.keys(project?.colors ?? {}).length;
}

function getWorkspaceSummary(workspace?: WorkspaceConfig | null): string {
  if (!workspace) return '尚未初始化工作区';
  return `${workspace.items.length} 张卡片 · ${workspace.settings.columns || 4} 列 · 行高 ${workspace.settings.rowHeight || 24}px`;
}

function getBackgroundSummary(project: NonNullable<Awaited<ReturnType<typeof loadProject>>> | null): string {
  const parts = [];
  if (project?.bgImageUrl) parts.push('登录/主页背景已配置');
  if (project?.headerBgImageUrl) parts.push('头部背景已配置');
  return parts.length ? parts.join('，') : '使用主题默认背景';
}

export async function renderWorkspacePlanningView(): Promise<void> {
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return;

  const projectId = getCurrentProjectId();
  const project = projectId ? await loadProject(projectId) : null;

  if (!project) {
    container.innerHTML = `
      <section class="workspace-properties-section">
        <h4>工作区规划</h4>
        <p class="workspace-planning-empty">当前还没有生成门户。生成后这里会展示工作区规划。</p>
        <p class="workspace-autosave-note">门户编辑会自动保存，无需手动保存。</p>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="workspace-properties-section workspace-planning-view">
      <h4>工作区规划</h4>
      <div class="workspace-planning-list">
        <div><span>门户名称</span><strong>${project.themeName || project.name || '未命名门户'}</strong></div>
        <div><span>模板类型</span><strong>${project.templateType === 'dark-ui' ? '深色门户' : '浅色门户'}</strong></div>
        <div><span>主题配置</span><strong>${countThemeVariables(project)} 个变量</strong></div>
        <div><span>背景规划</span><strong>${getBackgroundSummary(project)}</strong></div>
        <div><span>工作区布局</span><strong>${getWorkspaceSummary(project.workspace)}</strong></div>
      </div>
      <p class="workspace-autosave-note">编辑会自动保存，无需手动保存或返回编辑。</p>
    </section>
  `;
}
