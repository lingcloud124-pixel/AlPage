import { initializeColorEditor, syncColorEditorFromTheme } from './components/color-editor';
import {
  setCurrentProjectId,
  getProjectThemeLabel,
  restoreFromSnapshot,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, hydrateHeaderSelectOptions, setupQualityCheck, resetThemeTargetStyles } from './theme-engine';
import { setupChatInterface, showDefaultChatView } from './chat-manager';
import { setupMainActions } from './package-manager';
import {
  expandPreview,
  collapsePreview,
  setChatPanelWidth,
  syncWorkbenchLayoutForActiveTab,
  applyUiTheme,
  setupTabSwitching,
  setupPreviewPanel,
  setupBackToHome,
  setupCollapsibleColorPanel,
  setupSettingsDialog,
} from './ui-setup';
import { loadDefaultTemplates } from './theme-engine';
import { checkAuth, getUser, redirectToLogin } from './auth';
import { fetchCredits, updateCreditsDisplay } from './credits';
import { initSidebar } from './components/sidebar';

declare global {
  interface Window {
    currentTheme: any;
  }
}

export function showWorkspaceLandingState(): void {
  const workspaceView = document.getElementById('workspaceView');
  const chatPanel = document.getElementById('chatPanel');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  setCurrentProjectId(null);
  chatPanel?.classList.add('landing-mode');
  collapsePreview();
  setChatPanelWidth(null);
  showDefaultChatView();
  const messagesContainer = document.getElementById('messagesContainer') as HTMLElement | null;
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = '开始新创作';
  const projectNameElement = document.getElementById('projectName');
  if (projectNameElement) projectNameElement.textContent = 'AI主题';
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
  setupChatInterface({
    expandPreview,
    collapsePreview,
    syncLayout: syncWorkbenchLayoutForActiveTab,
    setChatPanelWidth,
  });
  setupCollapsibleColorPanel();
  setupSettingsDialog();
  setupMainActions();
  setupQualityCheck();
  setupPreviewPanel();
  setupBackToHome();
  initSidebar();

  window.addEventListener('sidebar:restore-project', ((e: CustomEvent) => {
    const snapshot = e.detail as Record<string, unknown>;
    if (!snapshot || !snapshot.id) return;
    restoreFromSnapshot(snapshot);
    const project = snapshot as any;
    if (project.colors) {
      for (const [k, v] of Object.entries(project.colors)) {
        setThemeVar(`--${k}`, v as string);
      }
    }
    if (project.bgImageUrl) {
      applyThemeImageAssignments('login', project.bgImageUrl);
      applyThemeImageAssignments('desktop', project.bgImageUrl);
    }
    if (project.headerBgImageUrl) {
      applyThemeImageAssignments('desktop', project.headerBgImageUrl);
    }
    applyTemplateSpecificThemeVars(project);
    syncColorEditorFromTheme();
    expandPreview();
    setChatPanelWidth(378);
  }) as EventListener);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const isAuth = await checkAuth();
    if (!isAuth) {
      redirectToLogin();
      return;
    }

    runHealthCheck();
    applyUiTheme('light');
    hydrateHeaderSelectOptions();
    initializeColorEditor();
    await initializeFeatureModules();

    const workspaceView = document.getElementById('workspaceView');
    if (workspaceView) workspaceView.classList.remove('view-hidden');
    showWorkspaceLandingState();

    const creditsInfo = await fetchCredits();
    updateCreditsDisplay(creditsInfo);

    const currentUser = getUser();
    const avatarLetter = document.getElementById('userAvatarLetter');
    if (avatarLetter && currentUser) {
      avatarLetter.textContent = (currentUser.display_name || currentUser.name || 'U').charAt(0).toUpperCase();
    }

    const avatarBtn = document.getElementById('userAvatarBtn');
    if (avatarBtn && currentUser) {
      avatarBtn.title = currentUser.display_name || currentUser.name;
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    redirectToLogin();
  }
});
