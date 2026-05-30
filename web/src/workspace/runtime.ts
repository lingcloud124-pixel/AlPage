import { listCardTemplates } from '../api/card-templates';
import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import { persistWorkspaceToLocal, syncWorkspaceToServer } from './store';
import { escapeHtml, getWorkspaceCardTitle, renderWorkspaceCardShell } from './card-renderer';
import { destroyWorkspaceGrid, mountWorkspaceGrid } from './gridstack-adapter';

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
type WorkspacePropertiesPanelMode = 'global' | 'card';
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

async function ensureWorkspaceTemplateCache(force = false): Promise<void> {
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

async function commitWorkspaceMutation(nextWorkspace: WorkspaceConfig): Promise<void> {
  const normalizedItems = normalizeWorkspaceLayout(nextWorkspace, nextWorkspace.items);
  currentWorkspace = {
    ...nextWorkspace,
    items: normalizedItems,
  };
  const projectId = getCurrentProjectId();
  if (!projectId) {
    renderWorkspaceEditorShell(currentWorkspace);
    return;
  }

  persistWorkspaceToLocal(projectId, currentWorkspace);
  const project = await loadProject(projectId);
  if (project) {
    project.workspace = currentWorkspace;
    await saveProject(project);
  }
  renderWorkspaceEditorShell(currentWorkspace);
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

async function updateWorkspaceSettings(patch: Partial<WorkspaceConfig['settings']>): Promise<void> {
  if (!currentWorkspace) return;
  const nextWorkspace: WorkspaceConfig = {
    ...currentWorkspace,
    settings: {
      ...currentWorkspace.settings,
      ...patch,
    },
    meta: {
      ...currentWorkspace.meta,
      updatedAt: Date.now(),
    },
  };
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
    canvas.classList.remove('grid-stack');
    canvas.setAttribute('data-empty', 'true');
    canvas.innerHTML = '<div class="workspace-editor-empty">暂无工作区卡片，请先从卡片库添加。</div>';
    return;
  }

  applyCardGridStyles(workspace);
  canvas.classList.add('grid-stack');
  canvas.removeAttribute('data-empty');
  canvas.innerHTML = workspace.items.map((item) => {
    return renderWorkspaceCardShell({
      item,
      context: { mode: 'editor', templateCache: workspaceTemplateCache },
      extraClassName: 'grid-stack-item',
      attributes: {
        'gs-id': item.id,
        'gs-x': item.x,
        'gs-y': item.y,
        'gs-w': item.w,
        'gs-h': item.h,
        'gs-min-w': item.minW ?? 1,
        'gs-min-h': item.minH ?? 1,
      },
    });
  }).replace(/(<div class="workspace-editor-card-content")/g, '<div class="grid-stack-item-content">$1').replace(/(<\/article>)/g, '</div>$1');
  bindWorkspaceCardSelection();
  mountWorkspaceGrid({
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
    renderWorkspacePropertyPanel();
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
    });
    const deleteButton = card.querySelector('[data-action="delete-card"]');
    deleteButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        void deleteWorkspaceCard(itemId);
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

function setWorkspacePropertiesPanelMode(mode: WorkspacePropertiesPanelMode): void {
  workspacePropertiesPanelMode = mode;
  const drawerTitle = document.querySelector('#workspacePropertiesDrawer .drawer-header h3') as HTMLElement | null;
  if (drawerTitle) drawerTitle.textContent = mode === 'card' ? '卡片配置' : '属性配置';
}

export function renderWorkspacePropertyPanel(mode: WorkspacePropertiesPanelMode = workspacePropertiesPanelMode): void {
  setWorkspacePropertiesPanelMode(mode);
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return;

  if (mode === 'global' || !selectedWorkspaceCardId || !currentWorkspace) {
    const settings = currentWorkspace?.settings;
    container.innerHTML = `
      <section class="workspace-properties-section">
        <h4>全局布局配置</h4>
        <div class="workspace-properties-form workspace-properties-grid">
          <label class="workspace-properties-field">
            <span>列数</span>
            <input id="workspace-setting-columns" class="workspace-properties-input" type="number" min="1" max="6" value="${settings?.columns ?? 4}">
          </label>
          <label class="workspace-properties-field">
            <span>横向间距</span>
            <input id="workspace-setting-gapX" class="workspace-properties-input" type="number" min="0" max="48" value="${settings?.gapX ?? 16}">
          </label>
          <label class="workspace-properties-field">
            <span>纵向间距</span>
            <input id="workspace-setting-gapY" class="workspace-properties-input" type="number" min="0" max="48" value="${settings?.gapY ?? 16}">
          </label>
          <label class="workspace-properties-field">
            <span>左右边距</span>
            <input id="workspace-setting-paddingX" class="workspace-properties-input" type="number" min="0" max="80" value="${settings?.paddingX ?? 20}">
          </label>
          <label class="workspace-properties-field">
            <span>上下边距</span>
            <input id="workspace-setting-paddingY" class="workspace-properties-input" type="number" min="0" max="80" value="${settings?.paddingY ?? 20}">
          </label>
        </div>
      </section>
    `;
    const bindSetting = (id: string, key: keyof WorkspaceConfig['settings']) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      input?.addEventListener('change', () => {
        const value = Math.max(0, Number(input.value || 0));
        void updateWorkspaceSettings({ [key]: value } as Partial<WorkspaceConfig['settings']>);
      });
    };
    bindSetting('workspace-setting-columns', 'columns');
    bindSetting('workspace-setting-gapX', 'gapX');
    bindSetting('workspace-setting-gapY', 'gapY');
    bindSetting('workspace-setting-paddingX', 'paddingX');
    bindSetting('workspace-setting-paddingY', 'paddingY');
    return;
  }

  const item = currentWorkspace.items.find((candidate) => candidate.id === selectedWorkspaceCardId) ?? null;
  const templateProps = item ? getWorkspaceCardTemplateProps(item as Record<string, any>) : {};
  const title = item ? getWorkspaceCardTitle(item, workspaceTemplateCache) : '未选中卡片';
  const supportsItemCount = item ? ['message-todo', 'news-carousel', 'my-schedule', 'quick-access'].includes(item.templateId) : false;
  const supportsHeadline = item?.templateId === 'news-carousel';
  container.innerHTML = `
    <section class="workspace-properties-section">
      <h4>卡片属性</h4>
      <div class="workspace-properties-form">
        <label class="workspace-properties-field">
          <span>卡片标题</span>
          <input id="workspace-card-title-input" class="workspace-properties-input" type="text" value="${escapeHtml(title)}">
        </label>
        ${supportsHeadline ? `
          <label class="workspace-properties-field">
            <span>主标题</span>
            <input id="workspace-card-headline-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(templateProps.headline ?? '')}">
          </label>
          <label class="workspace-properties-field">
            <span>摘要</span>
            <input id="workspace-card-summary-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(templateProps.summary ?? '')}">
          </label>
        ` : ''}
        ${supportsItemCount ? `
          <label class="workspace-properties-field">
            <span>展示条数</span>
            <input id="workspace-card-item-count-input" class="workspace-properties-input" type="number" min="1" max="12" value="${escapeHtml(templateProps.itemCount ?? 4)}">
          </label>
        ` : ''}
        <div class="workspace-properties-field"><span>模板类型</span><strong>${item?.templateId ?? '-'}</strong></div>
        <div class="workspace-properties-field"><span>当前尺寸</span><strong>${item?.w ?? '-'} x ${item?.h ?? '-'}</strong></div>
      </div>
    </section>
  `;
  const titleInput = document.getElementById('workspace-card-title-input') as HTMLInputElement | null;
  titleInput?.addEventListener('change', () => {
    if (item?.id) {
      void updateWorkspaceCardInstanceProps(item.id, { title: titleInput.value.trim() });
    }
  });
  const itemCountInput = document.getElementById('workspace-card-item-count-input') as HTMLInputElement | null;
  itemCountInput?.addEventListener('change', () => {
    if (item?.id) {
      void updateWorkspaceCardInstanceProps(item.id, { itemCount: Math.max(1, Number(itemCountInput.value || 1)) });
    }
  });
  const headlineInput = document.getElementById('workspace-card-headline-input') as HTMLInputElement | null;
  headlineInput?.addEventListener('change', () => {
    if (item?.id) {
      void updateWorkspaceCardInstanceProps(item.id, { headline: headlineInput.value.trim() });
    }
  });
  const summaryInput = document.getElementById('workspace-card-summary-input') as HTMLInputElement | null;
  summaryInput?.addEventListener('change', () => {
    if (item?.id) {
      void updateWorkspaceCardInstanceProps(item.id, { summary: summaryInput.value.trim() });
    }
  });
}

export function openWorkspacePropertiesDrawer(mode: WorkspacePropertiesPanelMode = 'global'): void {
  setWorkspacePropertiesPanelMode(mode);
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
  if (panelToggleBtn) panelToggleBtn.textContent = '面板';
  renderWorkspacePropertyPanel(mode);
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
  if (panelToggleBtn) panelToggleBtn.textContent = '面板';
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
  };

  previewModeBtn.addEventListener('click', () => setMode('preview'));
  designModeBtn.addEventListener('click', () => setMode('design'));
  addBtn?.addEventListener('click', () => { void openWorkspaceCardLibrary(); });
  propertiesBtn?.addEventListener('click', () => openWorkspacePropertiesDrawer('global'));
  libraryCloseBtn?.addEventListener('click', () => closeWorkspaceCardLibrary());
  propertiesCloseBtn?.addEventListener('click', () => closeWorkspacePropertiesDrawer());
  libraryModal?.addEventListener('click', (event) => {
    if (event.target === libraryModal) {
      closeWorkspaceCardLibrary();
    }
  });
  setMode('preview');
}
