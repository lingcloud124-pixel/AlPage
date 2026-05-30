import { renderTemplate } from './templates/loader';
import {
  getCurrentProjectId,
  loadProject,
  markPortalResultFullscreenViewed,
  markPortalResultSaved,
  markPortalResultShared,
  saveProject,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { setupChatInterface } from './chat-manager';
import { initializeColorEditor } from './components/color-editor';
import { showWorkspaceLandingState } from './main';
import { toggleSidebar } from './components/sidebar';
import { renderWorkspacePreview } from './workspace/preview';

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
  const previewPanel = document.getElementById('previewPanel') as HTMLElement | null;
  if (!previewPanel) return;
  if (document.fullscreenElement !== previewPanel) {
    await previewPanel.requestFullscreen?.();
  }
  await withCurrentProject(async (project) => {
    await saveProject(markPortalResultFullscreenViewed(project));
  });
}

async function handleResultSave(): Promise<void> {
  await withCurrentProject(async (project) => {
    await saveProject(markPortalResultSaved(project));
  });
  const saveBtn = document.getElementById('resultSaveBtn') as HTMLButtonElement | null;
  if (saveBtn) {
    const original = saveBtn.textContent;
    saveBtn.textContent = '已保存';
    window.setTimeout(() => {
      saveBtn.textContent = original ?? '保存门户';
    }, 1600);
  }
}

async function handleResultShare(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}#project=${projectId}`;
  const shareData = {
    title: '客户门户方案',
    text: '我刚整理了一份客户门户方案，可以直接查看并继续迭代。',
    url: shareUrl,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {
      // Fall back to clipboard when native share is canceled or unavailable.
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
  }
  await withCurrentProject(async (project) => {
    await saveProject(markPortalResultShared(project));
  });
}

function handleResultEdit(): void {
  const designModeBtn = document.getElementById('workspaceDesignModeBtn') as HTMLButtonElement | null;
  designModeBtn?.click();
}

export function setupResultActions() {
  const fullscreenBtn = document.getElementById('resultFullscreenBtn') as HTMLButtonElement | null;
  const saveBtn = document.getElementById('resultSaveBtn') as HTMLButtonElement | null;
  const shareBtn = document.getElementById('resultShareBtn') as HTMLButtonElement | null;
  const editBtn = document.getElementById('resultEditBtn') as HTMLButtonElement | null;

  fullscreenBtn?.addEventListener('click', () => { void handleResultFullscreen(); });
  saveBtn?.addEventListener('click', () => { void handleResultSave(); });
  shareBtn?.addEventListener('click', () => { void handleResultShare(); });
  editBtn?.addEventListener('click', handleResultEdit);
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
    renderWorkspacePreview(mainPage, project?.workspace ?? null);
    requestAnimationFrame(() => (window as any).resizePreview?.());
  })();
}

export function setupCollapsibleColorPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const propertiesDrawer = document.getElementById('workspacePropertiesDrawer') as HTMLElement | null;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;

  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Panel toggle elements not found');
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
    propertiesDrawer?.classList.remove('open');
    propertiesDrawer?.setAttribute('aria-hidden', 'true');
    sidePanel.classList.add('open');
    panelToggleBtn.textContent = '面板';
  }

  function closePanel() {
    if (!appContainer.classList.contains('panel-open')) return;
    appContainer.classList.remove('panel-open');
    sidePanel.classList.remove('open');
    panelToggleBtn.textContent = '面板';
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
  }

  panelToggleBtn.addEventListener('click', () => {
    if (sidePanel.classList.contains('open')) closePanel();
    else openPanel();
  });

  if (sidePanelClose) {
    sidePanelClose.addEventListener('click', closePanel);
  }
}
