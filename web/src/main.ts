import { initializeColorEditor, syncColorEditorFromTheme } from './components/color-editor';
import {
  getCurrentProjectId,
  setCurrentProjectId,
  createProject,
  loadProject,
  saveProject,
  getProjectThemeLabel,
  populateSidebarProjects,
  closeAllProjectMenus,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck } from './theme-engine';
import { loadAndRenderChatHistory, setupChatInterface } from './chat-manager';
import { setupMainActions, showNotification } from './package-manager';
import {
  expandPreview,
  collapsePreview,
  collapseProjectSidebar,
  expandProjectSidebar,
  setChatPanelWidth,
  syncWorkbenchLayoutForActiveTab,
  applyUiTheme,
  setupTabSwitching,
  setupResizableDivider,
  setupPreviewPanel,
  setupCollapsibleColorPanel,
  setupSettingsDialog,
  setupProjectActionMenu,
} from './ui-setup';
import { loadDefaultTemplates } from './theme-engine';
import { loadSettings } from './agent/chat-client';

declare global {
  interface Window {
    currentTheme: any;
  }
}

function showWorkspace(projectId: string): void {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;

  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');

  setCurrentProjectId(projectId);

  const previewPanel = document.getElementById('previewPanel');
  if (previewPanel) previewPanel.removeAttribute('style');

  const project = loadProject(projectId);
  if (project) {
    applyTemplateSpecificThemeVars(project.templateType);
    const projectNameElement = document.getElementById('projectName');
    if (projectNameElement) projectNameElement.textContent = getProjectThemeLabel(project);
    const chatProjectName = document.getElementById('chatProjectName');
    if (chatProjectName) chatProjectName.textContent = project.name;

    if (project.colors && Object.keys(project.colors).length > 0) {
      for (const [key, value] of Object.entries(project.colors)) {
        const cssVar = key.startsWith('--') ? key : `--${key}`;
        if (/^#[0-9a-fA-F]{6}$/.test(value)) setThemeVar(cssVar, value);
      }
      if (project.bgImageUrl) {
        applyThemeImageAssignments('login', project.bgImageUrl);
        applyThemeImageAssignments('desktop', project.bgImageUrl);
      }
      if (project.headerBgImageUrl) {
        setThemeVar('--theme-header-bg-image', `url('${project.headerBgImageUrl}')`);
      }
      syncColorEditorFromTheme();
      expandPreview();
      syncWorkbenchLayoutForActiveTab(true, 'mainPageTab');
      document.getElementById('loginTab')?.classList.remove('active-tab');
      document.getElementById('loginPage')?.classList.remove('active-preview');
      document.getElementById('mainPageTab')?.classList.add('active-tab');
      document.getElementById('mainPage')?.classList.add('active-preview');
    } else {
      syncColorEditorFromTheme();
      collapsePreview();
      syncWorkbenchLayoutForActiveTab(false, 'loginTab');
    }
  }

  loadAndRenderChatHistory(messagesContainer);
}

function runHealthCheck() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  checks.push({ name: 'CSS 变量', ok: !!getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(), detail: '主题色 CSS 变量未加载' });
  checks.push({ name: '聊天输入框', ok: !!document.getElementById('messageInput'), detail: 'messageInput 元素缺失' });
  checks.push({ name: '预览面板', ok: !!document.getElementById('previewPanel'), detail: 'previewPanel 元素缺失' });
  checks.push({ name: '打包弹窗', ok: !!document.getElementById('packageModal'), detail: 'packageModal 元素缺失' });
  const failed = checks.filter(c => !c.ok);
  if (failed.length > 0) console.warn('[Health Check] Failed:', failed.map(c => `${c.name}: ${c.detail}`).join('; '));
  else console.log('[Health Check] All passed');
}

function initializeRoutingModule() {
  showWorkspaceDirectly();
  const newProjectBtn = document.getElementById('newProjectBtn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      const project = createProject('未命名项目', 'light-ui');
      if (!project) return;
      showWorkspace(project.id);
      collapsePreview();
      syncWorkbenchLayoutForActiveTab(false, 'loginTab');
      const projectNameElement = document.getElementById('projectName');
      if (projectNameElement) projectNameElement.textContent = getProjectThemeLabel(project);
    });
  }
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const projectSidebar = document.getElementById('projectSidebar');
  if (sidebarToggleBtn && projectSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      const collapsed = projectSidebar.classList.contains('collapsed');
      if (collapsed) expandProjectSidebar();
      else collapseProjectSidebar();
    });
  }
  populateSidebarProjects({ showWorkspace, createProject: (n, t) => createProject(n, t) });
}

function showWorkspaceDirectly(): void {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  const storedId = localStorage.getItem('theme-studio-current-project');
  expandProjectSidebar();
  setChatPanelWidth(null);
  if (storedId) {
    showWorkspace(storedId);
  } else {
    const defaultProject = createProject('未命名项目', 'light-ui');
    if (defaultProject) showWorkspace(defaultProject.id);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  runHealthCheck();
  applyUiTheme(loadSettings().uiTheme || 'dark');
  hydrateHeaderSelectOptions();
  initializeColorEditor();
  initializeFeatureModules();
  initializeRoutingModule();
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sidebar-project-menu') && !target.closest('.sidebar-project-menu-btn')) {
      closeAllProjectMenus();
    }
  });
});

function initializeFeatureModules() {
  setupTabSwitching();
  setupChatInterface({ expandPreview, populateSidebarProjects: () => populateSidebarProjects({ showWorkspace, createProject: (n, t) => createProject(n, t) }), syncLayout: syncWorkbenchLayoutForActiveTab, collapseProjectSidebar, setChatPanelWidth });
  setupCollapsibleColorPanel();
  setupSettingsDialog();
  setupProjectActionMenu({
    populateSidebarProjects: () => populateSidebarProjects({ showWorkspace, createProject: (n, t) => createProject(n, t) }),
    showWorkspace,
  });
  setupMainActions();
  setupResizableDivider();
  setupQualityCheck();
  setupPreviewPanel();
}
