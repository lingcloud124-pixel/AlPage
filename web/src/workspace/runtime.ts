import { listCardTemplates } from '../api/card-templates';
import { getCurrentProjectId, loadProject, saveProject } from '../project-manager';
import { persistWorkspaceToLocal, syncWorkspaceToServer } from './store';

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

const CARD_TITLES: Record<string, string> = {
  'message-todo': '待办事务',
  'news-carousel': '新闻轮播',
  'my-schedule': '我的日程',
  'quick-access': '快捷入口',
};

let currentWorkspace: WorkspaceConfig | null = null;
let selectedWorkspaceCardId: string | null = null;
let isWorkspacePropertiesDrawerOpen = false;
type WorkspacePropertiesPanelMode = 'global' | 'card';
let workspacePropertiesPanelMode: WorkspacePropertiesPanelMode = 'global';
let workspaceTemplateCache: Record<string, CardTemplateListItem> = {};
let workspaceTemplateLoadPromise: Promise<void> | null = null;

interface GridMetrics {
  columns: number;
  columnWidth: number;
  rowStep: number;
  rowHeight: number;
  gapX: number;
  gapY: number;
}

interface WorkspacePlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WorkspaceCardContent {
  body: string;
  extraClassName?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildCardRows(templateId: string): string {
  const rowsByTemplate: Record<string, string[]> = {
    'message-todo': ['待审批事项', '我发起的流程', '超时提醒'],
    'news-carousel': ['企业新闻头条', '公告速览', '活动专题'],
    'my-schedule': ['今日会议安排', '本周计划', '待跟进事项'],
    'quick-access': ['常用入口', '业务导航', '收藏应用'],
  };
  const rows = rowsByTemplate[templateId] ?? ['卡片内容占位'];
  return rows
    .map((row, index) => `<div class="workspace-editor-card-row"><span>${row}</span><span>${index + 1}</span></div>`)
    .join('');
}

function renderTodoCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 4)) : [];
  return {
    extraClassName: 'workspace-card-list',
    body: `
      ${props.summary ? `<div class="workspace-card-summary">${escapeHtml(props.summary)}</div>` : ''}
      <div class="workspace-card-list">
        ${items.map((entry: Record<string, unknown>) => `<div class="workspace-card-list-item"><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.meta)}</strong></div>`).join('')}
      </div>
    `,
  };
}

function renderNewsCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 2)) : [];
  return {
    body: `
      <div class="workspace-card-news-hero">
        <div class="workspace-card-news-badge">${escapeHtml(props.badge || '专题')}</div>
        <div class="workspace-card-news-title">${escapeHtml(props.headline || '新闻标题')}</div>
        <div class="workspace-card-news-copy">${escapeHtml(props.summary || '新闻摘要')}</div>
      </div>
      <div class="workspace-card-list">
        ${items.map((entry: Record<string, unknown>) => `<div class="workspace-card-list-item"><span>${escapeHtml(entry.title)}</span><strong>${escapeHtml(entry.meta)}</strong></div>`).join('')}
      </div>
    `,
  };
}

function renderScheduleCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 3)) : [];
  return {
    body: `
      ${items.map((entry: Record<string, unknown>) => `
        <div class="workspace-card-schedule-item">
          <div>
            <div class="workspace-card-schedule-title">${escapeHtml(entry.title)}</div>
            <div class="workspace-card-schedule-meta">${escapeHtml(entry.meta)}</div>
          </div>
          <strong>${escapeHtml(entry.status)}</strong>
        </div>
      `).join('')}
    `,
  };
}

function renderQuickAccessCardContent(props: Record<string, any>): WorkspaceCardContent {
  const links = Array.isArray(props.links) ? props.links.slice(0, Number(props.itemCount ?? props.links.length ?? 6)) : [];
  return {
    body: `
      <div class="workspace-card-quick-links">
        ${links.map((label: unknown) => `<button type="button">${escapeHtml(label)}</button>`).join('')}
      </div>
    `,
  };
}

function renderWorkspaceCardContent(item: Record<string, any>): WorkspaceCardContent {
  const templateId = String(item.templateId || '');
  const props = getWorkspaceCardTemplateProps(item);
  if (templateId === 'message-todo') return renderTodoCardContent(props);
  if (templateId === 'news-carousel') return renderNewsCardContent(props);
  if (templateId === 'my-schedule') return renderScheduleCardContent(props);
  if (templateId === 'quick-access') return renderQuickAccessCardContent(props);
  return {
    body: buildCardRows(templateId),
  };
}

function getCardDisplayTitle(item: Record<string, any>): string {
  const instanceTitle = typeof item.instanceProps?.title === 'string' ? item.instanceProps.title.trim() : '';
  const template = getWorkspaceCardTemplate(String(item.templateId || ''));
  return instanceTitle || String(template?.defaultProps?.title || template?.name || CARD_TITLES[item.templateId] || item.templateId);
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

function getGridMetrics(workspace: WorkspaceConfig): GridMetrics | null {
  const canvas = document.getElementById('workspaceCardCanvas') as HTMLElement | null;
  if (!canvas) return null;
  const columns = Math.max(1, Number(workspace.settings.columns || 4));
  const gapX = Number(workspace.settings.gapX || 16);
  const gapY = Number(workspace.settings.gapY || 16);
  const rowHeight = Math.max(8, Number(workspace.settings.rowHeight || 24));
  const innerWidth = Math.max(0, canvas.clientWidth - Number(workspace.settings.paddingX || 20) * 2);
  const columnWidth = Math.max(1, (innerWidth - gapX * (columns - 1)) / columns);
  return {
    columns,
    columnWidth,
    rowStep: rowHeight + gapY,
    rowHeight,
    gapX,
    gapY,
  };
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

function startWorkspaceDrag(event: PointerEvent, itemId: string): void {
  if (!currentWorkspace) return;
  const item = currentWorkspace.items.find((candidate) => candidate.id === itemId);
  const card = document.querySelector(`.workspace-editor-card[data-item-id="${itemId}"]`) as HTMLElement | null;
  const metrics = item ? getGridMetrics(currentWorkspace) : null;
  if (!item || !card || !metrics) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { x: item.x, y: item.y, w: item.w, h: item.h };

  const onPointerMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    const deltaCols = Math.round(dx / (metrics.columnWidth + metrics.gapX));
    const deltaRows = Math.round(dy / metrics.rowStep);
    const nextX = Math.max(0, Math.min(metrics.columns - item.w, origin.x + deltaCols));
    const nextY = Math.max(0, origin.y + deltaRows);
    const candidate = { x: nextX, y: nextY, w: item.w, h: item.h };
    const isInvalid = hasWorkspaceCollision(currentWorkspace!, candidate, itemId);
    card.style.transform = `translate(${dx}px, ${dy}px)`;
    card.style.zIndex = '5';
    card.classList.toggle('is-drag-invalid', isInvalid);
  };

  const onPointerUp = (upEvent: PointerEvent) => {
    const dx = upEvent.clientX - startX;
    const dy = upEvent.clientY - startY;
    const deltaCols = Math.round(dx / (metrics.columnWidth + metrics.gapX));
    const deltaRows = Math.round(dy / metrics.rowStep);
    const nextX = Math.max(0, Math.min(metrics.columns - item.w, origin.x + deltaCols));
    const nextY = Math.max(0, origin.y + deltaRows);
    const placement = resolveWorkspacePlacement(currentWorkspace!, origin, { x: nextX, y: nextY, w: item.w, h: item.h }, itemId);
    card.style.removeProperty('transform');
    card.style.removeProperty('z-index');
    card.classList.remove('is-drag-invalid');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (placement.x === item.x && placement.y === item.y) return;
    const nextWorkspace: WorkspaceConfig = {
      ...currentWorkspace!,
      items: currentWorkspace!.items.map((candidate) =>
        candidate.id === itemId ? { ...candidate, x: placement.x, y: placement.y } : candidate
      ),
      meta: {
        ...currentWorkspace!.meta,
        updatedAt: Date.now(),
      },
    };
    void commitWorkspaceMutation(nextWorkspace);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

function startWorkspaceResize(event: PointerEvent, itemId: string): void {
  if (!currentWorkspace) return;
  const item = currentWorkspace.items.find((candidate) => candidate.id === itemId);
  const card = document.querySelector(`.workspace-editor-card[data-item-id="${itemId}"]`) as HTMLElement | null;
  const metrics = item ? getGridMetrics(currentWorkspace) : null;
  if (!item || !card || !metrics) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { x: item.x, y: item.y, w: item.w, h: item.h };

  const onPointerMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    const deltaCols = Math.round(dx / (metrics.columnWidth + metrics.gapX));
    const deltaRows = Math.round(dy / metrics.rowStep);
    const previewW = Math.max(item.minW ?? 1, origin.w + deltaCols);
    const previewH = Math.max(item.minH ?? 1, origin.h + deltaRows);
    const boundedW = Math.max(item.minW ?? 1, Math.min(metrics.columns - item.x, previewW));
    const candidate = { x: item.x, y: item.y, w: boundedW, h: previewH };
    const isInvalid = hasWorkspaceCollision(currentWorkspace!, candidate, itemId);
    card.style.transform = `translate(${Math.max(0, dx) * 0.08}px, ${Math.max(0, dy) * 0.08}px)`;
    card.style.zIndex = '5';
    card.classList.toggle('is-drag-invalid', isInvalid);
  };

  const onPointerUp = (upEvent: PointerEvent) => {
    const dx = upEvent.clientX - startX;
    const dy = upEvent.clientY - startY;
    const deltaCols = Math.round(dx / (metrics.columnWidth + metrics.gapX));
    const deltaRows = Math.round(dy / metrics.rowStep);
    const rawNextW = Math.max(item.minW ?? 1, origin.w + deltaCols);
    const nextW = Math.max(item.minW ?? 1, Math.min(metrics.columns - item.x, rawNextW));
    const maxX = Math.min(metrics.columns - nextW, metrics.columns - 1);
    const nextH = Math.max(item.minH ?? 1, origin.h + deltaRows);
    const placement = resolveWorkspacePlacement(currentWorkspace!, origin, { x: Math.min(item.x, maxX), y: item.y, w: nextW, h: nextH }, itemId);
    card.style.removeProperty('transform');
    card.style.removeProperty('z-index');
    card.classList.remove('is-drag-invalid');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (placement.w === item.w && placement.h === item.h) return;
    const nextWorkspace: WorkspaceConfig = {
      ...currentWorkspace!,
      items: currentWorkspace!.items.map((candidate) =>
        candidate.id === itemId ? { ...candidate, x: placement.x, w: placement.w, h: placement.h } : candidate
      ),
      meta: {
        ...currentWorkspace!.meta,
        updatedAt: Date.now(),
      },
    };
    void commitWorkspaceMutation(nextWorkspace);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
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
    canvas.setAttribute('data-empty', 'true');
    canvas.innerHTML = '<div class="workspace-editor-empty">暂无工作区卡片，请先从卡片库添加。</div>';
    return;
  }

  applyCardGridStyles(workspace);
  canvas.removeAttribute('data-empty');
  canvas.innerHTML = workspace.items.map((item) => {
    const title = getCardDisplayTitle(item as Record<string, any>);
    const gridStyle = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    const content = renderWorkspaceCardContent(item as Record<string, any>);
    return `
      <article class="workspace-editor-card ${content.extraClassName ?? ''}" style="${gridStyle}" data-item-id="${item.id}" data-width="${item.w}" data-height="${item.h}" data-template-id="${item.templateId}">
        <header class="workspace-editor-card-header">
          <div class="workspace-editor-card-header-main">
            <button class="workspace-editor-card-drag-handle" type="button" data-action="drag-card" aria-label="拖拽卡片" title="拖拽卡片">⋮⋮</button>
            <div class="workspace-editor-card-title">${title}</div>
          </div>
          <div class="workspace-editor-card-header-actions">
            <div class="workspace-editor-card-meta">${item.templateId}</div>
            <button class="workspace-editor-card-delete" type="button" data-action="delete-card" aria-label="删除卡片" title="删除卡片">×</button>
          </div>
        </header>
        <div class="workspace-editor-card-content">
          ${content.body}
        </div>
        <button class="workspace-editor-card-resize-handle" type="button" data-action="resize-card" aria-label="缩放卡片" title="缩放卡片">↘</button>
      </article>
    `;
  }).join('');
  bindWorkspaceCardSelection();
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
    const dragHandle = card.querySelector('[data-action="drag-card"]');
    dragHandle?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        startWorkspaceDrag(event as PointerEvent, itemId);
      }
    });
    const resizeHandle = card.querySelector('[data-action="resize-card"]');
    resizeHandle?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        startWorkspaceResize(event as PointerEvent, itemId);
      }
    });
  });
}

function renderCardLibraryList(items: Array<Record<string, any>>): void {
  const container = document.getElementById('workspaceCardLibraryList');
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="workspace-editor-empty">暂无可用卡片模板。</div>';
    return;
  }
  container.innerHTML = items.map((item) => {
    const previewStyle = item.previewImageUrl
      ? ` style="background-image: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(129, 140, 248, 0.06)), url('${String(item.previewImageUrl).replace(/"/g, '&quot;')}');"`
      : '';
    return `
      <article class="workspace-card-library-item" data-template-type="${item.type}">
        <div class="workspace-card-library-thumb"${previewStyle}>模板预览</div>
        <div class="workspace-card-library-item-title">${item.name || item.type}</div>
        <div class="workspace-card-library-item-meta">${item.category || '未分类'} · ${item.defaultW || 2} x ${item.defaultH || 12}</div>
        <div class="workspace-card-library-item-meta">${item.description || '从后台卡片库选择后加入当前工作区'}</div>
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
  const title = item ? getCardDisplayTitle(item as Record<string, any>) : '未选中卡片';
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
