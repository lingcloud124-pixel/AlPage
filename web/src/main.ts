import { initializeColorEditor } from './components/color-editor';
import { chatCompletion, loadSettings, parseToolCallsFromContent } from './agent/chat-client';
import { getSystemPrompt } from './agent/system-prompt';
import { loadUserPreferences, extractPreferencesFromMessage, saveUserPreferences, trackPresetUsage, trackProjectCreated } from './agent/user-preferences';
import { executeTool } from './tools/executor';
import { renderTemplate } from './templates/loader';
import { buildPackages, downloadPackage } from './packaging/package-builder';
import type { ChatMessage } from './types';

declare global {
  interface Window {
    currentTheme: any;
  }
}

interface Project {
  id: string;
  name: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImage?: string;
  createdAt: number;
  updatedAt: number;
}

const conversationHistory: ChatMessage[] = [];
let currentProjectId: string | null = null;

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

function saveChatHistory(): void {
  if (!currentProjectId) return;
  
  try {
    const key = `theme-studio-chat-${currentProjectId}`;
    const toSave = conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
    }));
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

function loadChatHistory(): Array<{ role: string; content: string; timestamp: number }> {
  if (!currentProjectId) return [];
  
  try {
    const key = `theme-studio-chat-${currentProjectId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load chat history:', e);
    return [];
  }
}

function renderMessage(role: 'user' | 'ai', content: string): HTMLElement {
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
  if (!messagesContainer) return document.createElement('div');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.innerHTML = role === 'ai' 
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageDiv;
}

document.addEventListener('DOMContentLoaded', () => {
  runHealthCheck();
  initializeColorEditor();
  initializeFeatureModules();
  initializeRoutingModule();
});

function runHealthCheck() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  checks.push({
    name: 'CSS 变量',
    ok: !!getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
    detail: '主题色 CSS 变量未加载',
  });

  const chatInput = document.getElementById('chatInput');
  checks.push({
    name: '聊天输入框',
    ok: !!chatInput,
    detail: 'chatInput 元素缺失',
  });

  const previewPanel = document.getElementById('previewPanel');
  checks.push({
    name: '预览面板',
    ok: !!previewPanel,
    detail: 'previewPanel 元素缺失',
  });

  const modal = document.getElementById('packageModal');
  checks.push({
    name: '打包弹窗',
    ok: !!modal,
    detail: 'packageModal 元素缺失',
  });

  const failed = checks.filter(c => !c.ok);
  if (failed.length > 0) {
    console.warn('[Health Check] Failed:', failed.map(c => `${c.name}: ${c.detail}`).join('; '));
  } else {
    console.log('[Health Check] All passed');
  }
}

function initializeRoutingModule() {
  showWorkspaceDirectly();
  
  const newProjectBtn = document.getElementById('newProjectBtn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      const project = createProject('未命名项目', 'light-ui');
      if (project) {
        showWorkspace(project.id);
        populateSidebarProjects();
      }
    });
  }
  
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const projectSidebar = document.getElementById('projectSidebar');
  if (sidebarToggleBtn && projectSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      projectSidebar.classList.toggle('collapsed');
    });
  }
  
  populateSidebarProjects();
}

function showWorkspaceDirectly(): void {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  
  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');

  const currentProjectId = localStorage.getItem('theme-studio-current-project');
  
  if (currentProjectId) {
    showWorkspace(currentProjectId);
  } else {
    const defaultProject = createProject('未命名项目', 'light-ui');
    if (defaultProject) {
      showWorkspace(defaultProject.id);
    }
  }
}

function populateSidebarProjects() {
  const sidebarProjectList = document.getElementById('sidebarProjectList');
  if (!sidebarProjectList) return;
  
  sidebarProjectList.innerHTML = '';
  
  const projects = listProjects();
  
  if (projects.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = '暂无历史项目';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.color = 'rgba(255,255,255,0.5)';
    emptyMessage.style.fontStyle = 'italic';
    emptyMessage.style.margin = '20px 0';
    sidebarProjectList.appendChild(emptyMessage);
    return;
  }
  
  projects.forEach(project => {
    const projectItem = document.createElement('div');
    projectItem.className = 'sidebar-project-item';
    projectItem.title = project.name;
    projectItem.textContent = project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name;
    
    const currentProjectId = localStorage.getItem('theme-studio-current-project');
    if (currentProjectId === project.id) {
      projectItem.classList.add('active');
    }
    
    projectItem.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-project-item').forEach(item => {
        item.classList.remove('active');
      });
      projectItem.classList.add('active');
      
      showWorkspace(project.id);
    });
    
    sidebarProjectList.appendChild(projectItem);
  });
}

function showWorkspace(projectId: string): void {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
  
  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  
  currentProjectId = projectId;
  localStorage.setItem('theme-studio-current-project', projectId);
  
  const project = loadProject(projectId);
  if (project) {
    const projectNameElement = document.getElementById('projectName');
    if (projectNameElement) {
      projectNameElement.textContent = project.name;
      
      projectNameElement.setAttribute('contenteditable', 'true');
      projectNameElement.addEventListener('blur', () => {
        project.name = projectNameElement.textContent || projectNameElement.textContent || '未命名项目';
        saveProject(project);
      });
      projectNameElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          projectNameElement.blur();
        }
      });
    }
  }
  
  loadAndRenderChatHistory(messagesContainer);
}

function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): void {
  if (!messagesContainer) return;
  
  messagesContainer.innerHTML = '';
  conversationHistory.length = 0;
  
  const history = loadChatHistory();
  
  history.forEach(msg => {
    const savedMsg: ChatMessage = {
      id: Date.now().toString(),
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    };
    conversationHistory.push(savedMsg);
    renderMessage(msg.role as 'user' | 'ai', msg.content);
  });
  
  if (history.length === 0) {
    renderMessage('ai', '👋 欢迎使用主题工作室！我是您的 AI 助手，可以帮您生成配色方案、调整主题样式。请告诉我您想要什么样的主题风格？');
  }
}

function showNewProjectDialog() {
  let modal = document.getElementById('newProjectModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newProjectModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建新项目</h3>
          <button class="modal-close-btn" id="closeNewProjectModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="projectNameInput">项目名称：</label>
            <input type="text" id="projectNameInput" placeholder="请输入项目名称" />
          </div>
          <div class="form-field">
            <label>模板类型：</label>
            <div class="radio-options">
              <label>
                <input type="radio" name="templateType" value="light-ui" checked /> 
                Light-UI
              </label>
              <label>
                <input type="radio" name="templateType" value="dark-ui" /> 
                Dark-UI
              </label>
            </div>
          </div>
          <div class="form-field">
            <label>快速配色：</label>
            <div class="preset-filter">
              <button class="preset-filter-btn active" data-filter="all">全部</button>
              <button class="preset-filter-btn" data-filter="light-ui">Light-UI</button>
              <button class="preset-filter-btn" data-filter="dark-ui">Dark-UI</button>
            </div>
            <div class="preset-grid" id="presetGrid">
              <!-- JS 动态生成 -->
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="createProjectBtn">创建</button>
          <button id="cancelNewProject">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const closeBtn = document.getElementById('closeNewProjectModal');
  const cancelBtn = document.getElementById('cancelNewProject');
  const createBtn = document.getElementById('createProjectBtn');
  const presetGrid = document.getElementById('presetGrid');
  const presetFilterBtns = document.querySelectorAll('.preset-filter-btn');
  
  // 记录当前选中预设
  let selectedPreset: string | null = null;
  
  // 渲染预设选项
  function renderPresets(filter: string = 'all') {
    if (!presetGrid) return;
    
    presetGrid.innerHTML = '';
    
    const presets = Object.entries(PRESET_DISPLAY).filter(([_, preset]) => {
      if (filter === 'all') return true;
      return preset.type === filter;
    });
    
    presets.forEach(([key, preset]) => {
      const presetCard = document.createElement('div');
      presetCard.className = 'preset-card';
      presetCard.dataset.preset = key;
      presetCard.innerHTML = `
        <div class="preset-color" style="background: ${preset.primary};"></div>
        <span class="preset-label">${preset.label}</span>
      `;
      
      presetCard.addEventListener('click', () => {
        // 移除之前的选中状态
        document.querySelectorAll('.preset-card').forEach(card => {
          card.classList.remove('selected');
        });
        
        // 添加新的选中状态
        presetCard.classList.add('selected');
        
        // 设置所选的预设
        selectedPreset = key;
        
        // 自动切换模板类型(如果预设类型与当前类型不符)
        const selectedType = preset.type;
        const typeRadios = document.querySelectorAll('input[name="templateType"]') as NodeListOf<HTMLInputElement>;
        typeRadios.forEach(radio => {
          if (radio.value === selectedType) {
            radio.checked = true;
          }
        });
      });
      
      presetGrid.appendChild(presetCard);
    });
  }
  
  // 渲染初始预设
  renderPresets('all');
  
  // 绑定筛选事件
  presetFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetFilterBtns.forEach(b => b.classList.remove('active'));
      (btn as HTMLElement).classList.add('active');
      
      const filter = (btn as HTMLElement).dataset.filter;
      if (filter) {
        renderPresets(filter);
      }
    });
  });
  
  const closeModal = () => {
    modal!.classList.remove('active');
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  createBtn?.addEventListener('click', async () => {
    const nameInput = document.getElementById('projectNameInput') as HTMLInputElement;
    const projectName = nameInput?.value.trim();
    
    if (!projectName) {
      alert('请输入项目名称');
      return;
    }
    
    const templateType = document.querySelector('input[name="templateType"]:checked') as HTMLInputElement;
    if (!templateType) {
      alert('请选择模板类型');
      return;
    }
    
    // 创建项目时应用选中的预设
    let project;
    if (selectedPreset) {
      // 从colors/目录获取预设配色
      try {
        const response = await fetch(`/colors/${selectedPreset}.json`);
        if (response.ok) {
          const presetColors = await response.json();
          
          // 创建带预设配色的项目
          project = createProjectWithPreset(
            projectName, 
            templateType.value as 'light-ui' | 'dark-ui',
            presetColors,
            selectedPreset
          );
        } else {
          // 获取失败时使用默认配色
          project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
        }
      } catch {
        // 错误处理：使用默认项目
        project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
      }
    } else {
      project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
    }
    
    if (project) {
      closeModal();
      showWorkspace(project.id);
    }
  });
  
  modal.classList.add('active');
}

function getDefaultColors(): Record<string, string> {
  return {
    '--primary-color': '#2C615C',
    '--primary-color-hover': '#B2FFE6',
    '--alter-color': '#144E48',
    '--header-font-color': '#333333',
    '--auxiliary-gray': '#999999',
    '--body-bg-color': '#F8F8F8'
  };
}

function createProjectWithPreset(name: string, templateType: 'light-ui' | 'dark-ui', presetColors: Record<string, string>, presetId: string): Project | null {
  const id = Date.now().toString();
  
  // 合并默认颜色与预设颜色
  const defaultColors = getDefaultColors();
  const colors = { ...defaultColors, ...presetColors };
  
  // 从预设中获取主色调更新页面样式
  const primaryColor = colors['--primary-color'] || '#2C615C';
  document.documentElement.style.setProperty('--primary-color', primaryColor);
  
  const newProject: Project = {
    id,
    name,
    templateType,
    colors,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 同时保存为对应的预设（可重用）
  localStorage.setItem(`theme-studio-colors-${presetId}`, JSON.stringify(presetColors));
  
  return saveProject(newProject);
}

function createProject(name: string, templateType: 'light-ui' | 'dark-ui'): Project | null {
  const id = Date.now().toString();
  const newProject: Project = {
    id,
    name,
    templateType,
    colors: getDefaultColors(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  trackProjectCreated();
  return saveProject(newProject);
}

function loadProject(id: string): Project | null {
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
  return projects.find(p => p.id === id) || null;
}

function saveProject(project: Project): Project | null {
  project.updatedAt = Date.now();
  
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  try {
    localStorage.setItem('theme-studio-projects', JSON.stringify(projects));
    return project;
  } catch (e) {
    console.error('Failed to save project:', e);
    return null;
  }
}

function listProjects(): Project[] {
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteProject(id: string): boolean {
  try {
    const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
    const filteredProjects = projects.filter(p => p.id !== id);
    localStorage.setItem('theme-studio-projects', JSON.stringify(filteredProjects));
    
    const currentProjectId = localStorage.getItem('theme-studio-current-project');
    if (currentProjectId === id) {
      localStorage.removeItem('theme-studio-current-project');
    }
    
    return true;
  } catch (e) {
    console.error('Failed to delete project:', e);
    return false;
  }
}

function populateHistoryProjects() {
  const projectsList = document.getElementById('projectsList');
  if (!projectsList) return;
  
  projectsList.innerHTML = '';
  
  const projects = listProjects();
  
  if (projects.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = '暂无历史项目';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.color = 'var(--auxiliary-gray)';
    emptyMessage.style.fontStyle = 'italic';
    emptyMessage.style.margin = '20px 0';
    projectsList.appendChild(emptyMessage);
    return;
  }
  
  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.innerHTML = `
      <div class="project-name">
        <span>🎨</span>
        <span></span>
      </div>
      <div class="project-date">${new Date(project.updatedAt).toLocaleString('zh-CN')}</div>
    `;
    const nameSpan = projectCard.querySelector('.project-name span:last-child');
    if (nameSpan) nameSpan.textContent = project.name;
    
    projectCard.addEventListener('click', () => {
      showWorkspace(project.id);
    });
    
    projectsList.appendChild(projectCard);
  });
}

async function loadDefaultTemplates() {
  try {
    const loginTarget = document.getElementById('loginPage');
    const mainTarget = document.getElementById('mainPage');
    const headerDefaultTarget = document.getElementById('headerDefaultPage');
    const headerComplexTarget = document.getElementById('headerComplexPage');
    const headerMenuTarget = document.getElementById('headerMenuPage');
    const headerBannerTarget = document.getElementById('headerBannerPage');
    const sidebarTarget = document.getElementById('sidebarPage');

    if (loginTarget) {
      await renderTemplate('login', loginTarget);
    }
    if (mainTarget) {
      await renderTemplate('desktop', mainTarget);
    }
    if (headerDefaultTarget) {
      await renderTemplate('header-default', headerDefaultTarget);
    }
    if (headerComplexTarget) {
      await renderTemplate('header-complex', headerComplexTarget);
    }
    if (headerMenuTarget) {
      await renderTemplate('header-menu', headerMenuTarget);
    }
    if (headerBannerTarget) {
      await renderTemplate('header-banner', headerBannerTarget);
    }
    if (sidebarTarget) {
      await renderTemplate('sidebar', sidebarTarget);
    }

    requestAnimationFrame(() => {
      (window as any).resizePreview?.();
    });
  } catch (e) {
    console.error('Failed to load templates:', (e as Error).message);
  }
}

async function loadPenFromFile(file: File) {
  try {
    const text = await file.text();
    const penJson = JSON.parse(text);
    console.warn('Pen file import is deprecated. Use native templates instead.', penJson);
  } catch (e) {
    console.error('Failed to load .pen file:', (e as Error).message);
  }
}

function initializeFeatureModules() {
  setupTabSwitching();
  setupChatInterface();
  setupCollapsibleColorPanel();
  setupSettingsDialog();
  setupMainActions();
  setupResizableDivider();
  setupQualityCheck();
  setupPreviewPanel();
}

function setupResizableDivider() {
  const divider = document.getElementById('resizeDivider');
  const chatPanel = document.getElementById('chatPanel');
  if (!divider || !chatPanel) return;

  const appContainer = document.querySelector('.app-container') as HTMLElement;
  if (!appContainer) return;

  let isDragging = false;

  function updateDividerPosition() {
    const panelWidth = chatPanel!.offsetWidth;
    divider!.style.left = (panelWidth - 3) + 'px';
  }

  updateDividerPosition();

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newWidth = Math.max(260, Math.min(e.clientX, window.innerWidth - 420));
    chatPanel!.style.width = newWidth + 'px';
    updateDividerPosition();
    requestAnimationFrame(() => {
      (window as any).resizePreview?.();
    });
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  window.addEventListener('resize', () => {
    updateDividerPosition();
  });
}

let previewTemplatesLoaded = false;

function setupPreviewPanel() {
  const closeBtn = document.getElementById('previewCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', collapsePreview);
  }

  const headerSelect = document.getElementById('headerSelect') as HTMLSelectElement | null;
  if (headerSelect) {
    headerSelect.addEventListener('change', (e) => {
      const selectedHeader = (e.target as HTMLSelectElement).value;
      loadHeaderIntoMainPage(selectedHeader);
    });
  }
}

function expandPreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  if (!previewPanel || !appContainer) return;

  if (!previewPanel.classList.contains('expanded')) {
    previewPanel.classList.add('expanded');
    appContainer.classList.add('preview-open');
    if (!previewTemplatesLoaded) {
      loadDefaultTemplates();
      previewTemplatesLoaded = true;
    }
    requestAnimationFrame(() => {
      (window as any).resizePreview?.();
    });
  }
}

(window as any).expandPreview = expandPreview;
(window as any).collapsePreview = collapsePreview;

function collapsePreview() {
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  if (!previewPanel || !appContainer) return;

  previewPanel.classList.remove('expanded');
  appContainer.classList.remove('preview-open');
}

async function loadHeaderIntoMainPage(headerId: string) {
  const mainPage = document.getElementById('mainPage');
  if (!mainPage) return;

  const firstChild = mainPage.firstElementChild as HTMLElement | null;
  let targetContainer: HTMLElement = mainPage;

  if (firstChild) {
    const headerArea = firstChild.querySelector('.page-header-area, .header-slot, #headerArea') as HTMLElement | null;
    if (headerArea) {
      targetContainer = headerArea;
    }
  }

  await renderTemplate(headerId, targetContainer);
}

function setupTabSwitching() {
  const TAB_MAP = [
    { btnId: 'loginTab', pageId: 'loginPage', templateId: 'login' },
    { btnId: 'mainPageTab', pageId: 'mainPage', templateId: 'desktop' },
  ];

  const headerSwitcher = document.getElementById('headerSwitcher');

  let activeTabInfo = { btn: null as HTMLButtonElement | null, page: null as HTMLElement | null, templateId: '' };

  TAB_MAP.forEach(tabInfo => {
    const { btnId, pageId, templateId } = tabInfo;
    const btn = document.getElementById(btnId) as HTMLButtonElement;
    const page = document.getElementById(pageId) as HTMLElement;

    if (!btn || !page) return;

    if (btnId === 'loginTab') {
      btn.classList.add('active-tab');
      page.classList.add('active-preview');
      activeTabInfo = { btn, page, templateId };
    }

    btn.addEventListener('click', async () => {
      activeTabInfo.btn?.classList.remove('active-tab');
      activeTabInfo.page?.classList.remove('active-preview');

      btn.classList.add('active-tab');
      page.classList.add('active-preview');

      activeTabInfo = { btn, page, templateId };

      if (headerSwitcher) {
        headerSwitcher.style.display = btnId === 'mainPageTab' ? 'flex' : 'none';
      }

      await renderTemplate(templateId, page);
      requestAnimationFrame(() => {
        (window as any).resizePreview?.();
      });
    });
  });
}

function setupChatInterface() {
  const messageInput = document.getElementById('messageInput') as HTMLInputElement;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
  
  if (!messageInput || !sendBtn || !messagesContainer) {
    console.error('Chat elements not found');
    return;
  }

  sendBtn.addEventListener('click', sendUserMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  });
  
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const uploadPenBtn = document.getElementById('uploadPenBtn');
    
    if (uploadImageBtn) {
      uploadImageBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (file) {
            renderMessage('user', `上传了参考图片：${file.name}`);
            saveChatHistory();
            
            const reader = new FileReader();
            reader.onload = async (e) => {
              const dataUrl = e.target?.result as string;
              
              try {
                const { analyzeImageAsync } = await import('./tools/executor');
                const result = await analyzeImageAsync(dataUrl);
                if (result.success && result.data) {
                  const colors = result.data as { dominantColors: string[] };
                  renderMessage('ai', `🎨 图片分析完成，提取到主色调：${colors.dominantColors.join(', ')}\n\n请在对话中告诉 AI "基于这张图片生成配色方案"，AI 将自动计算完整的 OA 主题配色。`);
                  saveChatHistory();
                }
              } catch {
                renderMessage('ai', '⚠️ 图片已接收，但颜色分析失败。请直接描述您想要的配色风格。');
                saveChatHistory();
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      });
    }
    
    if (uploadPenBtn) {
      uploadPenBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pen,.json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (file) {
            renderMessage('user', `上传了 Pen 文件：${file.name}`);
            saveChatHistory();
            await loadPenFromFile(file);
            renderMessage('ai', '✅ .pen 文件已加载到预览区');
            saveChatHistory();
          }
        };
        input.click();
      });
    }
    
    function addMessageToChat(role: 'user' | 'ai', content: string): HTMLElement {
      const messageEl = renderMessage(role, content);
      saveChatHistory();
      return messageEl;
    }

  function sendUserMessage() {
    if (!messageInput || messageInput.value.trim() === '') return;
    
    const content = messageInput.value.trim();
    addMessageToChat('user', content);
    messageInput.value = '';
    
    callAI(content);
  }
  
  async function callAI(userMessage: string) {
    conversationHistory.push({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    const settings = loadSettings();
    if (!settings.apiKey) {
      addMessageToChat('ai', '⚠️ 请先点击右上角 ⚙ 设置按钮，填入您的 API Key 后再开始对话。');
      return;
    }

    const availablePresets = getAvailablePresets();
    const prefs = loadUserPreferences();
    const systemPrompt = getSystemPrompt({
      templateType: 'dark-ui',
      currentColors: getCurrentColors(),
      availablePresets,
      userPreferences: prefs,
      userMessage,
    });

    const extracted = extractPreferencesFromMessage(userMessage);
    if (extracted) {
      saveUserPreferences(extracted);
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
    ];

    const aiMessageEl = addMessageToChat('ai', '');
    const contentEl = aiMessageEl.querySelector('.message-content') as HTMLElement;
    let fullResponse = '';

    if (contentEl) {
      contentEl.classList.add('typing');
      contentEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    }

    try {
      let firstToken = true;
      fullResponse = await chatCompletion(
        { messages, temperature: 0.7 },
        (token) => {
          if (contentEl) {
            if (firstToken) {
              contentEl.classList.remove('typing');
              contentEl.classList.add('streaming');
              contentEl.textContent = '';
              firstToken = false;
            }
            contentEl.textContent += token;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        },
      );
    } catch (e) {
      if (contentEl) {
        contentEl.classList.remove('typing', 'streaming');
        contentEl.textContent = `❌ 请求失败: ${(e as Error).message}`;
      }
      return;
    }

    if (contentEl) {
      contentEl.classList.remove('streaming');
    }

    conversationHistory.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    });
    saveChatHistory();

    const toolCalls = parseToolCallsFromContent(fullResponse);
    const TOOL_GLOBAL_TIMEOUT = 60_000;
    const toolStartTime = Date.now();

    for (const tc of toolCalls) {
      if (Date.now() - toolStartTime > TOOL_GLOBAL_TIMEOUT) {
        addMessageToChat('ai', '⚠️ 工具执行总时长超限，剩余工具已跳过');
        saveChatHistory();
        break;
      }
      try {
        const result = await executeTool(tc);
        if (result.success) {
          const resultStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
          addMessageToChat('ai', `🔧 ${tc.tool}: ${resultStr}`);

          if (tc.tool === 'update_colors') {
            expandPreview();
          }
        } else {
          addMessageToChat('ai', `⚠️ ${tc.tool}: ${result.error ?? '未知错误'}`);
        }
        saveChatHistory();
      } catch (e) {
        addMessageToChat('ai', `❌ ${tc.tool} 执行失败：${(e as Error).message}`);
        saveChatHistory();
      }
    }

    const recommendedPresets = parsePresetRecommendations(fullResponse);
    if (recommendedPresets.length > 0) {
      const presetCards = recommendedPresets
        .filter(key => PRESET_DISPLAY[key])
        .map(key => ({ key, ...PRESET_DISPLAY[key] }));
      if (presetCards.length > 0) {
        addPresetCardsMessage(presetCards);
        saveChatHistory();
      }
    }

    const backgroundCards = parseBackgroundRecommendations(fullResponse);
    if (backgroundCards.length > 0) {
      addBackgroundCardsMessage(backgroundCards);
      saveChatHistory();
    }

    const guideOptions = parseGuideOptions(fullResponse);
    if (guideOptions.length > 0) {
      addGuideCardsMessage(guideOptions);
      saveChatHistory();
    }
  }

  function parsePresetRecommendations(content: string): string[] {
    const keys: string[] = [];
    const regex = /\[preset:(\w[\w-]*)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  }

  function parseBackgroundRecommendations(content: string): string[] {
    const keys: string[] = [];
    const regex = /\[background:(\w[\w-]*)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  }

  function parseGuideOptions(content: string): string[] {
    const regex = /\[guide:(.+?)\]/;
    const match = regex.exec(content);
    if (!match) return [];
    return match[1].split('|').map(s => s.trim()).filter(Boolean);
  }

  function addPresetCardsMessage(cards: Array<{key: string; label: string; primary: string; type: string}>): HTMLElement {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
    if (!messagesContainer) return document.createElement('div');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = '为您推荐以下主题方案，点击即可应用：';

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'preset-cards-container';

    cards.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'preset-card-chat';
      card.innerHTML = `
        <div class="preset-card-swatch" style="background: ${preset.primary};"></div>
        <div class="preset-card-info">
          <span class="preset-card-label">${preset.label}</span>
          <span class="preset-card-type">${preset.type === 'dark-ui' ? '暗色' : '亮色'}</span>
        </div>
      `;
      card.addEventListener('click', async () => {
        try {
          const response = await fetch(`/colors/${preset.key}.json`);
          if (response.ok) {
            const presetColors = await response.json();
            const mappedColors: Record<string, string> = {};
            if (presetColors.colors) {
              const c = presetColors.colors;
              if (c.primary) mappedColors['primary-color'] = c.primary;
              if (c.primaryHover) mappedColors['primary-color-hover'] = c.primaryHover;
              if (c.alterColor) mappedColors['alter-color'] = c.alterColor;
              if (c.alterColorHoverOn) mappedColors['alter-color-hover-on'] = c.alterColorHoverOn;
              if (c.primaryOpacity10) mappedColors['primary-color-opacity-10'] = c.primaryOpacity10;
              if (c.primaryOpacity20) mappedColors['primary-color-opacity-20'] = c.primaryOpacity20;
              if (c.primaryOpacity30) mappedColors['primary-color-opacity-30'] = c.primaryOpacity30;
              if (c.headerFont) mappedColors['header-font-color'] = c.headerFont;
              if (c.sidebarPanelBg) mappedColors['sidebar-panel-bg'] = c.sidebarPanelBg;
              if (c.loginBg) mappedColors['login-bg-color'] = c.loginBg;
            }
            for (const [k, v] of Object.entries(mappedColors)) {
              document.documentElement.style.setProperty(`--${k}`, v);
            }
            if (currentProjectId) {
              const project = loadProject(currentProjectId);
              if (project) {
                project.colors = { ...project.colors, ...mappedColors };
                project.templateType = preset.type === 'dark-ui' ? 'dark-ui' : 'light-ui';
                saveProject(project);
              }
            }
            trackPresetUsage(preset.key);
            applyPresetBackground(preset.key);
            expandPreview();
            cardsContainer.querySelectorAll('.preset-card-chat').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            addMessageToChat('ai', `✅ 已应用「${preset.label}」配色方案`);
            requestAnimationFrame(() => (window as any).resizePreview?.());
          }
        } catch {
          addMessageToChat('ai', `⚠️ 加载「${preset.label}」失败，请重试`);
        }
      });
      cardsContainer.appendChild(card);
    });

    contentDiv.appendChild(cardsContainer);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
  }

  function addBackgroundCardsMessage(bgKeys: string[]): HTMLElement {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
    if (!messagesContainer) return document.createElement('div');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = '为您推荐以下背景图，点击即可应用：';

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'background-cards-container';

    bgKeys.forEach(bgKey => {
      const card = document.createElement('div');
      card.className = 'background-card-chat';

      const ext = (bgKey === 'winter-solstice' || bgKey === 'work-hard') ? 'jpg' : 'png';
      const imgSrc = `/backgrounds/${bgKey}-bg.${ext}`;

      card.innerHTML = `
        <img class="background-card-img" src="${imgSrc}" alt="${bgKey}" loading="lazy" />
        <div class="background-card-info">
          <span class="background-card-name">${bgKey.replace(/-/g, ' ')}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        const bgUrl = `/backgrounds/${bgKey}-bg.${ext}`;
        document.documentElement.style.setProperty('--theme-login-bg-image', `url('${bgUrl}')`);
        expandPreview();
        cardsContainer.querySelectorAll('.background-card-chat').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        addMessageToChat('ai', `✅ 已应用背景图`);
      });

      cardsContainer.appendChild(card);
    });

    contentDiv.appendChild(cardsContainer);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
  }

  function addGuideCardsMessage(options: string[]): HTMLElement {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
    if (!messagesContainer) return document.createElement('div');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = '请选择您想要的主题风格方向：';

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'guide-cards-container';

    options.forEach(option => {
      const card = document.createElement('div');
      card.className = 'guide-card-chat';
      card.textContent = option;
      card.addEventListener('click', () => {
        const input = document.getElementById('messageInput') as HTMLInputElement;
        if (input) {
          input.value = `我想做一个${option}`;
          sendUserMessage();
        }
      });
      cardsContainer.appendChild(card);
    });

    contentDiv.appendChild(cardsContainer);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
  }

  function getCurrentColors(): Record<string, string> {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const vars: Record<string, string> = {};
    const varNames = [
      'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
      'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
      'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
      'body-bg-color', 'login-bg-color', 'panel-bg-color',
      'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
      'border-color', 'border-icon-color',
      'gradient-start', 'gradient-mid',
    ];
    for (const v of varNames) {
      const val = computed.getPropertyValue(`--${v}`).trim();
      if (val) vars[v] = val;
    }
    return vars;
  }
}

const KNOWN_PRESETS = [
  'cherry-blossom', 'basketball-match', 'christmas', 'corporate-blue',
  'dark-ui-spring', 'dragon-boat', 'football-match', 'gaokao',
  'ice-wonderland', 'interstellar', 'mid-autumn', 'mount-tai-summit',
  'national-day', 'qingming', 'spring-festival', 'summer-cool',
  'watermelon-harvest', 'winter-solstice', 'women-day', 'work-hard',
  'childrens-day', '1024', '20th-anniversary', 'dragon-boat-fresh',
  'happy-xishuangbanna', 'maldives-vacation', 'national-day-dark',
  'national-day-generated', 'overtime-worker', 'panda-night',
  'peach-blossom', 'sanya', 'shenergy-enterprise', 'superman-superhero',
  'yellow-duck',
];

const PRESET_DISPLAY: Record<string, { label: string; primary: string; type: string }> = {
  'basketball-match': { label: '🏀 篮球对抗赛', primary: '#F07828', type: 'light-ui' },
  'cherry-blossom': { label: '🌸 樱花', primary: '#E8B4C8', type: 'light-ui' },
  'christmas': { label: '🎄 圣诞节', primary: '#E53935', type: 'light-ui' },
  'corporate-blue': { label: '💼 企业蓝', primary: '#1565C0', type: 'light-ui' },
  'dark-ui-spring': { label: '🌙 暗夜春色', primary: '#4A3F6B', type: 'dark-ui' },
  'dragon-boat': { label: '🐉 端午节', primary: '#2E7D32', type: 'light-ui' },
  'dragon-boat-fresh': { label: '🌿 端午清新', primary: '#4CAF50', type: 'light-ui' },
  'football-match': { label: '⚽ 足球赛', primary: '#2E7D32', type: 'light-ui' },
  'gaokao': { label: '📝 高考', primary: '#1565C0', type: 'light-ui' },
  'ice-wonderland': { label: '❄️ 冰雪世界', primary: '#00ACC1', type: 'light-ui' },
  'interstellar': { label: '🚀 星际', primary: '#311B92', type: 'dark-ui' },
  'mid-autumn': { label: '🌕 中秋', primary: '#FF9800', type: 'light-ui' },
  'mount-tai-summit': { label: '🏔️ 泰山', primary: '#5D4037', type: 'light-ui' },
  'national-day': { label: '🇨🇳 国庆节', primary: '#C62828', type: 'light-ui' },
  'national-day-dark': { label: '🇨🇳 国庆暗色', primary: '#8B1A1A', type: 'dark-ui' },
  'qingming': { label: '🍃 清明', primary: '#7BA894', type: 'light-ui' },
  'spring-festival': { label: '🧨 春节', primary: '#D32F2F', type: 'light-ui' },
  'summer-cool': { label: '🌤️ 夏日清凉', primary: '#00ACC1', type: 'light-ui' },
  'watermelon-harvest': { label: '🍉 西瓜丰收', primary: '#388E3C', type: 'light-ui' },
  'winter-solstice': { label: '❄️ 冬至', primary: '#455A64', type: 'light-ui' },
  'women-day': { label: '💐 妇女节', primary: '#E91E63', type: 'light-ui' },
  'work-hard': { label: '💪 加油干', primary: '#F57C00', type: 'light-ui' },
  'childrens-day': { label: '🎈 儿童节', primary: '#FF9800', type: 'light-ui' },
  '1024': { label: '💻 程序员节', primary: '#6366F1', type: 'light-ui' },
  '20th-anniversary': { label: '🎂 廿周年', primary: '#B8860B', type: 'light-ui' },
  'happy-xishuangbanna': { label: '🌴 西双版纳', primary: '#2E7D32', type: 'light-ui' },
  'maldives-vacation': { label: '🏝️ 马尔代夫', primary: '#00ACC1', type: 'light-ui' },
  'national-day-generated': { label: '🇨🇳 国庆AI', primary: '#C62828', type: 'light-ui' },
  'overtime-worker': { label: '🏢 深夜加班', primary: '#2D3A4A', type: 'dark-ui' },
  'panda-night': { label: '🐼 熊猫夜晚', primary: '#4A3F6B', type: 'dark-ui' },
  'peach-blossom': { label: '🍑 桃花', primary: '#E8B4C8', type: 'light-ui' },
  'sanya': { label: '🏖️ 三亚', primary: '#00BCD4', type: 'light-ui' },
  'shenergy-enterprise': { label: '🏭 申能企业', primary: '#1565C0', type: 'light-ui' },
  'superman-superhero': { label: '🦸 超级英雄', primary: '#BF613F', type: 'light-ui' },
  'yellow-duck': { label: '🐥 小黄鸭', primary: '#FDD835', type: 'light-ui' },
};

const PRESET_BACKGROUNDS: Record<string, string> = {
  'cherry-blossom': '/backgrounds/cherry-blossom-bg.png',
  'peach-blossom': '/backgrounds/cherry-blossom-bg.png',
  'ice-wonderland': '/backgrounds/ice-wonderland-bg.png',
  'interstellar': '/backgrounds/interstellar-bg.png',
  'maldives-vacation': '/backgrounds/maldives-vacation-bg.png',
  'mount-tai-summit': '/backgrounds/mount-tai-summit-bg.png',
  'national-day': '/backgrounds/national-day-bg.png',
  'national-day-dark': '/backgrounds/national-day-bg.png',
  'national-day-generated': '/backgrounds/national-day-bg.png',
  'overtime-worker': '/backgrounds/overtime-worker-bg.png',
  'panda-night': '/backgrounds/panda-night-bg.png',
  'winter-solstice': '/backgrounds/winter-solstice-bg.jpg',
  'qingming': '/backgrounds/qingming-bg.png',
  'work-hard': '/backgrounds/work-hard-bg.jpg',
  'gaokao': '/backgrounds/gaokao-bg.png',
  'childrens-day': '/backgrounds/childrens-day-bg.png',
  'summer-cool': '/backgrounds/maldives-vacation-bg.png',
  'dark-ui-spring': '/backgrounds/panda-night-bg.png',
  'dragon-boat': '/backgrounds/qingming-bg.png',
  'dragon-boat-fresh': '/backgrounds/qingming-bg.png',
  'spring-festival': '/backgrounds/national-day-bg.png',
  'basketball-match': '/backgrounds/work-hard-bg.jpg',
  'football-match': '/backgrounds/work-hard-bg.jpg',
  'watermelon-harvest': '/backgrounds/maldives-vacation-bg.png',
  'sanya': '/backgrounds/maldives-vacation-bg.png',
  'happy-xishuangbanna': '/backgrounds/maldives-vacation-bg.png',
  'women-day': '/backgrounds/cherry-blossom-bg.png',
  'superman-superhero': '/backgrounds/interstellar-bg.png',
  'corporate-blue': '/backgrounds/mount-tai-summit-bg.png',
  'shenergy-enterprise': '/backgrounds/mount-tai-summit-bg.png',
  '20th-anniversary': '/backgrounds/winter-solstice-bg.jpg',
  '1024': '/backgrounds/interstellar-bg.png',
  'yellow-duck': '/backgrounds/childrens-day-bg.png',
};

function applyPresetBackground(presetKey: string): void {
  const bgUrl = PRESET_BACKGROUNDS[presetKey];
  if (bgUrl) {
    document.documentElement.style.setProperty('--theme-login-bg-image', `url('${bgUrl}')`);
    document.documentElement.style.setProperty('--theme-header-bg-image', `url('${bgUrl}')`);
  }
}

function getAvailablePresets(): string[] {
  const saved = Object.keys(localStorage)
    .filter(k => k.startsWith('theme-studio-colors-'))
    .map(k => k.replace('theme-studio-colors-', ''));
  return [...new Set([...KNOWN_PRESETS, ...saved])];
}

function setupQualityCheck() {
  const qcRunBtn = document.getElementById('qcRunBtn');
  if (!qcRunBtn) return;

  qcRunBtn.addEventListener('click', runQualityCheck);
}

function runQualityCheck() {
  const resultsContainer = document.getElementById('qcResults');
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';

  const root = getComputedStyle(document.documentElement);
  
  const checks = [
    { label: '主题文字对比 (primary on white)', fg: root.getPropertyValue('--primary-color').trim(), bg: '#FFFFFF' },
    { label: '标题文字对比 (header-font on body-bg)', fg: root.getPropertyValue('--header-font-color').trim(), bg: root.getPropertyValue('--body-bg-color').trim() },
    { label: '标题文字对比 (header-font on panel)', fg: root.getPropertyValue('--header-font-color').trim(), bg: root.getPropertyValue('--panel-bg-color').trim() || '#FFFFFF' },
    { label: '辅助灰文字对比 (aux-gray on white)', fg: root.getPropertyValue('--auxiliary-gray').trim(), bg: '#FFFFFF' },
    { label: '侧边栏文字对比 (sidebar-color on sidebar-bg)', fg: root.getPropertyValue('--sidebar-color').trim(), bg: root.getPropertyValue('--sidebar-panel-bg').trim() },
    { label: '白色文字对比 (white on primary)', fg: '#FFFFFF', bg: root.getPropertyValue('--primary-color').trim() },
    { label: '白色文字对比 (white on alter)', fg: '#FFFFFF', bg: root.getPropertyValue('--alter-color').trim() },
  ];

  let passCount = 0;
  for (const check of checks) {
    if (!check.fg || !check.bg) continue;
    const ratio = getContrastRatio(check.fg, check.bg);
    const pass = ratio >= 4.5;
    if (pass) passCount++;

    const item = document.createElement('div');
    item.className = 'qc-item';
    item.innerHTML = `
      <span class="qc-label">${check.label}</span>
      <span class="${pass ? 'qc-pass' : 'qc-fail'}">${ratio.toFixed(1)}:1 ${pass ? '✓' : '✗'}</span>
    `;
    resultsContainer.appendChild(item);
  }

  const summary = document.createElement('div');
  summary.style.marginTop = '12px';
  summary.style.fontWeight = '600';
  summary.style.fontSize = '13px';
  summary.style.color = passCount === checks.length ? '#4CAF50' : '#E53935';
  summary.textContent = `${passCount}/${checks.length} 项通过 WCAG AA 标准`;
  resultsContainer.appendChild(summary);
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function setupCollapsibleColorPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;
  
  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Panel toggle elements not found');
    return;
  }
  
  panelToggleBtn.addEventListener('click', () => {
    appContainer.classList.toggle('panel-open');
    sidePanel.classList.toggle('open');
    
    // 更新按钮文本
    if(appContainer.classList.contains('panel-open')) {
      panelToggleBtn.textContent = '收起面板';
    } else {
      panelToggleBtn.textContent = '面板';
    }
  });
  
  if (sidePanelClose) {
    sidePanelClose.addEventListener('click', () => {
      appContainer.classList.remove('panel-open');
      sidePanel.classList.remove('open');
      panelToggleBtn.textContent = '面板'; // 重置按钮文本
    });
  }
}

function setupSettingsDialog() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal') as HTMLElement;
  const closeModalBtn = document.querySelector('.modal-close-btn') as HTMLElement;
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
  
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsDialog();
    }
  });
  
  saveBtn.addEventListener('click', saveSettings);
  
  function closeSettingsDialog() {
    settingsModal.classList.remove('active');
  }
  
  function loadStoredSettings() {
    const settings = safeJsonParse<Record<string, string>>(localStorage.getItem('themeStudioSettings'), {});
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    const imageApiEndpointInput = document.getElementById('imageApiEndpoint') as HTMLInputElement;
    const imageApiKeyInput = document.getElementById('imageApiKey') as HTMLInputElement;
    const imageModelNameInput = document.getElementById('imageModelName') as HTMLInputElement;
    
    if (apiEndpointInput) apiEndpointInput.value = settings.apiEndpoint || 'https://open.bigmodel.cn/api/paas/v4';
    if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
    if (modelNameInput) modelNameInput.value = settings.modelName || 'GLM-4-Flash';
    if (imageApiEndpointInput) imageApiEndpointInput.value = settings.imageApiEndpoint || 'https://open.bigmodel.cn/api/paas/v4';
    if (imageApiKeyInput) imageApiKeyInput.value = settings.imageApiKey || '';
    if (imageModelNameInput) imageModelNameInput.value = settings.imageModelName || 'CogView-4';
  }
  
  function saveSettings() {
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    const imageApiEndpointInput = document.getElementById('imageApiEndpoint') as HTMLInputElement;
    const imageApiKeyInput = document.getElementById('imageApiKey') as HTMLInputElement;
    const imageModelNameInput = document.getElementById('imageModelName') as HTMLInputElement;
    
    if (!apiEndpointInput || !apiKeyInput || !modelNameInput) return;
    
    const settings = {
      apiEndpoint: apiEndpointInput.value,
      apiKey: apiKeyInput.value, 
      modelName: modelNameInput.value,
      imageApiEndpoint: imageApiEndpointInput?.value || 'https://open.bigmodel.cn/api/paas/v4',
      imageApiKey: imageApiKeyInput?.value || '',
      imageModelName: imageModelNameInput?.value || 'CogView-4',
    };
    
    localStorage.setItem('themeStudioSettings', JSON.stringify(settings));
    settingsModal.classList.remove('active');
    showNotification('设置已保存');
  }
}

function setupMainActions() {
  // 设置打包按钮事件监听
  const packageBtn = document.getElementById('packageBtn');
  if (packageBtn) {
    packageBtn.addEventListener('click', showPackageModal);
  }
  
  // 初始化打包弹窗相关事件
  initializePackageModal();
}

const PACKAGE_PRODUCTS = [
  { id: 'mk', label: 'MK（主题+登录）' },
  { id: 'ekp_v12', label: 'EKP V12（主题+登录）' },
  { id: 'ekp_v13_5', label: 'EKP V13~V13.5（主题+登录）' },
  { id: 'ekp_v14_16', label: 'EKP V14~V16（主题+登录）' },
  { id: 'ekp_v17', label: 'EKP V17（主题+登录）' },
];

// 显示打包弹窗
function showPackageModal() {
  const modal = document.getElementById('packageModal');
  if (!modal) {
    console.error('Package modal not found');
    return;
  }
  
  // 生成产品选择复选框列表
  generateProductList();
  
  modal.classList.add('active');
}

// 生成产品列表
function generateProductList() {
  const productList = document.getElementById('packageProductList');
  if (!productList) {
    console.error('Product list container not found');
    return;
  }
  
  productList.innerHTML = '';
  
  PACKAGE_PRODUCTS.forEach(product => {
    const label = document.createElement('label');
    label.className = 'product-item';
    label.innerHTML = `
      <input type="checkbox" id="${product.id}_cb" value="${product.id}">
      <span>${product.label}</span>
    `;
    productList.appendChild(label);
  });
  
  // 绑定全选/不选事件
  bindSelectAllButtons();
}

// 绑定全选/取消全选按钮事件
function bindSelectAllButtons() {
  const selectAllBtn = document.getElementById('packageSelectAll');
  const deselectAllBtn = document.getElementById('packageDeselectAll');
  
  if (selectAllBtn) {
    selectAllBtn.removeEventListener('click', handleSelectAll); // 确保只添加一次listener
    selectAllBtn.addEventListener('click', handleSelectAll);
  }
  
  if (deselectAllBtn) {
    deselectAllBtn.removeEventListener('click', handleDeselectAll); // 确保只添加一次listener
    deselectAllBtn.addEventListener('click', handleDeselectAll);
  }
}

// 处理全选
function handleSelectAll() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]');
  checkboxes.forEach(cb => cb.checked = true);
}

// 处理取消全选
function handleDeselectAll() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]');
  checkboxes.forEach(cb => cb.checked = false);
}

// 初始化打包弹窗事件监听
function initializePackageModal() {
  // 关闭弹窗相关操作
  const modal = document.getElementById('packageModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('packageModalClose');
  const cancelBtn = document.getElementById('packageCancelBtn');
  const startBtn = document.getElementById('packageStartBtn');
  
  // 点击关闭按钮
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePackageModal();
    });
  }
  
  // 点击取消按钮
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closePackageModal();
    });
  }
  
  // 点击开始打包按钮
  if (startBtn) {
    startBtn.addEventListener('click', startPackagingProcess);
  }
  
  // 点击蒙层关闭弹窗
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePackageModal();
    }
  });
}

// 关闭打包弹窗
function closePackageModal() {
  const modal = document.getElementById('packageModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// 开始打包流程
async function startPackagingProcess() {
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement;
  if (startBtn) {
    startBtn.textContent = '打包中...';
    startBtn.disabled = true;
  }

  try {
    const selectedProducts: string[] = [];
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]');

    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedProducts.push(checkbox.value);
      }
    });

    if (selectedProducts.length === 0) {
      showNotification('请至少选择一个产品进行打包');
      if (startBtn) {
        startBtn.textContent = '开始打包';
        startBtn.disabled = false;
      }
      return;
    }

    const vars = getAllCSSVariables();
    const themeColor = vars['primary-color'] || '#2C615C';
    const headerFont = vars['header-font-color'] || '#ffffff';

    showNotification(`正在打包 ${selectedProducts.length} 个产品，请稍候...`);

    const packages = await buildPackages({
      title: currentProjectId
        ? (safeJsonParse<Project[]>(localStorage.getItem('ts_projects'), [])).find(p => p.id === currentProjectId)?.name || '未命名主题'
        : '未命名主题',
      subtitle: '欢迎使用',
      buttonText: '立即进入',
      themeColor,
      headerFont,
      products: selectedProducts,
    });

    if (packages.length === 0) {
      showNotification('打包失败：无法读取模板文件，请确认主题样例包目录存在');
      if (startBtn) {
        startBtn.textContent = '开始打包';
        startBtn.disabled = false;
      }
      return;
    }

    for (const pkg of packages) {
      downloadPackage(pkg.label, pkg.blob);
      await new Promise(r => setTimeout(r, 300));
    }

    showNotification(`打包完成！已导出 ${packages.length} 个 zip 文件`);

    setTimeout(() => {
      closePackageModal();
      if (startBtn) {
        startBtn.textContent = '开始打包';
        startBtn.disabled = false;
      }
    }, 1500);
  } catch (e) {
    showNotification(`打包失败: ${(e as Error).message}`);
    if (startBtn) {
      startBtn.textContent = '开始打包';
      startBtn.disabled = false;
    }
  }
}

function getAllCSSVariables(): Record<string, string> {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const vars: Record<string, string> = {};
  const varNames = [
    'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
    'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
    'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
    'body-bg-color', 'login-bg-color', 'panel-bg-color',
    'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
    'border-color', 'border-icon-color',
    'gradient-start', 'gradient-mid',
  ];
  for (const v of varNames) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) vars[v] = val;
  }
  return vars;
}

function showNotification(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '10px 16px';
  toast.style.backgroundColor = '#333';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '1000';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
