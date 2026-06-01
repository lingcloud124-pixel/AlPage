import { initializeThemeConfiguration, syncThemeConfigurationFromTheme } from './components/color-editor';
import {
  setCurrentProjectId,
  restoreFromSnapshot,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, hydrateHeaderSelectOptions, setupQualityCheck, resetThemeTargetStyles } from './theme-engine';
import { setupChatInterface, showDefaultChatView } from './chat-manager';
import { initPortalConfirmForm } from './components/portal-confirm-form';
import {
  expandPreview,
  collapsePreview,
  setChatPanelWidth,
  syncWorkbenchLayoutForActiveTab,
  applyUiTheme,
  setupTabSwitching,
  setupPreviewPanel,
  setupBackToHome,
  setupConfigurationPanel,
  setupPortalObjectEditing,
  setupResultActions,
} from './ui-setup';
import { checkAuth, getUser, redirectToLogin } from './auth';
import { fetchCredits, setupCreditsTooltip, updateCreditsDisplay } from './credits';
import { initSidebar } from './components/sidebar';
import { registerPreviewResize, resizePreviewPages } from './preview/resize-preview';
import { ensureProjectWorkspaceReady } from './workspace/store';
import { renderWorkspaceEditorShell, setupWorkspaceEditorShell } from './workspace/runtime';
import { renderWorkspacePreview } from './workspace/preview';
import { ensureWorkspaceTemplateCache, getWorkspaceTemplateCache } from './workspace/runtime';
import { getPublishedPortal } from './api/saved-portals';
import { renderTemplate } from './templates/loader';
import { loadDefaultTemplates } from './theme-engine';

declare global {
  interface Window {
    currentTheme: any;
    __themeStudioTest?: {
      expandPreview: () => void;
      collapsePreview: () => void;
    };
  }
}

export function showWorkspaceLandingState(): void {
  const workspaceView = document.getElementById('workspaceView');
  const chatPanel = document.getElementById('chatPanel');
  const appContainer = document.querySelector('.app-container');
  const previewPanel = document.getElementById('previewPanel');
  const sidePanel = document.getElementById('sidePanel');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  appContainer?.classList.remove('preview-open');
  appContainer?.classList.remove('panel-open');
  previewPanel?.classList.remove('expanded');
  sidePanel?.classList.remove('open');
  setChatPanelWidth(null);
  setCurrentProjectId(null);
  resetThemeTargetStyles();
  applyTemplateSpecificThemeVars('light-ui');
  syncThemeConfigurationFromTheme();
  collapsePreview();
  showDefaultChatView();
  setChatPanelWidth(null);
  chatPanel?.classList.add('landing-mode');
  chatPanel?.classList.add('is-full-landing');
  const messagesContainer = document.getElementById('messagesContainer') as HTMLElement | null;
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = '开始新创作';
  const projectNameElement = document.getElementById('projectName');
  if (projectNameElement) projectNameElement.textContent = '未命名门户';
  renderWorkspaceEditorShell(null);
}

function runHealthCheck() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  checks.push({ name: 'CSS 变量', ok: !!getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(), detail: '主题色 CSS 变量未加载' });
  checks.push({ name: '聊天输入框', ok: !!document.getElementById('messageInput'), detail: 'messageInput 元素缺失' });
  checks.push({ name: '预览面板', ok: !!document.getElementById('previewPanel'), detail: 'previewPanel 元素缺失' });
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
  setupConfigurationPanel();
  initPortalConfirmForm();
  setupQualityCheck();
  setupPreviewPanel();
  setupBackToHome();
  setupPortalObjectEditing();
  setupResultActions();
  setupWorkspaceEditorShell();
  initSidebar();
  window.__themeStudioTest = {
    expandPreview,
    collapsePreview,
  };

  window.addEventListener('sidebar:restore-project', (evt: Event) => {
    const e = evt as CustomEvent;
    void (async () => {
      const snapshot = e.detail as Record<string, unknown>;
      if (!snapshot || !snapshot.id) return;
      restoreFromSnapshot(snapshot);
      const project = snapshot as any;
      project.workspace = await ensureProjectWorkspaceReady(project.id, project.workspace);
      await ensureWorkspaceTemplateCache();
      renderWorkspaceEditorShell(project.workspace ?? null);
      renderWorkspacePreview(document.getElementById('mainPage'), project.workspace ?? null, getWorkspaceTemplateCache());
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
      applyTemplateSpecificThemeVars(project.templateType);
      syncThemeConfigurationFromTheme();
      expandPreview();
      setChatPanelWidth(378);
    })();
  });
}

/**
 * Published portal viewer — lightweight read-only page at /p/:id.
 * Hides all editing UI, fetches the snapshot, and renders the portal fullscreen.
 */
async function initializePublishedPortal(portalId: string): Promise<void> {
  document.body.classList.add('published-mode');
  applyUiTheme('light');

  const container = document.getElementById('publishedPortalContainer');
  if (!container) { console.error('Published portal container not found'); return; }

  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.overflow = 'hidden';

  try {
    const snapshot = await getPublishedPortal(portalId);

    // Header bar
    const header = document.createElement('div');
    header.className = 'published-portal-header';
    header.innerHTML = `<span class="published-portal-name">${snapshot.name || '客户门户'}</span><span class="published-portal-badge">AlPage 预览</span>`;
    container.appendChild(header);

    // Template render target
    const previewTarget = document.createElement('div');
    previewTarget.id = 'publishedPreview';
    previewTarget.style.flex = '1';
    previewTarget.style.position = 'relative';
    previewTarget.style.overflow = 'hidden';
    container.appendChild(previewTarget);

    // Apply theme colors
    const templateType = (snapshot.templateType || 'light-ui') as 'light-ui' | 'dark-ui';
    if (snapshot.colors) {
      for (const [k, v] of Object.entries(snapshot.colors)) {
        setThemeVar(`--${k}`, v as string);
      }
    }
    applyTemplateSpecificThemeVars(templateType);

    // Load templates and render
    loadDefaultTemplates();
    await renderTemplate('desktop', previewTarget);

    // Render workspace cards
    await ensureWorkspaceTemplateCache();
    if (snapshot.workspace) {
      renderWorkspacePreview(previewTarget, snapshot.workspace as any, getWorkspaceTemplateCache());
    }
  } catch (err) {
    container.innerHTML = `<div class="published-portal-error">加载失败：${(err as Error).message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check for published portal mode (/p/:id)
  const publishedMatch = window.location.pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch) {
    await initializePublishedPortal(publishedMatch[1]);
    return;
  }

  try {
    const isAuth = await checkAuth();
    if (!isAuth) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Local dev: auth skipped (no EKP cookie)');
      } else {
        redirectToLogin();
        return;
      }
    }

    runHealthCheck();
    applyUiTheme('light');
    hydrateHeaderSelectOptions();
    initializeThemeConfiguration();
    registerPreviewResize();
    await initializeFeatureModules();

    const workspaceView = document.getElementById('workspaceView');
    if (workspaceView) workspaceView.classList.remove('view-hidden');
    showWorkspaceLandingState();
    setupCreditsTooltip();

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

    window.setTimeout(resizePreviewPages, 200);
    window.setTimeout(resizePreviewPages, 1000);
  } catch (error) {
    console.error('Initialization failed:', error);
    redirectToLogin();
  }
});
