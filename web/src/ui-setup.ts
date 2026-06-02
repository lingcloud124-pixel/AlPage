import { renderTemplate } from './templates/loader';
import {
  getCurrentProjectId,
  loadProject,
  markPortalResultSaved,
  markPortalResultFullscreenViewed,
  type Project,
  saveProject,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { setupChatInterface } from './chat-manager';
import { initializeThemeConfiguration } from './components/color-editor';
import type { WorkspaceCardSelection } from './components/card-content-configuration';
import { showWorkspaceLandingState } from './main';
import { refreshSidebar, toggleSidebar } from './components/sidebar';
import { renderWorkspacePreview } from './workspace/preview';
import { ensureWorkspaceTemplateCache, getWorkspaceTemplateCache } from './workspace/runtime';
import { publishSavedPortal, createSavedPortal, updateSavedPortal, SavedPortalNotFoundError } from './api/saved-portals';
import { getConversationId, getConversationHistory, saveChatHistory } from './chat/chat-conversation-state';
import { showNotificationWithOptions } from './utils/notification';

let previewTemplatesLoaded = false;

export function applyUiTheme(_mode: 'dark' | 'light' = 'light') {
  document.body.dataset.uiTheme = 'light';
}

export function setChatPanelWidth(width: number | null) {
  const chatPanel = document.getElementById('chatPanel') as HTMLElement | null;
  if (!chatPanel) return;
  if (width === null) {
    chatPanel.style.removeProperty('width');
    chatPanel.style.removeProperty('flex');
    chatPanel.style.removeProperty('min-width');
    return;
  }
  chatPanel.style.width = `${width}px`;
  chatPanel.style.flex = `0 0 ${width}px`;
  chatPanel.style.minWidth = `${width}px`;
}

export function syncWorkbenchLayoutForActiveTab(hasPreview: boolean, activeTabId: 'loginTab' | 'mainPageTab') {
  if (!hasPreview) {
    setChatPanelWidth(null);
    return;
  }
  const chatPanel = document.getElementById('chatPanel') as HTMLElement | null;
  if (!chatPanel) return;
  const appContainer = document.querySelector('.app-container');
  if (appContainer?.classList.contains('preview-open')) {
    chatPanel.classList.remove('landing-mode');
    chatPanel.classList.remove('is-full-landing');
  }
  if (!chatPanel.style.width) {
    setChatPanelWidth(378);
  }
}

export function expandPreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container');
  if (!previewPanel) return;
  previewPanel.classList.add('expanded');
  appContainer?.classList.add('preview-open');
  toggleSidebar(false);
  syncWorkbenchLayoutForActiveTab(true, 'loginTab');

  if (!previewTemplatesLoaded) {
    loadDefaultTemplates();
    previewTemplatesLoaded = true;
  }
  requestAnimationFrame(() => (window as any).resizePreview?.());
}

export function collapsePreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container');
  if (previewPanel) previewPanel.classList.remove('expanded');
  appContainer?.classList.remove('preview-open');
  syncWorkbenchLayoutForActiveTab(false, 'loginTab');
}

export function setupResizableDivider() {
  const previewDivider = document.getElementById('previewDivider') as HTMLElement;
  const previewPanel = document.getElementById('previewPanel') as HTMLElement;
  const chatPanel = document.getElementById('chatPanel') as HTMLElement;

  if (!previewDivider || !previewPanel || !chatPanel) return;
  let isResizing = false;
  let startX: number;
  let startWidth: number;

  previewDivider.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = chatPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    const newWidth = startWidth + delta;
    if (newWidth >= 280 && newWidth <= 520) {
      setChatPanelWidth(newWidth);
      previewPanel.style.flex = '1 1 auto';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => (window as any).resizePreview?.());
  });
}

export function setupPreviewPanel() {
  const previewPanel = document.getElementById('previewPanel');
  if (!previewPanel) return;
  const closeBtn = previewPanel.querySelector('.preview-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', collapsePreview);
}

export function setupBackToHome() {
  const homeTriggers = [
    document.getElementById('landingHomeBtn'),
  ].filter((el): el is HTMLElement => Boolean(el));

  homeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => showWorkspaceLandingState());
  });
}

async function withCurrentProject(
  updater: (project: NonNullable<Awaited<ReturnType<typeof loadProject>>>) => Promise<void> | void,
): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  const project = await loadProject(projectId);
  if (!project) return;
  await updater(project);
}

async function handleResultFullscreen(): Promise<void> {
  const mainPage = document.getElementById('mainPage');
  if (!mainPage) return;

  // Collect the rendered portal content
  const content = mainPage.innerHTML;
  if (!content.trim()) return;

  // Collect CSS custom properties from #previewPanel (theme colors)
  const previewPanel = document.getElementById('previewPanel');
  const themeVars: string[] = [];
  if (previewPanel) {
    const style = previewPanel.style;
    for (let i = 0; i < style.length; i++) {
      const name = style[i];
      if (name.startsWith('--')) {
        themeVars.push(`  ${name}: ${style.getPropertyValue(name)};`);
      }
    }
  }
  const dataTemplateType = previewPanel?.getAttribute('data-template-type') ?? '';

  // Collect all loaded stylesheet hrefs
  const styleLinks: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    if (link.href) styleLinks.push(link.href);
  });

  // Build full HTML page
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>门户预览</title>
${styleLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 100vh; }
  body { ${dataTemplateType ? `data-template-type: "${dataTemplateType}";` : ''} }
  #portalFullscreen { width: 100%; min-height: 100vh; }
  .template-desktop, .template-login { position: relative !important; width: 100% !important; height: auto !important; transform: none !important; left: auto !important; top: auto !important; overflow: visible !important; }
  ${themeVars.length ? `#portalFullscreen {\n${themeVars.join('\n')}\n}` : ''}
</style>
</head>
<body>
<div id="portalFullscreen" ${dataTemplateType ? `data-template-type="${dataTemplateType}"` : ''}>
${content}
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  await withCurrentProject(async (project) => {
    await saveProject(markPortalResultFullscreenViewed(project));
  });
}

async function handleResultShare(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) { alert('请先创建项目'); return; }
  const project = await loadProject(projectId);
  if (!project) { alert('项目不存在'); return; }

  try {
    const portalId = await saveCurrentPortal(project);
    await publishSavedPortal(portalId);
    const publishUrl = `${window.location.origin}/p/${portalId}`;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(publishUrl);
    }
    showNotificationWithOptions('已复制预览链接', { position: 'top-center' });
  } catch (err) {
    alert(`分享失败：${(err as Error).message}`);
  }
}

export function setupResultActions() {
  const fullscreenBtn = document.getElementById('resultFullscreenBtn') as HTMLButtonElement | null;
  const savePortalBtn = document.getElementById('resultSavePortalBtn') as HTMLButtonElement | null;
  const shareBtn = document.getElementById('resultShareBtn') as HTMLButtonElement | null;
  const copyEditLinkBtn = document.getElementById('resultCopyEditLinkBtn') as HTMLButtonElement | null;

  fullscreenBtn?.addEventListener('click', () => { void handleResultFullscreen(); });
  savePortalBtn?.addEventListener('click', () => { void handleResultSavePortal(); });
  shareBtn?.addEventListener('click', () => { void handleResultShare(); });
  copyEditLinkBtn?.addEventListener('click', () => { closeMoreMenu(); void handleResultCopyEditLink(); });

  // 更多操作下拉菜单
  const moreBtn = document.getElementById('topbarMoreBtn') as HTMLButtonElement | null;
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('topbarMoreMenu');
    menu?.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('topbarMoreMenu');
    if (menu?.classList.contains('open') && !menu.contains(e.target as Node)) {
      menu.classList.remove('open');
    }
  });
}

function closeMoreMenu(): void {
  document.getElementById('topbarMoreMenu')?.classList.remove('open');
}

function cloneProjectSnapshot(project: Project): Record<string, unknown> {
  return JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
}

function buildSavedPortalPayload(project: Project, conversationId?: string | null) {
  const history = getConversationHistory();
  return {
    name: project.themeName || project.name || '未命名门户',
    templateType: project.templateType,
    colors: project.colors ?? {},
    workspace: (project.workspace ?? {}) as unknown as Record<string, unknown>,
    portalPlan: (project.portalPlan ?? {}) as unknown as Record<string, unknown>,
    projectSnapshot: cloneProjectSnapshot(project),
    conversationSnapshot: { messages: history.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })) },
    projectId: project.id,
    conversationId: conversationId ?? '',
    status: 'saved',
  };
}

async function saveCurrentPortal(project: Project): Promise<string> {
  const conversationId = await saveChatHistory() ?? getConversationId();
  let portalId = project.savedPortalId;
  let projectToSave = markPortalResultSaved(project);

  if (!portalId) {
    const result = await createSavedPortal(buildSavedPortalPayload(projectToSave, conversationId));
    portalId = result.id;
    project.savedPortalId = portalId;
    projectToSave.savedPortalId = portalId;
    await saveProject(projectToSave);
  }

  try {
    await updateSavedPortal(portalId, buildSavedPortalPayload(projectToSave, conversationId));
  } catch (error) {
    if (!(error instanceof SavedPortalNotFoundError)) throw error;
    const result = await createSavedPortal(buildSavedPortalPayload(projectToSave, conversationId));
    portalId = result.id;
    project.savedPortalId = portalId;
    projectToSave.savedPortalId = portalId;
    await updateSavedPortal(portalId, buildSavedPortalPayload(projectToSave, conversationId));
  }
  await saveProject(projectToSave);
  await saveChatHistory(); // sync conversation snapshot with latest savedPortalId
  return portalId;
}

async function handleResultSavePortal(): Promise<void> {
  const button = document.getElementById('resultSavePortalBtn') as HTMLButtonElement | null;
  const projectId = getCurrentProjectId();
  if (!projectId) { alert('请先创建项目'); return; }
  const project = await loadProject(projectId);
  if (!project) { alert('项目不存在'); return; }

  const originalText = button?.textContent || '保存';
  if (button) {
    button.disabled = true;
    button.textContent = '保存中...';
  }

  try {
    await saveCurrentPortal(project);
    await refreshSidebar();
    showNotificationWithOptions('保存成功', { position: 'top-center' });
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  } catch (err) {
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
    alert(`保存失败：${(err as Error).message}`);
  }
}

async function handleResultCopyEditLink(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) { alert('请先创建项目'); return; }
  const editUrl = `${window.location.origin}${window.location.pathname}#project=${projectId}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(editUrl);
    }
    showNotificationWithOptions('已复制编辑链接', { position: 'top-center' });
  } catch {
    prompt('请复制以下编辑链接：', editUrl);
  }
}

export function setupPortalObjectEditing(): void {
}

async function loadHeaderIntoMainPage(headerId: string) {
  const mainPage = document.getElementById('mainPage');
  if (!mainPage) return;
  const headerEl = mainPage.querySelector('.desktop-header, .page-header-area, .header-slot, #headerArea') as HTMLElement | null;
  if (!headerEl) return;
  const parent = headerEl.parentElement;
  if (!parent) return;
  const wrapper = document.createElement('div');
  await renderTemplate(headerId, wrapper);
  const newHeader = wrapper.firstElementChild as HTMLElement | null;
  if (newHeader) {
    parent.replaceChild(newHeader, headerEl);
    requestAnimationFrame(() => (window as any).resizePreview?.());
  }
}

export function setupTabSwitching() {
  const mainPage = document.getElementById('mainPage') as HTMLElement | null;
  if (!mainPage) return;

  void (async () => {
    if (!mainPage.firstElementChild) {
      await renderTemplate('desktop', mainPage);
    }
    mainPage.classList.add('active-preview');
    mainPage.style.display = 'block';
    mainPage.style.pointerEvents = 'auto';
    mainPage.setAttribute('aria-hidden', 'false');
    syncWorkbenchLayoutForActiveTab(true, 'mainPageTab');
    const projectId = getCurrentProjectId();
    const project = projectId ? await loadProject(projectId) : null;
    await ensureWorkspaceTemplateCache();
    renderWorkspacePreview(mainPage, project?.workspace ?? null, getWorkspaceTemplateCache());
    previewTemplatesLoaded = true;
    requestAnimationFrame(() => (window as any).resizePreview?.());
  })();
}

export function setupConfigurationPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const propertiesDrawer = document.getElementById('workspacePropertiesDrawer') as HTMLElement | null;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;

  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Configuration panel elements not found');
    return;
  }

  let prePanelState: { chatWidth: string; chatFlex: string; chatMinWidth: string } | null = null;

  function openPanel() {
    const chatPanel = document.getElementById('chatPanel') as HTMLElement;
    if (!appContainer.classList.contains('panel-open')) {
      prePanelState = {
        chatWidth: chatPanel?.style.width ?? '',
        chatFlex: chatPanel?.style.flex ?? '',
        chatMinWidth: chatPanel?.style.minWidth ?? '',
      };
    }
    appContainer.classList.add('panel-open');
    appContainer.classList.add('configuration-panel-open');
    propertiesDrawer?.classList.remove('open');
    propertiesDrawer?.setAttribute('aria-hidden', 'true');
    sidePanel.classList.add('open');
    panelToggleBtn.textContent = '主题配置';
    initializeThemeConfiguration();
    // Fallback resize after panel CSS transition completes
    requestAnimationFrame(() => window.resizePreview?.());
    setTimeout(() => window.resizePreview?.(), 400);
  }

  function closePanel() {
    if (!appContainer.classList.contains('panel-open')) return;
    appContainer.classList.remove('panel-open');
    appContainer.classList.remove('configuration-panel-open');
    sidePanel.classList.remove('open');
    panelToggleBtn.textContent = '主题配置';
    if (prePanelState) {
      const chatPanel = document.getElementById('chatPanel') as HTMLElement;
      if (chatPanel) {
        if (prePanelState.chatWidth) chatPanel.style.width = prePanelState.chatWidth;
        else chatPanel.style.removeProperty('width');
        if (prePanelState.chatFlex) chatPanel.style.flex = prePanelState.chatFlex;
        else chatPanel.style.removeProperty('flex');
        if (prePanelState.chatMinWidth) chatPanel.style.minWidth = prePanelState.chatMinWidth;
        else chatPanel.style.removeProperty('min-width');
      }
      prePanelState = null;
    }
    // Fallback resize after panel CSS transition completes
    requestAnimationFrame(() => window.resizePreview?.());
    setTimeout(() => window.resizePreview?.(), 400);
  }

  window.addEventListener('workspace-card:selected', (event) => {
    const selection = (event as CustomEvent<WorkspaceCardSelection>).detail;
    if (!selection?.id) return;
    if (!propertiesDrawer?.classList.contains('open')) return;
    propertiesDrawer.querySelectorAll('.config-panel-tab').forEach((el) => {
      el.classList.toggle('is-active', (el as HTMLElement).dataset.tab === 'card');
    });
  });

  panelToggleBtn.addEventListener('click', () => {
    if (sidePanel.classList.contains('open')) closePanel();
    else openPanel();
  });

  if (sidePanelClose) {
    sidePanelClose.addEventListener('click', closePanel);
  }
}

export const setupCollapsibleColorPanel = setupConfigurationPanel;
