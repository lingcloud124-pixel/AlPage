import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import { setThemeVar } from '../theme-engine';
import { syncColorEditorFromTheme } from './color-editor';
import { renderWorkspacePreview } from '../workspace/preview';
import { getWorkspaceTemplateCache } from '../workspace/runtime';
import { saveChatHistory } from '../chat/chat-conversation-state';

type Project = NonNullable<Awaited<ReturnType<typeof loadProject>>>;

/**
 * Render the editable theme configuration form into the config panel.
 */
export async function renderThemeConfiguration(): Promise<void> {
  const container = document.getElementById('themeConfigContainer') ?? document.getElementById('workspacePropertiesContent');
  if (!container) return;

  const projectId = getCurrentProjectId();
  const project = projectId ? await loadProject(projectId) : null;
  if (!project) {
    container.innerHTML = '<p class="config-empty-state">暂无活动项目</p>';
    return;
  }

  const logoUrl = project.logoUrl ?? '';
  const customerName = project.portalProfile?.customerName ?? '';
  const headerStyle = project.portalPlan?.themeLayer?.headerStyle ?? 'standard';
  const logoHeight = project.logoHeight ?? 32;
  const logoMaxWidth = project.logoMaxWidth ?? 245;

  container.innerHTML = `
    <div class="theme-config-form">
      <div class="config-section">
        <h4 class="config-section-title">Logo</h4>
        <div class="config-field">
          <label class="config-label">Logo 图片</label>
          <div class="logo-upload-area" id="themeConfigLogoArea">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="logo-preview" id="themeConfigLogoPreview" alt="Logo" />` : '<span class="logo-placeholder" id="themeConfigLogoPlaceholder">点击上传 Logo</span>'}
            <input type="file" id="themeConfigLogoInput" accept="image/*" class="logo-file-input" />
          </div>
          ${logoUrl ? '<button class="config-btn-danger" id="themeConfigLogoDeleteBtn" type="button">删除 Logo</button>' : ''}
        </div>
        <div class="config-field">
          <label class="config-label" for="themeConfigLogoHeight">Logo 高度 (px)</label>
          <input type="number" id="themeConfigLogoHeight" class="config-input" min="16" max="96"
            value="${logoHeight}" />
        </div>
        <div class="config-field">
          <label class="config-label" for="themeConfigLogoMaxWidth">Logo 最大宽度 (px)</label>
          <input type="number" id="themeConfigLogoMaxWidth" class="config-input" min="64" max="420"
            value="${logoMaxWidth}" />
        </div>
      </div>

      <div class="config-section">
        <h4 class="config-section-title">基本信息</h4>
        <div class="config-field">
          <label class="config-label" for="themeConfigCustomerName">客户名称</label>
          <input type="text" id="themeConfigCustomerName" class="config-input"
            value="${escapeHtml(customerName)}"
            placeholder="输入客户名称" />
        </div>
        <div class="config-field">
          <label class="config-label" for="themeConfigHeaderStyle">头部样式</label>
          <select id="themeConfigHeaderStyle" class="config-input">
            <option value="standard" ${getSelected(headerStyle === 'standard' || !headerStyle)}>标准</option>
            <option value="compact" ${getSelected(headerStyle === 'compact')}>紧凑</option>
            <option value="extended" ${getSelected(headerStyle === 'extended')}>扩展</option>
          </select>
        </div>
      </div>

      <div class="config-section">
        <h4 class="config-section-title">模板模式</h4>
        <div class="config-field">
          <label class="config-label" for="themeConfigTemplateType">明暗模式</label>
          <select id="themeConfigTemplateType" class="config-input">
            <option value="light-ui" ${getSelected(project.templateType === 'light-ui')}>浅色模式</option>
            <option value="dark-ui" ${getSelected(project.templateType === 'dark-ui')}>深色模式</option>
          </select>
        </div>
      </div>

      <div class="config-section">
        <button class="config-btn-primary" id="themeConfigSaveBtn" type="button">保存主题配置</button>
      </div>
    </div>
  `;

  bindThemeConfigEvents(project);
}

function bindThemeConfigEvents(project: Project): void {
  // Logo upload
  const logoInput = document.getElementById('themeConfigLogoInput') as HTMLInputElement;
  const logoArea = document.getElementById('themeConfigLogoArea');
  if (logoInput && logoArea) {
    logoArea.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', () => {
      const file = logoInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        updateLogoPreview(url);
        applyLogoToProject(project, url);
      };
      reader.readAsDataURL(file);
    });
  }

  // Logo delete
  const deleteBtn = document.getElementById('themeConfigLogoDeleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      applyLogoToProject(project, '');
      const preview = document.getElementById('themeConfigLogoPreview');
      if (preview) preview.remove();
      deleteBtn.remove();
      if (logoArea) {
        const span = document.createElement('span');
        span.className = 'logo-placeholder';
        span.textContent = '点击上传 Logo';
        span.id = 'themeConfigLogoPlaceholder';
        logoArea.appendChild(span);
      }
    });
  }

  // Save button
  const saveBtn = document.getElementById('themeConfigSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const customerName = (document.getElementById('themeConfigCustomerName') as HTMLInputElement)?.value.trim() ?? '';
      const headerStyle = (document.getElementById('themeConfigHeaderStyle') as HTMLSelectElement)?.value ?? 'standard';
      const templateType = (document.getElementById('themeConfigTemplateType') as HTMLSelectElement)?.value as 'light-ui' | 'dark-ui';

      // Write customerName to portalProfile
      if (project.portalProfile) {
        project.portalProfile.customerName = customerName || undefined;
      }

      // Write headerStyle to portalPlan.themeLayer
      if (project.portalPlan?.themeLayer) {
        project.portalPlan.themeLayer.headerStyle = headerStyle;
      }

      // Write templateType directly
      if (templateType !== project.templateType) {
        project.templateType = templateType;
      }

      const logoHeight = parseNumberInput('themeConfigLogoHeight', 16, 96, project.logoHeight ?? 32);
      const logoMaxWidth = parseNumberInput('themeConfigLogoMaxWidth', 64, 420, project.logoMaxWidth ?? 245);
      project.logoHeight = logoHeight;
      project.logoMaxWidth = logoMaxWidth;

      await saveProject(project);
      await saveChatHistory();
      refreshPreview(project);
      saveBtn.textContent = '已保存';
      setTimeout(() => { saveBtn.textContent = '保存主题配置'; }, 1500);
    });
  }
}

function updateLogoPreview(url: string): void {
  let img = document.getElementById('themeConfigLogoPreview') as HTMLImageElement | null;
  const placeholder = document.getElementById('themeConfigLogoPlaceholder');
  if (placeholder) placeholder.remove();

  if (!img) {
    const area = document.getElementById('themeConfigLogoArea');
    if (!area) return;
    img = document.createElement('img');
    img.id = 'themeConfigLogoPreview';
    img.className = 'logo-preview';
    img.alt = 'Logo';
    area.appendChild(img);
  }
  img.src = url;
}

async function applyLogoToProject(project: Project, url: string): Promise<void> {
  project.logoUrl = url || undefined;
  await saveProject(project);
  await saveChatHistory();
  refreshPreview(project);
}

function applyLogoToPreview(project: Project): void {
  const logoUrl = project.logoUrl ?? '';
  document.querySelectorAll<HTMLElement>('.login-logo, .desktop-logo').forEach((el) => {
    if (logoUrl) {
      el.style.backgroundImage = `url("${logoUrl.replace(/"/g, '\\"')}")`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'left center';
      el.textContent = '';
    } else {
      el.style.removeProperty('background-image');
    }
    if (project.logoHeight) el.style.height = `${project.logoHeight}px`;
    if (project.logoMaxWidth) el.style.maxWidth = `${project.logoMaxWidth}px`;
  });
}

function refreshPreview(project: Project): void {
  if (project.colors) {
    for (const [key, value] of Object.entries(project.colors)) {
      setThemeVar(key, value);
    }
    syncColorEditorFromTheme();
  }
  renderWorkspacePreview(
    document.getElementById('mainPage'),
    project.workspace ?? null,
    getWorkspaceTemplateCache(),
  );
  applyLogoToPreview(project);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSelected(condition: boolean): string {
  return condition ? 'selected' : '';
}

function parseNumberInput(id: string, min: number, max: number, fallback: number): number {
  const raw = (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}
