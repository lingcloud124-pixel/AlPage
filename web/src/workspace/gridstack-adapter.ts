import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';
import type { GridStackNode, GridStackOptions } from 'gridstack';
import type { WorkspaceConfig } from '../types';

export interface WorkspaceGridMountOptions {
  canvas: HTMLElement;
  workspace: WorkspaceConfig;
  onLayoutChange: (items: WorkspaceConfig['items']) => void;
}

let mountedGrid: GridStack | null = null;
let isApplyingLayout = false;

function toGridOptions(workspace: WorkspaceConfig): GridStackOptions {
  return {
    column: Math.max(1, Number(workspace.settings.columns || 4)),
    cellHeight: Number(workspace.settings.rowHeight || 24),
    margin: `${Number(workspace.settings.gapY || 16)}px ${Number(workspace.settings.gapX || 16)}px`,
    float: false,
    animate: true,
    draggable: {
      handle: '.workspace-editor-card-drag-handle',
    },
    resizable: {
      handles: 'se',
    },
  };
}

function applyNodeToItem(item: WorkspaceConfig['items'][number], node: GridStackNode): WorkspaceConfig['items'][number] {
  return {
    ...item,
    x: Number(node.x ?? item.x),
    y: Number(node.y ?? item.y),
    w: Number(node.w ?? item.w),
    h: Number(node.h ?? item.h),
  };
}

export function destroyWorkspaceGrid(): void {
  if (!mountedGrid) return;
  mountedGrid.offAll();
  mountedGrid.destroy(false);
  mountedGrid = null;
}

export function mountWorkspaceGrid({ canvas, workspace, onLayoutChange }: WorkspaceGridMountOptions): GridStack {
  destroyWorkspaceGrid();
  canvas.classList.add('grid-stack');
  mountedGrid = GridStack.init(toGridOptions(workspace), canvas);

  isApplyingLayout = true;
  workspace.items.forEach((item) => {
    const element = canvas.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`) as HTMLElement | null;
    if (!element) return;
    mountedGrid?.makeWidget(element, {
      id: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW ?? 1,
      minH: item.minH ?? 1,
    });
  });
  isApplyingLayout = false;

  mountedGrid.on('change', (_event, nodes) => {
    if (isApplyingLayout || !Array.isArray(nodes) || nodes.length === 0) return;
    const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
    const nextItems = workspace.items.map((item) => {
      const node = nodeById.get(item.id);
      return node ? applyNodeToItem(item, node) : item;
    });
    onLayoutChange(nextItems);
  });

  return mountedGrid;
}
