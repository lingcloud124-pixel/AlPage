import { renderTemplate } from './templates/loader';
import { loadSettings, saveSettings as persistSettings, DEFAULT_CHAT_ENDPOINT, DEFAULT_IMAGE_ENDPOINT } from './agent/chat-client';
import { getCurrentProjectId, loadProject, saveProject, deleteProject, listProjects, populateSidebarProjects, closeAllProjectMenus, updateProjectNameDisplay, createProject } from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { loadAndRenderChatHistory, setupChatInterface } from './chat-manager';
import { showNotification, setupMainActions } from './package-manager';
import { initializeColorEditor } from './components/color-editor';
import type { AISettings } from './types';
import { normalizeExportRoot } from './export/export-paths';

let previewTemplatesLoaded = false;

export function applyUiTheme(mode: 'dark' | 'light' = 'dark') {
  document.body.dataset.uiTheme = mode;
}

export function collapseProjectSidebar() {
  const projectSidebar = document.getElementById('projectSidebar');
  if (projectSidebar) {
    projectSidebar.classList.add('collapsed');
    projectSidebar.style.removeProperty('width');
    projectSidebar.style.removeProperty('min-width');
  }
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  toggleBtn?.querySelector('svg')?.classList.add('flipped');
}

export function expandProjectSidebar() {
  const projectSidebar = document.getElementById('projectSidebar');
  if (projectSidebar) {
    projectSidebar.classList.remove('collapsed');
    projectSidebar.style.removeProperty('width');
    projectSidebar.style.removeProperty('min-width');
  }
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  toggleBtn?.querySelector('svg')?.classList.remove('flipped');
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
    expandProjectSidebar();
    setChatPanelWidth(null);
    return;
  }

  if (activeTabId === 'mainPageTab') {
    collapseProjectSidebar();
    setChatPanelWidth(372);
    return;
  }

  expandProjectSidebar();
  setChatPanelWidth(null);
}

export function expandPreview() {
  const previewPanel = document.getElementById('previewPanel');
  if (!previewPanel) return;
  previewPanel.classList.add('expanded');

  if (!previewTemplatesLoaded) {
    loadDefaultTemplates();
    previewTemplatesLoaded = true;
  }
  requestAnimationFrame(() => (window as any).resizePreview?.());
}

export function collapsePreview() {
  const previewPanel = document.getElementById('previewPanel');
  if (previewPanel) previewPanel.classList.remove('expanded');
  syncWorkbenchLayoutForActiveTab(false, 'loginTab');
}

export function setupResizableDivider() {
  const sidebarDivider = document.getElementById('sidebarDivider') as HTMLElement;
  const previewDivider = document.getElementById('previewDivider') as HTMLElement;
  const projectSidebar = document.getElementById('projectSidebar') as HTMLElement;
  const previewPanel = document.getElementById('previewPanel') as HTMLElement;
  const chatPanel = document.getElementById('chatPanel') as HTMLElement;

  if (!sidebarDivider || !previewDivider || !projectSidebar || !previewPanel || !chatPanel) return;
  let isResizing = false;
  let activeDivider: 'sidebar' | 'preview' | null = null;
  let startX: number;
  let startWidth: number;

  sidebarDivider.addEventListener('mousedown', (e) => {
    isResizing = true;
    activeDivider = 'sidebar';
    startX = e.clientX;
    startWidth = projectSidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  previewDivider.addEventListener('mousedown', (e) => {
    isResizing = true;
    activeDivider = 'preview';
    startX = e.clientX;
    startWidth = chatPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const delta = e.clientX - startX;
    if (activeDivider === 'sidebar') {
      const newWidth = startWidth + delta;
      if (newWidth >= 180 && newWidth <= 360) {
        projectSidebar.classList.remove('collapsed');
        projectSidebar.style.width = `${newWidth}px`;
        projectSidebar.style.minWidth = `${newWidth}px`;
      }
      return;
    }

    if (activeDivider === 'preview') {
      const newWidth = startWidth + delta;
      if (newWidth >= 280 && newWidth <= 520) {
        setChatPanelWidth(newWidth);
        previewPanel.style.flex = '1 1 auto';
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      activeDivider = null;
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
    indicator.style.width = btn.offsetWidth + 'px';
  }

  TAB_MAP.forEach(tabInfo => {
    const { btnId, pageId, templateId } = tabInfo;
    const btn = document.getElementById(btnId) as HTMLButtonElement;
    const page = document.getElementById(pageId) as HTMLElement;
    if (!btn || !page) return;

    if (btnId === 'loginTab') {
      btn.classList.add('active-tab');
      page.classList.add('active-preview');
      activeTabInfo = { btn, page, templateId };
      requestAnimationFrame(() => moveIndicator(btn));
    }

    btn.addEventListener('click', async () => {
      if (activeTabInfo.btn === btn) return;
      activeTabInfo.btn?.classList.remove('active-tab');
      activeTabInfo.page?.classList.remove('active-preview');
      btn.classList.add('active-tab');
      page.classList.add('active-preview');
      activeTabInfo = { btn, page, templateId };
      moveIndicator(btn);
      if (!page.firstElementChild) await renderTemplate(templateId, page);
      requestAnimationFrame(() => (window as any).resizePreview?.());
    });
  });
}

export function setupCollapsibleColorPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;
  const projectSidebar = document.getElementById('projectSidebar');

  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Panel toggle elements not found');
    return;
  }

  let prePanelState: { sidebarCollapsed: boolean; chatWidth: string; chatFlex: string; chatMinWidth: string } | null = null;

  function openPanel() {
    if (appContainer.classList.contains('panel-open')) return;
    const chatPanel = document.getElementById('chatPanel') as HTMLElement;
    prePanelState = {
      sidebarCollapsed: projectSidebar?.classList.contains('collapsed') ?? false,
      chatWidth: chatPanel?.style.width ?? '',
      chatFlex: chatPanel?.style.flex ?? '',
      chatMinWidth: chatPanel?.style.minWidth ?? '',
    };
    collapseProjectSidebar();
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
      if (!prePanelState.sidebarCollapsed) expandProjectSidebar();
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

export function setupSettingsDialog() {
  const settingsBtn = document.getElementById('sidebarSettingsBtn');
  const settingsModal = document.getElementById('settingsModal') as HTMLElement;
  const closeModalBtn = settingsModal.querySelector('.modal-close-btn') as HTMLElement;
  const saveBtn = document.getElementById('saveSettings') as HTMLButtonElement;
  const cancelBtn = document.getElementById('cancelSettings') as HTMLButtonElement;

  if (!settingsBtn || !settingsModal || !closeModalBtn || !saveBtn || !cancelBtn) {
    console.error('Settings modal elements not found');
    return;
  }

  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    loadStoredSettings();
  });

  closeModalBtn.addEventListener('click', closeSettingsDialog);
  cancelBtn.addEventListener('click', closeSettingsDialog);
  saveBtn.addEventListener('click', saveSettingsForm);

  function closeSettingsDialog() { settingsModal.classList.remove('active'); }

  function loadStoredSettings() {
    const settings = loadSettings() as AISettings & { modelName?: string; imageModelName?: string };
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    const imageApiEndpointInput = document.getElementById('imageApiEndpoint') as HTMLInputElement;
    const imageApiKeyInput = document.getElementById('imageApiKey') as HTMLInputElement;
    const imageModelNameInput = document.getElementById('imageModelName') as HTMLInputElement;
    const exportRootInput = document.getElementById('exportRoot') as HTMLInputElement;
    const uiThemeSelect = document.getElementById('uiThemeMode') as HTMLSelectElement;

    if (apiEndpointInput) apiEndpointInput.value = settings.apiEndpoint || DEFAULT_CHAT_ENDPOINT;
    if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
    if (modelNameInput) modelNameInput.value = settings.modelName || settings.model || 'qwen3.6-plus';
    if (imageApiEndpointInput) imageApiEndpointInput.value = settings.imageApiEndpoint || DEFAULT_IMAGE_ENDPOINT;
    if (imageApiKeyInput) imageApiKeyInput.value = settings.imageApiKey || '';
    if (imageModelNameInput) imageModelNameInput.value = settings.imageModelName || settings.imageModel || 'image-01';
    if (exportRootInput) exportRootInput.value = settings.exportRoot || '';
    if (uiThemeSelect) uiThemeSelect.value = settings.uiTheme || 'dark';
  }

  function saveSettingsForm() {
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    const imageApiEndpointInput = document.getElementById('imageApiEndpoint') as HTMLInputElement;
    const imageApiKeyInput = document.getElementById('imageApiKey') as HTMLInputElement;
    const imageModelNameInput = document.getElementById('imageModelName') as HTMLInputElement;
    const exportRootInput = document.getElementById('exportRoot') as HTMLInputElement;
    const uiThemeSelect = document.getElementById('uiThemeMode') as HTMLSelectElement;

    if (!apiEndpointInput || !apiKeyInput || !modelNameInput) return;

    const settings = {
      apiEndpoint: apiEndpointInput.value || DEFAULT_CHAT_ENDPOINT,
      apiKey: apiKeyInput.value,
      model: modelNameInput.value,
      modelName: modelNameInput.value,
      imageApiEndpoint: imageApiEndpointInput?.value || DEFAULT_IMAGE_ENDPOINT,
      imageApiKey: imageApiKeyInput?.value || '',
      imageModel: imageModelNameInput?.value || 'image-01',
      imageModelName: imageModelNameInput?.value || 'image-01',
      exportRoot: normalizeExportRoot(exportRootInput?.value || ''),
      uiTheme: (uiThemeSelect?.value as 'dark' | 'light') || 'dark',
    };

    persistSettings(settings as any);
    applyUiTheme(settings.uiTheme as 'dark' | 'light');
    settingsModal.classList.remove('active');
    showNotification('设置已保存');
  }
}

export function setupProjectActionMenu(deps: { populateSidebarProjects: () => void; showWorkspace: (id: string) => void }) {
  const actionBtn = document.getElementById('projectActionBtn');
  const actionMenu = document.getElementById('projectActionMenu');
  const actionRename = document.getElementById('actionRename');
  const actionPin = document.getElementById('actionPin');
  const actionDelete = document.getElementById('actionDelete');

  if (!actionBtn || !actionMenu) return;

  actionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const project = getCurrentProjectId() ? loadProject(getCurrentProjectId()!) : null;
    if (actionPin && project) actionPin.textContent = project.pinned ? '取消置顶' : '置顶';
    actionMenu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!actionMenu.contains(e.target as Node) && e.target !== actionBtn) {
      actionMenu.classList.remove('active');
    }
  });

  if (actionRename) {
    actionRename.addEventListener('click', () => {
      actionMenu.classList.remove('active');
      if (!getCurrentProjectId()) return;
      const project = loadProject(getCurrentProjectId()!);
      if (!project) return;
      const newName = prompt('重命名项目', project.name);
      if (newName && newName.trim()) {
        project.name = newName.trim();
        saveProject(project);
        updateProjectNameDisplay(project);
        deps.populateSidebarProjects();
      }
    });
  }

  if (actionPin) {
    actionPin.addEventListener('click', () => {
      actionMenu.classList.remove('active');
      if (!getCurrentProjectId()) return;
      const project = loadProject(getCurrentProjectId()!);
      if (!project) return;
      project.pinned = !project.pinned;
      saveProject(project);
      deps.populateSidebarProjects();
    });
  }

  if (actionDelete) {
    actionDelete.addEventListener('click', () => {
      actionMenu.classList.remove('active');
      if (!getCurrentProjectId()) return;
      const project = loadProject(getCurrentProjectId()!);
      if (!project) return;
      if (!confirm(`确定删除项目「${project.name}」？`)) return;
      deleteProject(getCurrentProjectId()!);
      const projects = listProjects();
      if (projects.length > 0) {
        deps.showWorkspace(projects[0].id);
      } else {
        const newProj = createProject('未命名项目', 'light-ui');
        if (newProj) deps.showWorkspace(newProj.id);
      }
      deps.populateSidebarProjects();
    });
  }
}
