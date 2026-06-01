import { listCardTemplates } from '../api/card-templates';
import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import { syncPortalPlanFromWorkspace } from '../portal-plan';
import { persistWorkspaceToLocal, syncWorkspaceToServer } from './store';
import { escapeHtml, getWorkspaceCardTitle, renderWorkspaceCardShell } from './card-renderer';
import { destroyWorkspaceGrid, mountWorkspaceGrid } from './interact-adapter';
import { renderWorkspacePreview } from './preview';
import { renderWorkspacePlanningView } from '../components/workspace-configuration';
import { renderThemeConfiguration } from '../components/theme-configuration';
import { renderCardContentConfiguration, collectCardFieldValues } from '../components/card-content-configuration';

import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';

export interface WorkspaceRuntimeState {
  projectId: string;
  workspace: WorkspaceConfig | null;
}

export function createWorkspaceRuntimeState(projectId: string, workspace: WorkspaceConfig | null): WorkspaceRuntimeState {
  return {
    projectId,
    workspace,
  };
}

let currentWorkspace: WorkspaceConfig | null = null;
let selectedWorkspaceCardId: string | null = null;
let isWorkspacePropertiesDrawerOpen = false;
type WorkspacePropertiesPanelMode = 'global' | 'card' | 'theme';
let workspacePropertiesPanelMode: WorkspacePropertiesPanelMode = 'global';
let workspaceTemplateCache: Record<string, CardTemplateListItem> = {};
let workspaceTemplateLoadPromise: Promise<void> | null = null;

interface WorkspacePlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

function setWorkspaceTemplateCache(items: CardTemplateListItem[]): void {
  workspaceTemplateCache = Object.fromEntries(
    items
      .filter((item) => typeof item.type === 'string' && item.type.trim().length > 0)
      .map((item) => [item.type, item])
  );
}

export async function ensureWorkspaceTemplateCache(force = false): Promise<void> {
  if (!force && Object.keys(workspaceTemplateCache).length > 0) return;
  if (workspaceTemplateLoadPromise) {
    await workspaceTemplateLoadPromise;
    return;
  }
  workspaceTemplateLoadPromise = (async () => {
    const items = await listCardTemplates();
    setWorkspaceTemplateCache(items);
  })().finally(() => {
    workspaceTemplateLoadPromise = null;
  });
  await workspaceTemplateLoadPromise;
}

function getWorkspaceCardTemplate(templateId: string): CardTemplateListItem | null {
  return workspaceTemplateCache[templateId] ?? null;
}

function getWorkspaceCardTemplateProps(item: Record<string, any>): Record<string, any> {
  const template = getWorkspaceCardTemplate(String(item.templateId || ''));
  return {
    ...((template?.defaultProps as Record<string, unknown>) ?? {}),
    ...((item.instanceProps as Record<string, unknown>) ?? {}),
  };
}

function getNextWorkspaceY(workspace: WorkspaceConfig): number {
  return workspace.items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

function isWithinWorkspaceBounds(candidate: WorkspacePlacement, columns: number): boolean {
  return candidate.x >= 0 && candidate.y >= 0 && candidate.w >= 1 && candidate.h >= 1 && candidate.x + candidate.w <= columns;
}

function hasWorkspaceCollision(
  workspace: WorkspaceConfig,
  candidate: WorkspacePlacement,
  ignoreItemId?: string
): boolean {
  return workspace.items.some((item) => {
    if (item.id === ignoreItemId) return false;
    return !(
      candidate.x + candidate.w <= item.x ||
      item.x + item.w <= candidate.x ||
      candidate.y + candidate.h <= item.y ||
      item.y + item.h <= candidate.y
    );
  });
}

function findWorkspaceSlot(workspace: WorkspaceConfig, w: number, h: number): { x: number; y: number } {
  const columns = Math.max(1, Number(workspace.settings.columns || 4));
  const maxY = Math.max(getNextWorkspaceY(workspace) + h + 4, 16);
  const width = Math.max(1, Math.min(columns, w));
  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= columns - width; x += 1) {
      const candidate = { x, y, w: width, h };
      if (!hasWorkspaceCollision(workspace, candidate) && isWithinWorkspaceBounds(candidate, columns)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: getNextWorkspaceY(workspace) };
}

function resolveWorkspacePlacement(
  workspace: WorkspaceConfig,
  origin: WorkspacePlacement,
  candidate: WorkspacePlacement,
  ignoreItemId?: string
): WorkspacePlacement {
  const columns = Math.max(1, Number(workspace.settings.columns || 4));
  if (!isWithinWorkspaceBounds(candidate, columns)) {
    return origin;
  }
  if (hasWorkspaceCollision(workspace, candidate, ignoreItemId)) {
    return origin;
  }
  return candidate;
}

function pushCollidingItemsDown(items: WorkspaceConfig['items'], targetIndex: number): WorkspaceConfig['items'] {
  const nextItems = items.map((item) => ({ ...item }));
  const target = nextItems[targetIndex];
  if (!target) return nextItems;
  for (let index = 0; index < nextItems.length; index += 1) {
    if (index === targetIndex) continue;
    const item = nextItems[index];
    const overlaps = !(
      target.x + target.w <= item.x ||
      item.x + item.w <= target.x ||
      target.y + target.h <= item.y ||
      item.y + item.h <= target.y
    );
    if (overlaps) {
      item.y = target.y + target.h;
      return pushCollidingItemsDown(nextItems, index);
    }
  }
  return nextItems;
}

function compactWorkspaceItems(workspace: WorkspaceConfig, items: WorkspaceConfig['items']): WorkspaceConfig['items'] {
  const columns = Math.max(1, Number(workspace.settings.columns || 4));
  const sorted = items
    .map((item) => ({ ...item }))
    .sort((left, right) => (left.y - right.y) || (left.x - right.x));

  return sorted.map((item, index) => {
    const nextItem = { ...item, x: Math.max(0, Math.min(columns - item.w, item.x)) };
    let nextY = nextItem.y;
    while (nextY > 0) {
      const candidate = { x: nextItem.x, y: nextY - 1, w: nextItem.w, h: nextItem.h };
      const collisions = sorted.some((other, otherIndex) => {
        if (otherIndex === index) return false;
        return !(
          candidate.x + candidate.w <= other.x ||
          other.x + other.w <= candidate.x ||
          candidate.y + candidate.h <= other.y ||
          other.y + other.h <= candidate.y
        );
      });
      if (collisions) break;
      nextY -= 1;
    }
    nextItem.y = nextY;
    return nextItem;
  });
}

function normalizeWorkspaceLayout(workspace: WorkspaceConfig, items: WorkspaceConfig['items']): WorkspaceConfig['items'] {
  let nextItems = items.map((item) => ({ ...item }));
  for (let index = 0; index < nextItems.length; index += 1) {
    nextItems = pushCollidingItemsDown(nextItems, index);
  }
  const normalizedItems = compactWorkspaceItems(workspace, nextItems);
  return normalizedItems;
}

export function getWorkspaceTemplateCache(): Record<string, CardTemplateListItem> {
  return workspaceTemplateCache;
}

function refreshWorkspacePreview(): void {
  renderWorkspacePreview(document.getElementById('mainPage'), currentWorkspace, workspaceTemplateCache);
  requestAnimationFrame(() => (window as any).resizePreview?.());
}

async function commitWorkspaceMutation(nextWorkspace: WorkspaceConfig): Promise<void> {
  const normalizedItems = normalizeWorkspaceLayout(nextWorkspace, nextWorkspace.items);
  currentWorkspace = {
    ...nextWorkspace,
    items: normalizedItems,
  };
  const projectId = getCurrentProjectId();
  if (!projectId) {
    renderWorkspaceEditorShell(currentWorkspace);
    refreshWorkspacePreview();
    return;
  }

  persistWorkspaceToLocal(projectId, currentWorkspace);
  const project = await loadProject(projectId);
  if (project) {
    project.workspace = currentWorkspace;
    Object.assign(project, syncPortalPlanFromWorkspace(project));
    await saveProject(project);
  }
  renderWorkspaceEditorShell(currentWorkspace);
  refreshWorkspacePreview();
  void syncWorkspaceToServer(projectId, currentWorkspace);
}

async function addWorkspaceCardFromTemplate(template: Record<string, any>): Promise<void> {
  if (!currentWorkspace) return;
  const templateId = String(template.type || template.templateId || '');
  if (!templateId) return;
  const nextW = Math.max(1, Math.min(Number(currentWorkspace.settings.columns || 4), Number(template.defaultW ?? 2)));
  const nextH = Number(template.defaultH ?? 12);
  const slot = findWorkspaceSlot(currentWorkspace, nextW, nextH);
  const nextWorkspace: WorkspaceConfig = {
    ...currentWorkspace,
    items: [
      ...currentWorkspace.items,
      {
        id: crypto.randomUUID(),
        templateId,
        x: slot.x,
        y: slot.y,
        w: nextW,
        h: nextH,
        minW: Number(template.minW ?? 1),
        minH: Number(template.minH ?? 12),
      },
    ],
    meta: {
      ...currentWorkspace.meta,
      updatedAt: Date.now(),
    },
  };
  closeWorkspaceCardLibrary();
  await commitWorkspaceMutation(nextWorkspace);
}

async function deleteWorkspaceCard(itemId: string): Promise<void> {
  if (!currentWorkspace) return;
  const nextItems = currentWorkspace.items.filter((item) => item.id !== itemId);
  const nextWorkspace: WorkspaceConfig = {
    ...currentWorkspace,
    items: nextItems,
    meta: {
      ...currentWorkspace.meta,
      updatedAt: Date.now(),
    },
  };
  if (selectedWorkspaceCardId === itemId) {
    selectedWorkspaceCardId = null;
  }
  await commitWorkspaceMutation(nextWorkspace);
}

async function updateWorkspaceCardInstanceProps(itemId: string, patch: Record<string, unknown>): Promise<void> {
  if (!currentWorkspace) return;
  const nextWorkspace: WorkspaceConfig = {
    ...currentWorkspace,
    items: currentWorkspace.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            instanceProps: {
              ...(item.instanceProps ?? {}),
              ...patch,
            },
          }
        : item
    ),
    meta: {
      ...currentWorkspace.meta,
      updatedAt: Date.now(),
    },
  };
  await commitWorkspaceMutation(nextWorkspace);
}

function applyCardGridStyles(workspace: WorkspaceConfig): void {
  const canvas = document.getElementById('workspaceCardCanvas') as HTMLElement | null;
  if (!canvas) return;

  canvas.style.setProperty('--workspace-columns', String(workspace.settings.columns || 4));
  canvas.style.setProperty('--workspace-row-height', `${workspace.settings.rowHeight || 24}px`);
  canvas.style.setProperty('--workspace-gap-x', `${workspace.settings.gapX || 16}px`);
  canvas.style.setProperty('--workspace-gap-y', `${workspace.settings.gapY || 16}px`);
  canvas.style.setProperty('--workspace-padding-x', `${workspace.settings.paddingX || 20}px`);
  canvas.style.setProperty('--workspace-padding-y', `${workspace.settings.paddingY || 20}px`);
}

export function renderWorkspaceEditorShell(workspace: WorkspaceConfig | null): void {
  currentWorkspace = workspace;
  if (!workspace || !workspace.items.some((item) => item.id === selectedWorkspaceCardId)) {
    selectedWorkspaceCardId = null;
  }
  const canvas = document.getElementById('workspaceCardCanvas');
  if (!canvas) return;

  if (workspace && Object.keys(workspaceTemplateCache).length === 0) {
    void ensureWorkspaceTemplateCache().then(() => {
      if (currentWorkspace) {
        renderWorkspaceEditorShell(currentWorkspace);
      }
    });
  }

  if (!workspace || !Array.isArray(workspace.items) || workspace.items.length === 0) {
    destroyWorkspaceGrid();
    canvas.setAttribute('data-empty', 'true');
    canvas.innerHTML = '<div class="workspace-editor-empty">暂无工作区卡片，请先从卡片库添加。</div>';
    return;
  }

  applyCardGridStyles(workspace);
  canvas.removeAttribute('data-empty');
  canvas.innerHTML = workspace.items.map((item) => {
    const style = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    return renderWorkspaceCardShell({
      item,
      context: { mode: 'editor', templateCache: workspaceTemplateCache },
      style,
    });
  }).join('');
  bindWorkspaceCardSelection();
  void mountWorkspaceGrid({
    canvas,
    workspace,
    onLayoutChange: (items) => {
      const nextWorkspace: WorkspaceConfig = {
        ...workspace,
        items,
        meta: {
          ...workspace.meta,
          updatedAt: Date.now(),
        },
      };
      void commitWorkspaceMutation(nextWorkspace);
    },
  });
  if (isWorkspacePropertiesDrawerOpen) {
    renderConfigPanelContent();
  }
}

function bindWorkspaceCardSelection(): void {
  const cards = document.querySelectorAll('.workspace-editor-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemId = card.getAttribute('data-item-id');
      if (itemId) selectedWorkspaceCardId = itemId;
      cards.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === card));
      openWorkspacePropertiesDrawer('card');
      const selectedItem = itemId ? currentWorkspace?.items.find((candidate) => candidate.id === itemId) : null;
      if (selectedItem) {
        window.dispatchEvent(new CustomEvent('workspace-card:selected', {
          detail: {
            id: selectedItem.id,
            title: getWorkspaceCardTitle(selectedItem, workspaceTemplateCache),
            templateId: selectedItem.templateId,
            size: `${selectedItem.w} x ${selectedItem.h}`,
          },
        }));
      }
    });
    const deleteButton = card.querySelector('[data-action="delete-card"]');
    deleteButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        void deleteWorkspaceCard(itemId);
      }
    });
    // Phase E: config button opens card tab in properties drawer
    const configButton = card.querySelector('[data-action="config-card"]');
    configButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        selectedWorkspaceCardId = itemId;
        setActiveConfigTab('card');
        openWorkspacePropertiesDrawer('card');
      }
    });
  });
}

export function escapeCssUrl(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n|\r|\f/g, '');
}

function renderCardLibraryList(items: Array<Record<string, any>>): void {
  const container = document.getElementById('workspaceCardLibraryList');
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="workspace-editor-empty">暂无可用卡片模板。</div>';
    return;
  }
  container.innerHTML = items.map((item) => {
    const previewImageUrl = escapeCssUrl(item.previewImageUrl);
    const previewStyle = previewImageUrl
      ? ` style="background-image: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(129, 140, 248, 0.06)), url('${previewImageUrl}');"`
      : '';
    return `
      <article class="workspace-card-library-item" data-template-type="${escapeHtml(item.type)}">
        <div class="workspace-card-library-thumb"${previewStyle}>模板预览</div>
        <div class="workspace-card-library-item-title">${escapeHtml(item.name || item.type)}</div>
        <div class="workspace-card-library-item-meta">${escapeHtml(item.category || '未分类')} · ${escapeHtml(item.defaultW || 2)} x ${escapeHtml(item.defaultH || 12)}</div>
        <div class="workspace-card-library-item-meta">${escapeHtml(item.description || '从后台卡片库选择后加入当前工作区')}</div>
      </article>
    `;
  }).join('');
  container.querySelectorAll('.workspace-card-library-item').forEach((node, index) => {
    node.addEventListener('click', () => {
      void addWorkspaceCardFromTemplate(items[index] ?? {});
    });
  });
}

export async function openWorkspaceCardLibrary(): Promise<void> {
  const modal = document.getElementById('workspaceCardLibraryModal');
  if (!modal) return;
  modal.classList.add('active');
  const items = await listCardTemplates();
  setWorkspaceTemplateCache(items);
  renderCardLibraryList(items as Array<Record<string, any>>);
}

function closeWorkspaceCardLibrary(): void {
  const modal = document.getElementById('workspaceCardLibraryModal');
  modal?.classList.remove('active');
}

type ConfigPanelTab = 'theme' | 'layout' | 'card';
let activeConfigTab: ConfigPanelTab = 'layout';

function setActiveConfigTab(tab: ConfigPanelTab): void {
  activeConfigTab = tab;
  const tabs = document.querySelectorAll('#configPanelTabs .config-panel-tab');
  tabs.forEach((el) => {
    el.classList.toggle('is-active', (el as HTMLElement).dataset.tab === tab);
  });
  renderConfigPanelContent();
}

function setupConfigPanelTabs(): void {
  const tabContainer = document.getElementById('configPanelTabs');
  if (!tabContainer) return;
  tabContainer.querySelectorAll('.config-panel-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as ConfigPanelTab;
      if (tab) setActiveConfigTab(tab);
    });
  });
}

function bindCardContentFormEvents(item: WorkspaceConfig['items'][number]): void {
  const titleInput = document.getElementById('workspace-card-title-input') as HTMLInputElement | null;
  titleInput?.addEventListener('change', () => {
    void updateWorkspaceCardInstanceProps(item.id, { title: titleInput.value.trim() });
  });

  // Bind all schema-driven fields to auto-save on change
  const container = document.getElementById('workspacePropertiesContent');
  if (container) {
    const fields = (container as any).__cardFields as Array<{ key: string; type: string }> | undefined;
    if (fields && fields.length > 0) {
      for (const field of fields) {
        const fieldEl = document.getElementById(`card-field-${field.key}`);
        if (fieldEl) {
          const eventType = field.type === 'boolean' ? 'change' : 'change';
          fieldEl.addEventListener(eventType, () => {
            void updateWorkspaceCardInstanceProps(item.id, collectCardFieldValues());
          });
        }
      }
    }
  }
}

function renderConfigPanelContent(): void {
  if (activeConfigTab === 'theme') {
    void renderThemeConfiguration();
    return;
  }
  if (activeConfigTab === 'card') {
    if (!selectedWorkspaceCardId || !currentWorkspace) {
      renderCardContentConfiguration({ id: '', title: '请先在工作区设计中点击一张卡片' });
      return;
    }
    const item = currentWorkspace.items.find((candidate) => candidate.id === selectedWorkspaceCardId);
    if (!item) {
      renderCardContentConfiguration({ id: selectedWorkspaceCardId, title: '未找到选中卡片' });
      return;
    }
    renderCardContentConfiguration({
      selection: {
        id: item.id,
        title: getWorkspaceCardTitle(item, workspaceTemplateCache),
        templateId: item.templateId,
        size: `${item.w} x ${item.h}`,
      },
      item,
      templateProps: getWorkspaceCardTemplateProps(item as Record<string, any>),
    });
    bindCardContentFormEvents(item);
    return;
  }
  void renderWorkspacePlanningView();
}

export function renderWorkspacePropertyPanel(_mode?: WorkspacePropertiesPanelMode): void {
  renderConfigPanelContent();
}

export function openWorkspacePropertiesDrawer(mode?: WorkspacePropertiesPanelMode): void {
  const drawer = document.getElementById('workspacePropertiesDrawer');
  const appContainer = document.querySelector('.app-container');
  const sidePanel = document.getElementById('sidePanel');
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement | null;
  if (!drawer || !(appContainer instanceof HTMLElement)) return;
  isWorkspacePropertiesDrawerOpen = true;
  sidePanel?.classList.remove('open');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  appContainer.classList.add('panel-open');
  if (panelToggleBtn) panelToggleBtn.textContent = '主题配置';
  if (mode === 'card') setActiveConfigTab('card');
  else if (mode === 'theme') setActiveConfigTab('theme');
  else setActiveConfigTab('layout');
}

function closeWorkspacePropertiesDrawer(): void {
  const drawer = document.getElementById('workspacePropertiesDrawer');
  const appContainer = document.querySelector('.app-container');
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement | null;
  if (!drawer) return;
  isWorkspacePropertiesDrawerOpen = false;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  appContainer?.classList.remove('panel-open');
  if (panelToggleBtn) panelToggleBtn.textContent = '主题配置';
}

export function setupWorkspaceEditorShell(): void {
  const previewModeBtn = document.getElementById('workspacePreviewModeBtn') as HTMLButtonElement | null;
  const designModeBtn = document.getElementById('workspaceDesignModeBtn') as HTMLButtonElement | null;
  const previewContent = document.querySelector('.preview-content') as HTMLElement | null;
  const editorView = document.getElementById('workspaceEditorView') as HTMLElement | null;
  const addBtn = document.getElementById('workspaceEditorAddBtn') as HTMLButtonElement | null;
  const propertiesBtn = document.getElementById('workspacePropertiesTopbarBtn') as HTMLButtonElement | null;
  const libraryCloseBtn = document.getElementById('workspaceCardLibraryCloseBtn') as HTMLButtonElement | null;
  const propertiesCloseBtn = document.getElementById('workspacePropertiesDrawerCloseBtn') as HTMLButtonElement | null;
  const libraryModal = document.getElementById('workspaceCardLibraryModal') as HTMLElement | null;

  if (!previewModeBtn || !designModeBtn || !previewContent || !editorView) {
    return;
  }

  const setMode = (mode: 'preview' | 'design') => {
    const isDesign = mode === 'design';
    previewModeBtn.classList.toggle('is-active', !isDesign);
    designModeBtn.classList.toggle('is-active', isDesign);
    previewContent.hidden = isDesign;
    editorView.hidden = !isDesign;
    if (!isDesign) {
      refreshWorkspacePreview();
    }
  };

  previewModeBtn.addEventListener('click', () => {
    setMode('preview');
  });
  designModeBtn.addEventListener('click', () => {
    setMode('design');
    // canvas 从 hidden 变为可见后需要重新渲染以获得正确尺寸
    if (currentWorkspace) {
      requestAnimationFrame(() => requestAnimationFrame(() => renderWorkspaceEditorShell(currentWorkspace)));
    }
  });
  addBtn?.addEventListener('click', () => { void openWorkspaceCardLibrary(); });
  propertiesBtn?.addEventListener('click', () => {
    setActiveConfigTab('layout');
    openWorkspacePropertiesDrawer();
  });
  setupConfigPanelTabs();
  libraryCloseBtn?.addEventListener('click', () => closeWorkspaceCardLibrary());
  propertiesCloseBtn?.addEventListener('click', () => closeWorkspacePropertiesDrawer());
  libraryModal?.addEventListener('click', (event) => {
    if (event.target === libraryModal) {
      closeWorkspaceCardLibrary();
    }
  });
  setMode('preview');
}
