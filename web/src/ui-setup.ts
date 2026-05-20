import { renderTemplate } from './templates/loader';
import { getCurrentProjectId } from './project-manager';
import {
  getDefaultLandingPromptEntries,
} from './landing-prompts';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { setupChatInterface } from './chat-manager';
import { setupMainActions } from './package-manager';
import { initializeColorEditor } from './components/color-editor';
import { showWorkspaceLandingState } from './main';
import { toggleSidebar } from './components/sidebar';

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
  const avatarName = document.getElementById('userAvatarName');
  if (avatarName) avatarName.style.display = 'none';
  syncWorkbenchLayoutForActiveTab(true, 'loginTab');

  if (!previewTemplatesLoaded) {
    loadDefaultTemplates();
    previewTemplatesLoaded = true;
  }
  requestAnimationFrame(() => (window as any).resizePreview?.());
  setTimeout(() => (window as any).resizePreview?.(), 600);
}

export function collapsePreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container');
  if (previewPanel) previewPanel.classList.remove('expanded');
  appContainer?.classList.remove('preview-open');
  const avatarName = document.getElementById('userAvatarName');
  if (avatarName) avatarName.style.display = '';
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
    document.getElementById('backToHomeBtn'),
    document.getElementById('landingHomeBtn'),
  ].filter((el): el is HTMLElement => Boolean(el));

  homeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => showWorkspaceLandingState());
  });
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
  const TAB_MAP = [
    { btnId: 'loginTab', pageId: 'loginPage', templateId: 'login' },
    { btnId: 'mainPageTab', pageId: 'mainPage', templateId: 'desktop' },
  ];
  let activeTabInfo = { btn: null as HTMLButtonElement | null, page: null as HTMLElement | null, templateId: '' };
  const indicator = document.querySelector('.topbar-tabs .tab-indicator') as HTMLElement;

  function moveIndicator(btn: HTMLButtonElement) {
    if (!indicator) return;
    indicator.style.left = btn.offsetLeft + 'px';
  }

  function syncActiveIndicator() {
    if (activeTabInfo.btn) moveIndicator(activeTabInfo.btn);
  }

  function syncPageVisibility(activePage: HTMLElement) {
    TAB_MAP.forEach(({ pageId }) => {
      const candidate = document.getElementById(pageId) as HTMLElement | null;
      if (!candidate) return;
      const isActive = candidate === activePage;
      candidate.classList.toggle('active-preview', isActive);
      candidate.style.display = isActive ? 'block' : 'none';
      candidate.style.pointerEvents = isActive ? 'auto' : 'none';
      candidate.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }

  async function activateTab(btn: HTMLButtonElement, page: HTMLElement, templateId: string) {
    if (!page.firstElementChild) {
      await renderTemplate(templateId, page);
    }
    activeTabInfo.btn?.classList.remove('active-tab');
    btn.classList.add('active-tab');
    syncPageVisibility(page);
    activeTabInfo = { btn, page, templateId };
    moveIndicator(btn);
    syncWorkbenchLayoutForActiveTab(true, btn.id as 'loginTab' | 'mainPageTab');
    requestAnimationFrame(() => (window as any).resizePreview?.());
  }

  TAB_MAP.forEach(tabInfo => {
    const { btnId, pageId, templateId } = tabInfo;
    const btn = document.getElementById(btnId) as HTMLButtonElement;
    const page = document.getElementById(pageId) as HTMLElement;
    if (!btn || !page) return;

    if (btnId === 'loginTab') {
      btn.classList.add('active-tab');
      syncPageVisibility(page);
      activeTabInfo = { btn, page, templateId };
      requestAnimationFrame(() => moveIndicator(btn));
      setTimeout(() => moveIndicator(btn), 50);
    }

    btn.addEventListener('click', async () => {
      if (activeTabInfo.btn === btn) {
        syncWorkbenchLayoutForActiveTab(true, btn.id as 'loginTab' | 'mainPageTab');
        requestAnimationFrame(() => (window as any).resizePreview?.());
        return;
      }
      await activateTab(btn, page, templateId);
    });
  });

  window.addEventListener('resize', syncActiveIndicator);
}

export function setupCollapsibleColorPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;

  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Panel toggle elements not found');
    return;
  }

  let prePanelState: { chatWidth: string; chatFlex: string; chatMinWidth: string } | null = null;

  function openPanel() {
    if (appContainer.classList.contains('panel-open')) return;
    const chatPanel = document.getElementById('chatPanel') as HTMLElement;
    prePanelState = {
      chatWidth: chatPanel?.style.width ?? '',
      chatFlex: chatPanel?.style.flex ?? '',
      chatMinWidth: chatPanel?.style.minWidth ?? '',
    };
    appContainer.classList.add('panel-open');
    sidePanel.classList.add('open');
    panelToggleBtn.textContent = '收起面板';
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
    if (appContainer.classList.contains('panel-open')) closePanel();
    else openPanel();
  });

  if (sidePanelClose) {
    sidePanelClose.addEventListener('click', closePanel);
  }
}
