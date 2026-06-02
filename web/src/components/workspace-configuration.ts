import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import type { WorkspaceConfig } from '../types';
import { commitWorkspaceSettings, previewWorkspaceSettings } from '../workspace/runtime';

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
  const ruleLayer = project.portalPlan?.workspaceRuleLayer;

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
        <div class="config-field">
          <label class="config-label" for="wsConfigCardRadius">卡片圆角 (px)</label>
          <input type="number" id="wsConfigCardRadius" class="config-input" min="0" max="32"
            value="${ruleLayer?.cardRadius ?? 16}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="wsConfigCardShadow">卡片阴影</label>
          <select id="wsConfigCardShadow" class="config-input">
            <option value="none" ${getSelected((ruleLayer?.shadowStyle ?? 'soft') === 'none')}>无阴影</option>
            <option value="soft" ${getSelected((ruleLayer?.shadowStyle ?? 'soft') === 'soft')}>柔和</option>
            <option value="strong" ${getSelected((ruleLayer?.shadowStyle ?? 'soft') === 'strong')}>明显</option>
          </select>
        </div>
      </div>

      <p class="workspace-autosave-note">编辑会自动保存，无需手动保存或返回编辑。</p>
    </section>
  `;

  bindWorkspaceConfigEvents(project);
}

function bindWorkspaceConfigEvents(project: Project): void {
  const layoutFields: LayoutField[] = [
    { id: 'wsConfigColumns', key: 'columns', min: 2, max: 12, fallback: 4 },
    { id: 'wsConfigRowHeight', key: 'rowHeight', min: 16, max: 80, fallback: 24 },
    { id: 'wsConfigGapX', key: 'gapX', min: 0, max: 48, fallback: 16 },
    { id: 'wsConfigGapY', key: 'gapY', min: 0, max: 48, fallback: 16 },
    { id: 'wsConfigPaddingX', key: 'paddingX', min: 0, max: 48, fallback: 20 },
    { id: 'wsConfigPaddingY', key: 'paddingY', min: 0, max: 48, fallback: 16 },
  ];
  const LAYOUT_FIELDS = layoutFields;

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  const readSettings = (): Partial<WorkspaceConfig['settings']> => {
    const patch: Partial<WorkspaceConfig['settings']> = {};
    for (const field of LAYOUT_FIELDS) {
      const input = document.getElementById(field.id) as HTMLInputElement | null;
      const value = validateField(input?.value ?? '', field);
      patch[field.key] = value as never;
    }
    return patch;
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const patch = readSettings();
      await commitWorkspaceSettings(patch);
      await saveCardRuleSettings(project);
    }, 300);
  };

  const livePreview = () => {
    previewWorkspaceSettings(readSettings());
    scheduleAutoSave();
  };

  for (const field of LAYOUT_FIELDS) {
    document.getElementById(field.id)?.addEventListener('input', livePreview);
  }
  document.getElementById('wsConfigCardShadow')?.addEventListener('change', scheduleAutoSave);
  document.getElementById('wsConfigCardRadius')?.addEventListener('input', scheduleAutoSave);
}

interface LayoutField {
  id: string;
  key: keyof WorkspaceConfig['settings'];
  min: number;
  max: number;
  fallback: number;
}

function validateField(value: string, field: LayoutField): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return field.fallback;
  if (num < field.min) return field.min;
  if (num > field.max) return field.max;
  return num;
}

async function saveCardRuleSettings(project: Project): Promise<void> {
  if (project.portalPlan?.workspaceRuleLayer) {
    const radius = validateField((document.getElementById('wsConfigCardRadius') as HTMLInputElement | null)?.value ?? '', {
      id: 'wsConfigCardRadius',
      key: 'maxWidth',
      min: 0,
      max: 32,
      fallback: project.portalPlan.workspaceRuleLayer.cardRadius ?? 16,
    });
    const cardShadow = (document.getElementById('wsConfigCardShadow') as HTMLSelectElement | null)?.value ?? 'soft';
    project.portalPlan.workspaceRuleLayer.cardRadius = radius;
    project.portalPlan.workspaceRuleLayer.shadowStyle = cardShadow;
    project.updatedAt = Date.now();
    await saveProject(project);
  }
}

function getSelected(condition: boolean): string {
  return condition ? 'selected' : '';
}

type Project = NonNullable<Awaited<ReturnType<typeof loadProject>>>;
