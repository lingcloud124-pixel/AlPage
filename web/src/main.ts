import { initializeColorEditor, syncColorEditorFromTheme } from './components/color-editor';
import {
  getCurrentProjectId,
  setCurrentProjectId,
  createProject,
  loadProject,
  listProjects,
  saveProject,
  getProjectThemeLabel,
  populateSidebarProjects,
  closeAllProjectMenus,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, resetThemeTargetStyles } from './theme-engine';
import { loadAndRenderChatHistory, setupChatInterface, showDefaultChatView } from './chat-manager';
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
import { checkAuth } from './auth';
import { pickFallbackWorkspaceProject } from './workspace-recovery';

declare global {
  interface Window {
    currentTheme: any;
  }
}

async function showWorkspace(projectId: string): Promise<void> {
  const project = await loadProject(projectId);
  if (!project) {
    await recoverMissingWorkspaceProject(projectId);
    return;
  }

  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  const messagesContainer = document.getElementById('messagesContainer') as HTMLElement;

  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');

  setCurrentProjectId(projectId);

  const previewPanel = document.getElementById('previewPanel');
  if (previewPanel) previewPanel.removeAttribute('style');

  resetThemeTargetStyles();
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
    showDefaultChatView();
  }

  await loadAndRenderChatHistory(messagesContainer);
}

async function recoverMissingWorkspaceProject(missingProjectId: string): Promise<void> {
  if (localStorage.getItem('theme-studio-current-project') === missingProjectId || getCurrentProjectId() === missingProjectId) {
    setCurrentProjectId(null);
  }

  const recovery = await pickFallbackWorkspaceProject(missingProjectId, {
    listProjects,
    createProject,
  });

  if (recovery.project) {
    showNotification(
      recovery.reason === 'created'
        ? '当前项目不存在，已自动创建新项目'
        : '当前项目不存在，已自动切换到最近的可用项目',
    );
    await showWorkspace(recovery.project.id);
    return;
  }

  showNotification('当前项目不存在，请刷新页面后重试');
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

async function initializeFeatureModules() {
  setupTabSwitching();
  setupChatInterface({ expandPreview, populateSidebarProjects: async () => await populateSidebarProjects({ showWorkspace, createProject }), syncLayout: syncWorkbenchLayoutForActiveTab, collapseProjectSidebar, setChatPanelWidth });
  setupCollapsibleColorPanel();
  setupSettingsDialog();
  setupProjectActionMenu({
    populateSidebarProjects: async () => await populateSidebarProjects({ showWorkspace, createProject }),
    showWorkspace,
  });
  setupMainActions();
  setupResizableDivider();
  setupQualityCheck();
  setupPreviewPanel();
}

async function initializeRoutingModule() {
  await showWorkspaceDirectly();
  const newProjectBtn = document.getElementById('newProjectBtn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', async () => {
      const project = await createProject('未命名项目', 'light-ui');
      if (!project) return;
      await showWorkspace(project.id);
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
  await populateSidebarProjects({ showWorkspace, createProject: (n, t) => createProject(n, t) });
}

async function showWorkspaceDirectly(): Promise<void> {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  const storedId = localStorage.getItem('theme-studio-current-project');
  expandProjectSidebar();
  setChatPanelWidth(null);
  if (storedId) {
    const project = await loadProject(storedId);
    if (project) {
      await showWorkspace(storedId);
    } else {
      localStorage.removeItem('theme-studio-current-project');
      const defaultProject = await createProject('未命名项目', 'light-ui');
      if (defaultProject) await showWorkspace(defaultProject.id);
    }
  } else {
    const defaultProject = await createProject('未命名项目', 'light-ui');
    if (defaultProject) await showWorkspace(defaultProject.id);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const isAuth = await checkAuth();
    if (!isAuth) {
      window.location.href = '/login.html';
      return;
    }

    runHealthCheck();
    applyUiTheme(loadSettings().uiTheme || 'dark');
    hydrateHeaderSelectOptions();
    initializeColorEditor();
    await initializeFeatureModules();
    await initializeRoutingModule();
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sidebar-project-menu') && !target.closest('.sidebar-project-menu-btn')) {
        closeAllProjectMenus();
      }
    });
  } catch (error) {
    console.error('Initialization failed:', error);
    window.location.href = '/login.html';
  }
});
