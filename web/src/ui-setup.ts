import { renderTemplate } from './templates/loader';
import {
  getCurrentProjectId,
  loadProject,
  markPortalResultFullscreenViewed,
  markPortalResultShared,
  saveProject,
} from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, getThemeTarget, hydrateHeaderSelectOptions, setupQualityCheck, loadDefaultTemplates } from './theme-engine';
import { setupChatInterface } from './chat-manager';
import { initializeThemeConfiguration } from './components/color-editor';
import type { WorkspaceCardSelection } from './components/card-content-configuration';
import { showWorkspaceLandingState } from './main';
import { toggleSidebar } from './components/sidebar';
import { renderWorkspacePreview } from './workspace/preview';
import { ensureWorkspaceTemplateCache, getWorkspaceTemplateCache } from './workspace/runtime';
import { publishSavedPortal, createSavedPortal, type SavedPortalDetail } from './api/saved-portals';
import { createIndustryCase, type CreateIndustryCaseData } from './api/industry-cases';
import { anonymizeRequirementSummary } from './portal-agent';

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

async function handleResultShare(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}#project=${projectId}`;
  const shareData = {
    title: '客户门户方案',
    text: '我刚整理了一份客户门户方案，可以直接查看并迭代。',
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

export function setupResultActions() {
  const fullscreenBtn = document.getElementById('resultFullscreenBtn') as HTMLButtonElement | null;
  const shareBtn = document.getElementById('resultShareBtn') as HTMLButtonElement | null;
  const publishBtn = document.getElementById('resultPublishBtn') as HTMLButtonElement | null;
  const saveCaseBtn = document.getElementById('resultSaveCaseBtn') as HTMLButtonElement | null;

  fullscreenBtn?.addEventListener('click', () => { void handleResultFullscreen(); });
  shareBtn?.addEventListener('click', () => { void handleResultShare(); });
  publishBtn?.addEventListener('click', () => { void handleResultPublish(); });
  saveCaseBtn?.addEventListener('click', () => { void handleResultSaveCase(); });
}

async function handleResultPublish(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) { alert('请先创建项目'); return; }
  const project = await loadProject(projectId);
  if (!project) { alert('项目不存在'); return; }

  try {
    // First ensure the project is saved as a portal
    let portalId = project.savedPortalId;
    if (!portalId) {
      const result = await createSavedPortal({
        name: project.themeName || project.name,
        templateType: project.templateType,
        colors: project.colors,
        workspace: (project.workspace ?? {}) as unknown as Record<string, unknown>,
        portalPlan: (project.portalPlan ?? {}) as unknown as Record<string, unknown>,
        projectId: project.id,
        status: 'saved',
      });
      portalId = result.id;
      project.savedPortalId = portalId;
      await saveProject(project);
    }

    // Update the saved portal with latest data before publishing
    const { updateSavedPortal } = await import('./api/saved-portals');
    await updateSavedPortal(portalId, {
      name: project.themeName || project.name,
      templateType: project.templateType,
      colors: project.colors,
      workspace: (project.workspace ?? {}) as unknown as Record<string, unknown>,
      portalPlan: (project.portalPlan ?? {}) as unknown as Record<string, unknown>,
    });

    // Publish the portal
    await publishSavedPortal(portalId);
    const publishUrl = `${window.location.origin}/p/${portalId}`;

    // Show the publish URL
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(publishUrl);
      alert(`发布成功！链接已复制到剪贴板：\n\n${publishUrl}`);
    } else {
      prompt('发布成功！请复制以下链接：', publishUrl);
    }
  } catch (err) {
    alert(`发布失败：${(err as Error).message}`);
  }
}

async function handleResultSaveCase(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) { alert('请先创建项目'); return; }
  const project = await loadProject(projectId);
  if (!project) { alert('项目不存在'); return; }

  const title = prompt('案例标题：', project.themeName || project.name || '');
  if (!title) return;

  const industry = project.portalProfile?.customerIndustry ?? '';
  const keywords = project.portalProfile?.highlightedCards ?? [];

  // Build anonymized requirement summary
  let anonymizedRequirement = '';
  if (project.portalPlan?.requirementSummary) {
    const anonymized = anonymizeRequirementSummary(project.portalPlan.requirementSummary);
    anonymizedRequirement = JSON.stringify(anonymized);
  }

  try {
    const caseData: CreateIndustryCaseData = {
      customerName: '', // Anonymized — no real customer name
      industry,
      keywords,
      portalPlan: (project.portalPlan ?? {}) as unknown as Record<string, unknown>,
      projectId: project.id,
      summary: `来自项目"${title}"的门户案例`,
      highlights: keywords,
      referenceEnabled: true,
      displayEnabled: false,
      anonymizedRequirement,
    };
    await createIndustryCase(caseData);
    alert('已录入资料库！案例将作为 AI 参考使用。');
  } catch (err) {
    alert(`录入失败：${(err as Error).message}`);
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
