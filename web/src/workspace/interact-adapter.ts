import type { WorkspaceConfig } from '../types';

export interface WorkspaceGridMountOptions {
  canvas: HTMLElement;
  workspace: WorkspaceConfig;
  onLayoutChange: (items: WorkspaceConfig['items']) => void;
}

type WorkspaceItem = WorkspaceConfig['items'][number];

let cleanupFns: Array<() => void> = [];
let guideOverlay: HTMLElement | null = null;

/* ---- grid metrics ---- */

function computeGridMetrics(canvas: HTMLElement, workspace: WorkspaceConfig) {
  const columns = Math.max(1, Number(workspace.settings.columns || 4));
  const cs = getComputedStyle(canvas);
  const gapX = parseFloat(cs.getPropertyValue('--workspace-gap-x')) || Number(workspace.settings.gapX || 16);
  const gapY = parseFloat(cs.getPropertyValue('--workspace-gap-y')) || Number(workspace.settings.gapY || 16);
  const paddingX = parseFloat(cs.getPropertyValue('--workspace-padding-x')) || Number(workspace.settings.paddingX || 20);
  const paddingY = parseFloat(cs.getPropertyValue('--workspace-padding-y')) || Number(workspace.settings.paddingY || 20);
  const rowHeight = parseFloat(cs.getPropertyValue('--workspace-row-height')) || Number(workspace.settings.rowHeight || 24);
  const canvasWidth = canvas.clientWidth;
  const cellWidth = canvasWidth > 0 ? (canvasWidth - paddingX * 2 - gapX * (columns - 1)) / columns : 100;
  const stepX = Math.max(1, cellWidth) + gapX;
  const stepY = rowHeight + gapY;
  return { columns, gapX, gapY, paddingX, paddingY, rowHeight, cellWidth: Math.max(1, cellWidth), stepX, stepY, canvasWidth };
}

/* ---- layout engine ---- */

function collides(a: WorkspaceItem, b: WorkspaceItem): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function getCollisions(items: WorkspaceConfig['items'], item: WorkspaceItem): WorkspaceItem[] {
  return sortByPosition(items).filter((candidate) => candidate.id !== item.id && collides(candidate, item));
}

function hasCollision(items: WorkspaceConfig['items'], item: WorkspaceItem): boolean {
  return items.some((candidate) => candidate.id !== item.id && collides(candidate, item));
}

function sortByPosition(items: WorkspaceConfig['items']): WorkspaceConfig['items'] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

function findNextAvailablePosition(
  items: WorkspaceConfig['items'],
  item: WorkspaceItem,
  columns: number,
): { x: number; y: number } {
  const width = Math.max(1, Math.min(columns, item.w));
  const startY = Math.max(0, item.y);
  const maxY = Math.max(...items.map((candidate) => candidate.y + candidate.h), startY) + item.h + 20;

  for (let y = startY; y <= maxY; y += 1) {
    const startX = y === startY ? Math.max(0, item.x + 1) : 0;
    for (let x = startX; x <= columns - width; x += 1) {
      const candidate = { ...item, x, y };
      if (!hasCollision(items, candidate)) return { x, y };
    }
  }

  return { x: 0, y: maxY + 1 };
}

function pushCollisionsRightThenDown(items: WorkspaceConfig['items'], item: WorkspaceItem, columns: number): void {
  let guard = 0;
  let collisions = getCollisions(items, item);

  while (collisions.length > 0 && guard++ < 200) {
    for (const collision of collisions) {
      const nextPosition = findNextAvailablePosition(items, collision, columns);
      collision.x = nextPosition.x;
      collision.y = nextPosition.y;
      pushCollisionsRightThenDown(items, collision, columns);
    }
    collisions = getCollisions(items, item);
  }
}

function compactLayout(items: WorkspaceConfig['items'], columns: number): WorkspaceConfig['items'] {
  const sorted = sortByPosition(items).map((item) => ({ ...item }));

  for (const item of sorted) {
    let moved = true;
    while (moved) {
      moved = false;
      if (item.x > 0) {
        const leftItem = { ...item, x: item.x - 1 };
        if (!hasCollision(sorted, leftItem)) {
          item.x -= 1;
          moved = true;
          continue;
        }
      }
      if (item.y > 0) {
        const upItem = { ...item, y: item.y - 1 };
        if (!hasCollision(sorted, upItem)) {
          item.y -= 1;
          moved = true;
        }
      }
    }
    item.x = Math.max(0, Math.min(columns - item.w, item.x));
  }

  return sortByPosition(sorted);
}

function buildPreviewLayout(
  items: WorkspaceConfig['items'],
  draggedId: string,
  targetX: number,
  targetY: number,
  columns: number,
): WorkspaceConfig['items'] {
  const next = items.map((item) => ({ ...item }));
  const dragged = next.find((item) => item.id === draggedId);
  if (!dragged) return next;

  dragged.x = targetX;
  dragged.y = targetY;
  pushCollisionsRightThenDown(next, dragged, columns);
  return compactLayout(next, columns);
}

/* ---- placeholder ---- */

function ensurePlaceholder(canvas: HTMLElement): HTMLElement {
  const existing = canvas.querySelector<HTMLElement>('[data-grid-placeholder]');
  if (existing) return existing;

  const el = document.createElement('div');
  el.className = 'workspace-editor-grid-placeholder';
  el.setAttribute('data-grid-placeholder', 'true');
  canvas.appendChild(el);
  return el;
}

function movePlaceholder(ph: HTMLElement, x: number, y: number, w: number, h: number): void {
  ph.style.gridColumn = `${x + 1} / span ${w}`;
  ph.style.gridRow = `${y + 1} / span ${h}`;
}

function removePlaceholder(canvas: HTMLElement): void {
  canvas.querySelectorAll('[data-grid-placeholder]').forEach((el) => el.remove());
}

/* ---- alignment guides ---- */

function getAlignmentGuides(
  metrics: ReturnType<typeof computeGridMetrics>,
  items: WorkspaceConfig['items'],
  cx: number, cy: number, cw: number, ch: number, ignoreId: string,
): Array<{ type: 'vertical' | 'horizontal'; position: number }> {
  const guides: Array<{ type: 'vertical' | 'horizontal'; position: number }> = [];
  const { paddingX, paddingY, stepX, stepY, gapX, gapY } = metrics;
  const seen = new Set<string>();
  const add = (type: 'vertical' | 'horizontal', position: number) => {
    const key = `${type}:${Math.round(position)}`;
    if (!seen.has(key)) { seen.add(key); guides.push({ type, position }); }
  };
  for (const o of items) {
    if (o.id === ignoreId) continue;
    if (cx === o.x) add('vertical', paddingX + o.x * stepX);
    if (cx + cw === o.x + o.w) add('vertical', paddingX + (o.x + o.w) * stepX - gapX);
    if (cy === o.y) add('horizontal', paddingY + o.y * stepY);
    if (cy + ch === o.y + o.h) add('horizontal', paddingY + (o.y + o.h) * stepY - gapY);
  }
  return guides;
}

function ensureGuideOverlay(canvas: HTMLElement): HTMLElement {
  if (guideOverlay && guideOverlay.parentElement === canvas) return guideOverlay;
  guideOverlay = document.createElement('div');
  guideOverlay.className = 'workspace-editor-guide-overlay';
  canvas.appendChild(guideOverlay);
  return guideOverlay;
}

function renderGuides(overlay: HTMLElement, guides: Array<{ type: string; position: number }>): void {
  overlay.innerHTML = guides.map((g) =>
    g.type === 'horizontal'
      ? `<div class="workspace-editor-guide workspace-editor-guide-h" style="top:${g.position}px"></div>`
      : `<div class="workspace-editor-guide workspace-editor-guide-v" style="left:${g.position}px"></div>`
  ).join('');
}

function clearGuides(): void { if (guideOverlay) guideOverlay.innerHTML = ''; }

/* ---- card helpers ---- */

function updateCardGridStyle(card: HTMLElement, x: number, y: number, w: number, h: number): void {
  card.style.gridColumn = `${x + 1} / span ${w}`;
  card.style.gridRow = `${y + 1} / span ${h}`;
}

function applyPreviewLayout(canvas: HTMLElement, items: WorkspaceConfig['items'], draggedId: string): void {
  for (const item of items) {
    if (item.id === draggedId) continue;
    const card = canvas.querySelector<HTMLElement>(`[data-item-id="${item.id}"]`);
    if (card) updateCardGridStyle(card, item.x, item.y, item.w, item.h);
  }
}

function restoreLayout(canvas: HTMLElement, items: WorkspaceConfig['items'], draggedId: string): void {
  for (const item of items) {
    if (item.id === draggedId) continue;
    const card = canvas.querySelector<HTMLElement>(`[data-item-id="${item.id}"]`);
    if (card) updateCardGridStyle(card, item.x, item.y, item.w, item.h);
  }
}

function samePosition(a: WorkspaceItem, b: WorkspaceItem): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/* ---- main ---- */

export function destroyWorkspaceGrid(): void {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  clearGuides();
}

export function mountWorkspaceGrid({ canvas, workspace, onLayoutChange }: WorkspaceGridMountOptions): void {
  destroyWorkspaceGrid();

  const metrics = computeGridMetrics(canvas, workspace);
  const overlay = ensureGuideOverlay(canvas);
  const cards = canvas.querySelectorAll<HTMLElement>('.workspace-editor-card');

  cards.forEach((card) => {
    const itemId = card.getAttribute('data-item-id') ?? '';
    const item = workspace.items.find((i) => i.id === itemId);
    if (!item) return;

    const minW = item.minW ?? 1;
    const minH = item.minH ?? 1;

    /* ============ DRAG (原生 pointer events) ============ */

    const dragHandle = card.querySelector<HTMLElement>('.workspace-editor-card-drag-handle');
    if (dragHandle) {
      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const cardRect = card.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const startLeft = cardRect.left - canvasRect.left;
        const startTop = cardRect.top - canvasRect.top;
        const startW = cardRect.width;
        const startH = cardRect.height;
        const startPointerX = e.clientX;
        const startPointerY = e.clientY;

        card.style.position = 'absolute';
        card.style.left = `${startLeft}px`;
        card.style.top = `${startTop}px`;
        card.style.width = `${startW}px`;
        card.style.height = `${startH}px`;
        card.style.zIndex = '10';
        card.style.gridColumn = '';
        card.style.gridRow = '';
        card.classList.add('is-dragging');

        let currentLeft = startLeft;
        let currentTop = startTop;
        let lastTx = item.x;
        let lastTy = item.y;
        let lastPreviewLayout: WorkspaceConfig['items'] | null = null;

        const onMove = (me: PointerEvent) => {
          const dx = me.clientX - startPointerX;
          const dy = me.clientY - startPointerY;
          currentLeft = startLeft + dx;
          currentTop = startTop + dy;
          card.style.left = `${currentLeft}px`;
          card.style.top = `${currentTop}px`;

          const centerX = currentLeft + startW / 2;
          const centerY = currentTop + startH / 2;
          const targetX = Math.max(0, Math.min(metrics.columns - item.w, Math.floor((centerX - metrics.paddingX) / metrics.stepX)));
          const targetY = Math.max(0, Math.floor((centerY - metrics.paddingY) / metrics.stepY));

          if (targetX !== lastTx || targetY !== lastTy) {
            lastTx = targetX;
            lastTy = targetY;
            lastPreviewLayout = buildPreviewLayout(workspace.items, itemId, targetX, targetY, metrics.columns);
            applyPreviewLayout(canvas, lastPreviewLayout, itemId);

            const draggedPreview = lastPreviewLayout.find((i) => i.id === itemId) ?? item;
            movePlaceholder(ensurePlaceholder(canvas), draggedPreview.x, draggedPreview.y, draggedPreview.w, draggedPreview.h);
          }

          renderGuides(overlay, getAlignmentGuides(metrics, lastPreviewLayout ?? workspace.items, lastTx, lastTy, item.w, item.h, itemId));
        };

        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);

          card.classList.remove('is-dragging');
          card.style.position = '';
          card.style.left = '';
          card.style.top = '';
          card.style.width = '';
          card.style.height = '';
          card.style.zIndex = '';
          removePlaceholder(canvas);
          clearGuides();

          if (!lastPreviewLayout) {
            restoreLayout(canvas, workspace.items, itemId);
            updateCardGridStyle(card, item.x, item.y, item.w, item.h);
            return;
          }

          const draggedPreview = lastPreviewLayout.find((i) => i.id === itemId);
          if (draggedPreview && samePosition(draggedPreview, item)) {
            restoreLayout(canvas, workspace.items, itemId);
            updateCardGridStyle(card, item.x, item.y, item.w, item.h);
            return;
          }

          onLayoutChange(lastPreviewLayout);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      };

      dragHandle.addEventListener('pointerdown', onDown);
      cleanupFns.push(() => dragHandle.removeEventListener('pointerdown', onDown));
    }

    /* ============ RESIZE (原生 pointer events) ============ */

    const resizeHandle = card.querySelector<HTMLElement>('.workspace-editor-card-resize-handle');
    if (resizeHandle) {
      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startPointerX = e.clientX;
        const startPointerY = e.clientY;
        const cardRect = card.getBoundingClientRect();

        card.classList.add('is-resizing');
        let resizePlaceholder: HTMLElement | null = null;
        let lastW = item.w;
        let lastH = item.h;

        const onMove = (me: PointerEvent) => {
          const dx = me.clientX - startPointerX;
          const dy = me.clientY - startPointerY;
          const newPixelW = cardRect.width + dx;
          const newPixelH = cardRect.height + dy;
          const newW = Math.max(minW, Math.min(metrics.columns - item.x, Math.round(newPixelW / metrics.stepX)));
          const newH = Math.max(minH, Math.round(newPixelH / metrics.stepY));

          lastW = newW;
          lastH = newH;
          updateCardGridStyle(card, item.x, item.y, newW, newH);

          if (newW !== item.w || newH !== item.h) {
            if (!resizePlaceholder) {
              resizePlaceholder = ensurePlaceholder(canvas);
            }
            movePlaceholder(resizePlaceholder, item.x, item.y, newW, newH);
          }

          renderGuides(overlay, getAlignmentGuides(metrics, workspace.items, item.x, item.y, newW, newH, itemId));
        };

        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);

          card.classList.remove('is-resizing');
          removePlaceholder(canvas);
          clearGuides();

          if (lastW === item.w && lastH === item.h) {
            updateCardGridStyle(card, item.x, item.y, item.w, item.h);
            return;
          }
          onLayoutChange(workspace.items.map((i) =>
            i.id === itemId ? { ...i, w: lastW, h: lastH } : i
          ));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      };

      resizeHandle.addEventListener('pointerdown', onDown);
      cleanupFns.push(() => resizeHandle.removeEventListener('pointerdown', onDown));
    }
  });
}
