import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import type { WorkspaceConfig } from '../types';
import { renderWorkspacePreview } from '../workspace/preview';
import { getWorkspaceTemplateCache } from '../workspace/runtime';

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

  const ws = project.workspace;
  const settings = ws?.settings;

  container.innerHTML = `
    <section class="workspace-properties-section workspace-planning-view">
      <div class="workspace-planning-summary">
        <div class="workspace-planning-list">
          <div><span>门户名称</span><strong>${project.themeName || project.name || '未命名门户'}</strong></div>
          <div><span>模板类型</span><strong>${project.templateType === 'dark-ui' ? '深色门户' : '浅色门户'}</strong></div>
          <div><span>主题配置</span><strong>${countThemeVariables(project)} 个变量</strong></div>
          <div><span>背景规划</span><strong>${getBackgroundSummary(project)}</strong></div>
          <div><span>工作区布局</span><strong>${getWorkspaceSummary(project.workspace)}</strong></div>
        </div>
      </div>

      <div class="config-section">
        <h4 class="config-section-title">布局参数</h4>
        <div class="config-field">
          <label class="config-label" for="wsConfigColumns">列数</label>
          <input type="number" id="wsConfigColumns" class="config-input" min="2" max="12"
            value="${settings?.columns ?? 4}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigRowHeight">行高 (px)</label>
          <input type="number" id="wsConfigRowHeight" class="config-input" min="16" max="80"
            value="${settings?.rowHeight ?? 24}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigGapX">横向间距 (px)</label>
          <input type="number" id="wsConfigGapX" class="config-input" min="0" max="48"
            value="${settings?.gapX ?? 16}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigGapY">纵向间距 (px)</label>
          <input type="number" id="wsConfigGapY" class="config-input" min="0" max="48"
            value="${settings?.gapY ?? 16}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigPaddingX">水平内边距 (px)</label>
          <input type="number" id="wsConfigPaddingX" class="config-input" min="0" max="48"
            value="${settings?.paddingX ?? 20}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigPaddingY">垂直内边距 (px)</label>
          <input type="number" id="wsConfigPaddingY" class="config-input" min="0" max="48"
            value="${settings?.paddingY ?? 16}" />
        </div>
      </div>

      <div class="config-section">
        <button class="config-btn-primary" id="wsConfigSaveBtn" type="button">保存布局配置</button>
      </div>

      <p class="workspace-autosave-note">编辑会自动保存，无需手动保存或返回编辑。</p>
    </section>
  `;

  bindWorkspaceConfigEvents(project);
}

function bindWorkspaceConfigEvents(project: Project): void {
  const saveBtn = document.getElementById('wsConfigSaveBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const columns = parseInt((document.getElementById('wsConfigColumns') as HTMLInputElement)?.value ?? '4', 10);
    const rowHeight = parseInt((document.getElementById('wsConfigRowHeight') as HTMLInputElement)?.value ?? '24', 10);
    const gapX = parseInt((document.getElementById('wsConfigGapX') as HTMLInputElement)?.value ?? '16', 10);
    const gapY = parseInt((document.getElementById('wsConfigGapY') as HTMLInputElement)?.value ?? '16', 10);
    const paddingX = parseInt((document.getElementById('wsConfigPaddingX') as HTMLInputElement)?.value ?? '20', 10);
    const paddingY = parseInt((document.getElementById('wsConfigPaddingY') as HTMLInputElement)?.value ?? '16', 10);

    if (!project.workspace) {
      project.workspace = {
        settings: { columns: 4, rowHeight: 24, gapX: 16, gapY: 16, paddingX: 20, paddingY: 16 },
        items: [],
        meta: { initializedAt: Date.now(), updatedAt: Date.now(), source: 'default' },
      };
    }

    project.workspace.settings = {
      ...project.workspace.settings,
      columns: Math.max(2, Math.min(12, columns)),
      rowHeight: Math.max(16, Math.min(80, rowHeight)),
      gapX: Math.max(0, Math.min(48, gapX)),
      gapY: Math.max(0, Math.min(48, gapY)),
      paddingX: Math.max(0, Math.min(48, paddingX)),
      paddingY: Math.max(0, Math.min(48, paddingY)),
    };

    await saveProject(project);
    renderWorkspacePreview(
      document.getElementById('mainPage'),
      project.workspace ?? null,
      getWorkspaceTemplateCache(),
    );
    saveBtn.textContent = '已保存';
    setTimeout(() => { saveBtn.textContent = '保存布局配置'; }, 1500);
  });
}

type Project = NonNullable<Awaited<ReturnType<typeof loadProject>>>;
