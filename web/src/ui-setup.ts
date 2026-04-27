import { renderTemplate } from './templates/loader';
import { getCurrentProjectId } from './project-manager';
import {
  loadSettings,
  saveSettings as persistSettings,
  DEFAULT_CHAT_ENDPOINT,
  DEFAULT_IMAGE_ENDPOINT,
  describeChatEndpointUsage,
} from './agent/chat-client';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { setupChatInterface } from './chat-manager';
import { showNotification, setupMainActions } from './package-manager';
import { initializeColorEditor } from './components/color-editor';
import type { AISettings } from './types';
import { normalizeExportRoot } from './export/export-paths';
import { pickDirectoryViaBridge } from './export/export-bridge';
import { getEffectiveExportRoot } from './agent/chat-client';
import { fetchUsers, getUser, switchUser } from './auth';

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

  if (activeTabId === 'mainPageTab') {
    setChatPanelWidth(372);
    return;
  }

  setChatPanelWidth(null);
}

export function expandPreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container');
  if (!previewPanel) return;
  previewPanel.classList.add('expanded');
  appContainer?.classList.add('preview-open');

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

  function syncActiveIndicator() {
    if (activeTabInfo.btn) moveIndicator(activeTabInfo.btn);
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
      requestAnimationFrame(() => {
        moveIndicator(btn);
        requestAnimationFrame(() => moveIndicator(btn));
      });
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
    const accountSelector = document.getElementById('accountSelector') as HTMLSelectElement;
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    const imageApiEndpointInput = document.getElementById('imageApiEndpoint') as HTMLInputElement;
    const imageApiKeyInput = document.getElementById('imageApiKey') as HTMLInputElement;
    const imageModelNameInput = document.getElementById('imageModelName') as HTMLInputElement;
    const exportRootInput = document.getElementById('exportRoot') as HTMLInputElement;
    const uiThemeSelect = document.getElementById('uiThemeMode') as HTMLSelectElement;
    const currentUser = getUser();

    if (accountSelector) {
      fetchUsers().then(users => {
        accountSelector.innerHTML = users
          .map(user => `<option value="${user.name}">${user.display_name}</option>`)
          .join('');
        if (currentUser?.name) accountSelector.value = currentUser.name;
      }).catch(() => {
        if (currentUser?.name) accountSelector.value = currentUser.name;
      });
    }

    if (apiEndpointInput) apiEndpointInput.value = settings.apiEndpoint || DEFAULT_CHAT_ENDPOINT;
    if (apiKeyInput) apiKeyInput.value = ''; // Server holds the key
    if (modelNameInput) modelNameInput.value = settings.modelName || settings.model || 'MiniMax-M2.7';
    if (imageApiEndpointInput) imageApiEndpointInput.value = settings.imageApiEndpoint || DEFAULT_IMAGE_ENDPOINT;
    if (imageApiKeyInput) imageApiKeyInput.value = ''; // Server holds the key
    if (imageModelNameInput) imageModelNameInput.value = settings.imageModelName || settings.imageModel || 'image-01';
    if (exportRootInput) {
      exportRootInput.value = settings.exportRoot || '';
      exportRootInput.placeholder = getEffectiveExportRoot();
    }
    if (uiThemeSelect) uiThemeSelect.value = 'light';
    updateChatEndpointHelp(apiEndpointInput?.value || DEFAULT_CHAT_ENDPOINT);
    
    // Hide API key rows — server holds the keys now
    const apiKeyRow = apiKeyInput?.closest('.form-row') as HTMLElement;
    if (apiKeyRow) apiKeyRow.style.display = 'none';
    const imageApiKeyRow = imageApiKeyInput?.closest('.form-row') as HTMLElement;
    if (imageApiKeyRow) imageApiKeyRow.style.display = 'none';
    const apiEndpointRow = apiEndpointInput?.closest('.form-row') as HTMLElement;
    if (apiEndpointRow) apiEndpointRow.style.display = 'none';
    const modelNameRow = modelNameInput?.closest('.form-row') as HTMLElement;
    if (modelNameRow) modelNameRow.style.display = 'none';
  }

  function updateChatEndpointHelp(endpoint: string) {
    const helpEl = document.getElementById('apiEndpointHelp');
    if (!helpEl) return;
    const message = describeChatEndpointUsage(endpoint || DEFAULT_CHAT_ENDPOINT);
    helpEl.textContent = message;
    helpEl.dataset.status = message.includes('将通过内置 /api/chat 代理') || message.includes('将直接请求这个完整地址')
      ? 'ok'
      : 'warn';
  }

  const chooseExportRootBtn = document.getElementById('chooseExportRootBtn') as HTMLButtonElement | null;
  chooseExportRootBtn?.addEventListener('click', async () => {
    const exportRootInput = document.getElementById('exportRoot') as HTMLInputElement | null;
    try {
      const pickedPath = await pickDirectoryViaBridge(window);
      if (!pickedPath) {
        showNotification('当前本地桥接尚未提供目录选择能力，请先手动填写导出根目录');
        return;
      }
      if (exportRootInput) exportRootInput.value = normalizeExportRoot(pickedPath);
    } catch {
      showNotification('目录选择失败，请确认本地导出桥接已启动，或先手动填写导出根目录');
    }
  });

  async function saveSettingsForm() {
    const accountSelector = document.getElementById('accountSelector') as HTMLSelectElement;
    const uiThemeSelect = document.getElementById('uiThemeMode') as HTMLSelectElement;
    const exportRootInput = document.getElementById('exportRoot') as HTMLInputElement | null;

    const settings = {
      apiEndpoint: DEFAULT_CHAT_ENDPOINT,
      apiKey: '',
      model: 'MiniMax-M2.7',
      modelName: 'MiniMax-M2.7',
      imageApiEndpoint: DEFAULT_IMAGE_ENDPOINT,
      imageApiKey: '',
      imageModel: 'image-01',
      imageModelName: 'image-01',
      exportRoot: exportRootInput?.value ? normalizeExportRoot(exportRootInput.value) : '',
      uiTheme: 'light',
    };

    const currentUser = getUser();
    const selectedAccount = accountSelector?.value;
    persistSettings(settings as any);
    applyUiTheme('light');

    if (selectedAccount && selectedAccount !== currentUser?.name) {
      const users = await fetchUsers();
      const selectedUser = users.find(user => user.name === selectedAccount);
      if (selectedUser) {
        switchUser(selectedUser);
        return;
      }
    }

    settingsModal.classList.remove('active');
    showNotification('设置已保存');
  }

  const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement | null;
  apiEndpointInput?.addEventListener('input', () => {
    updateChatEndpointHelp(apiEndpointInput.value || DEFAULT_CHAT_ENDPOINT);
  });
}
