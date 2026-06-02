# GridStack Workspace Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portal preview homepage render the same workspace card layout as “工作区设计”, and replace the incomplete custom drag/resize implementation with GridStack.js.

**Architecture:** `WorkspaceConfig` remains the single source of truth for card layout. A new shared renderer produces card DOM for both preview and editor; GridStack owns editor layout interactions and writes `x/y/w/h` changes back to `WorkspaceConfig`. The preview homepage renders the same card content without editor controls and refreshes immediately after editor mutations.

**Tech Stack:** Vanilla TypeScript, Vite, GridStack.js, Vitest contract tests, existing Express persistence APIs.

---

## File Structure

- Modify: `web/package.json` — add `gridstack` dependency.
- Modify: `web/src/types.ts` — keep existing `WorkspaceConfig` shape; no schema changes unless tests reveal a missing field.
- Create: `web/src/workspace/card-renderer.ts` — shared card content/title rendering used by preview and editor.
- Create: `web/src/workspace/preview.ts` — render `WorkspaceConfig` into the desktop preview work area.
- Create: `web/src/workspace/gridstack-adapter.ts` — initialize/destroy GridStack, load widgets, map change events to workspace item updates.
- Modify: `web/src/workspace/runtime.ts` — remove custom pointer drag/resize paths, use shared renderer + GridStack adapter, refresh preview after mutations.
- Modify: `web/src/ui-setup.ts` — ensure main preview template can be hydrated with workspace content after `renderTemplate('desktop', mainPage)`.
- Modify: `web/src/main.ts` and `web/src/chat-manager.ts` — call preview renderer whenever a project/workspace is loaded or mutated.
- Modify: `web/src/styles/workspace.css` — add GridStack item shell styling and preview/editor mode differences.
- Tests: `tests/unit/WorkspacePreviewSyncContracts.test.ts` — preview must use workspace renderer rather than independent static content.
- Tests: `tests/unit/WorkspaceGridStackContracts.test.ts` — editor must initialize GridStack and persist `change` events.
- Tests: update existing workspace editor tests that assert old pointer handlers.

---

### Task 1: Add dependency and contract tests for preview/editor synchronization

**Files:**
- Modify: `web/package.json`
- Create: `tests/unit/WorkspacePreviewSyncContracts.test.ts`
- Create: `tests/unit/WorkspaceGridStackContracts.test.ts`

- [ ] **Step 1: Add GridStack dependency to `web/package.json`**

Add this dependency under `dependencies`:

```json
"gridstack": "^12.3.3"
```

The dependencies block should include:

```json
"dependencies": {
  "file-saver": "^2.0.5",
  "gridstack": "^12.3.3",
  "jszip": "^3.10.1",
  "marked": "^18.0.0",
  "playwright": "^1.52.0"
}
```

- [ ] **Step 2: Install dependency**

Run:

```bash
cd web && npm install
```

Expected: `web/package-lock.json` updates and install exits 0.

- [ ] **Step 3: Write failing preview sync contract test**

Create `tests/unit/WorkspacePreviewSyncContracts.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

describe('workspace preview synchronization contracts', () => {
  test('desktop preview renders workspace config through the shared preview renderer', () => {
    const preview = read('web/src/workspace/preview.ts');
    const uiSetup = read('web/src/ui-setup.ts');
    const main = read('web/src/main.ts');
    const chatManager = read('web/src/chat-manager.ts');

    expect(preview).toContain('export function renderWorkspacePreview');
    expect(preview).toContain('WorkspaceConfig');
    expect(preview).toContain('workspace-preview-card');
    expect(preview).toContain('renderWorkspaceCardShell');

    expect(uiSetup).toContain('renderWorkspacePreview');
    expect(uiSetup).toMatch(/renderTemplate\('desktop', mainPage\)[\s\S]*?renderWorkspacePreview/);

    expect(main).toContain('renderWorkspacePreview');
    expect(main).toMatch(/restoreFromSnapshot\(snapshot\);[\s\S]*?renderWorkspacePreview/);

    expect(chatManager).toContain('renderWorkspacePreview');
    expect(chatManager).toMatch(/renderWorkspaceEditorShell\(project\.workspace \?\? null\);[\s\S]*?renderWorkspacePreview/);
  });
});
```

- [ ] **Step 4: Write failing GridStack contract test**

Create `tests/unit/WorkspaceGridStackContracts.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

describe('workspace gridstack integration contracts', () => {
  test('editor delegates drag and resize to GridStack and persists change events', () => {
    const adapter = read('web/src/workspace/gridstack-adapter.ts');
    const runtime = read('web/src/workspace/runtime.ts');
    const css = read('web/src/styles/workspace.css');

    expect(adapter).toContain("import 'gridstack/dist/gridstack.min.css'");
    expect(adapter).toContain("import { GridStack }");
    expect(adapter).toContain('export function mountWorkspaceGrid');
    expect(adapter).toContain('GridStack.init');
    expect(adapter).toContain("grid.on('change'");
    expect(adapter).toContain('onLayoutChange');
    expect(adapter).toContain('grid.destroy(false)');

    expect(runtime).toContain('mountWorkspaceGrid');
    expect(runtime).not.toContain('function startWorkspaceDrag');
    expect(runtime).not.toContain('function startWorkspaceResize');
    expect(runtime).not.toContain("window.addEventListener('pointermove'");

    expect(css).toContain('.grid-stack');
    expect(css).toContain('.grid-stack-item-content');
  });
});
```

- [ ] **Step 5: Run tests to verify RED**

Run:

```bash
npx vitest run tests/unit/WorkspacePreviewSyncContracts.test.ts tests/unit/WorkspaceGridStackContracts.test.ts
```

Expected: FAIL because `web/src/workspace/preview.ts` and `web/src/workspace/gridstack-adapter.ts` do not exist yet, and runtime still has custom pointer handlers.

- [ ] **Step 6: Commit dependency and failing tests**

```bash
git add web/package.json web/package-lock.json tests/unit/WorkspacePreviewSyncContracts.test.ts tests/unit/WorkspaceGridStackContracts.test.ts
git commit -m "test: add workspace sync and gridstack contracts"
```

---

### Task 2: Extract shared workspace card renderer

**Files:**
- Create: `web/src/workspace/card-renderer.ts`
- Modify: `web/src/workspace/runtime.ts`
- Test: `tests/unit/WorkspacePreviewSyncContracts.test.ts`

- [ ] **Step 1: Create shared renderer file**

Create `web/src/workspace/card-renderer.ts`:

```ts
import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';

const CARD_TITLES: Record<string, string> = {
  'message-todo': '待办事务',
  'news-carousel': '新闻轮播',
  'my-schedule': '我的日程',
  'quick-access': '快捷入口',
};

export interface WorkspaceCardRenderContext {
  mode: 'editor' | 'preview';
  templateCache: Record<string, CardTemplateListItem>;
}

export interface WorkspaceCardShellOptions {
  item: WorkspaceConfig['items'][number];
  context: WorkspaceCardRenderContext;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTemplateProps(item: WorkspaceConfig['items'][number], templateCache: Record<string, CardTemplateListItem>): Record<string, any> {
  const template = templateCache[item.templateId] ?? null;
  return {
    ...((template?.defaultProps as Record<string, unknown>) ?? {}),
    ...((item.instanceProps as Record<string, unknown>) ?? {}),
  };
}

export function getWorkspaceCardTitle(item: WorkspaceConfig['items'][number], templateCache: Record<string, CardTemplateListItem>): string {
  const instanceTitle = typeof item.instanceProps?.title === 'string' ? item.instanceProps.title.trim() : '';
  const template = templateCache[item.templateId] ?? null;
  return instanceTitle || String(template?.defaultProps?.title || template?.name || CARD_TITLES[item.templateId] || item.templateId);
}

function renderListItems(items: Array<Record<string, unknown>>, labelKey: string, metaKey: string): string {
  return items
    .map((entry) => `<div class="workspace-card-list-item"><span>${escapeHtml(entry[labelKey])}</span><strong>${escapeHtml(entry[metaKey])}</strong></div>`)
    .join('');
}

function renderCardBody(item: WorkspaceConfig['items'][number], templateCache: Record<string, CardTemplateListItem>): string {
  const props = getTemplateProps(item, templateCache);
  const itemCount = Number(props.itemCount ?? 4);

  if (item.templateId === 'message-todo') {
    const items = Array.isArray(props.items) ? props.items.slice(0, itemCount) : [];
    return `
      ${props.summary ? `<div class="workspace-card-summary">${escapeHtml(props.summary)}</div>` : ''}
      <div class="workspace-card-list">${renderListItems(items, 'label', 'meta')}</div>
    `;
  }

  if (item.templateId === 'news-carousel') {
    const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? 2)) : [];
    return `
      <div class="workspace-card-news-hero">
        <div class="workspace-card-news-badge">${escapeHtml(props.badge || '专题')}</div>
        <div class="workspace-card-news-title">${escapeHtml(props.headline || '新闻标题')}</div>
        <div class="workspace-card-news-copy">${escapeHtml(props.summary || '新闻摘要')}</div>
      </div>
      <div class="workspace-card-list">${renderListItems(items, 'title', 'meta')}</div>
    `;
  }

  if (item.templateId === 'my-schedule') {
    const items = Array.isArray(props.items) ? props.items.slice(0, itemCount) : [];
    return items
      .map((entry: Record<string, unknown>) => `
        <div class="workspace-card-schedule-item">
          <div>
            <div class="workspace-card-schedule-title">${escapeHtml(entry.title)}</div>
            <div class="workspace-card-schedule-meta">${escapeHtml(entry.meta)}</div>
          </div>
          <strong>${escapeHtml(entry.status)}</strong>
        </div>
      `)
      .join('');
  }

  if (item.templateId === 'quick-access') {
    const links = Array.isArray(props.links) ? props.links.slice(0, itemCount) : [];
    return `<div class="workspace-card-quick-links">${links.map((label: unknown) => `<button type="button">${escapeHtml(label)}</button>`).join('')}</div>`;
  }

  return '<div class="workspace-card-summary">卡片内容占位</div>';
}

export function renderWorkspaceCardShell({ item, context }: WorkspaceCardShellOptions): string {
  const title = getWorkspaceCardTitle(item, context.templateCache);
  const body = renderCardBody(item, context.templateCache);
  const isEditor = context.mode === 'editor';
  const shellClass = isEditor ? 'workspace-editor-card' : 'workspace-preview-card';
  const contentClass = isEditor ? 'workspace-editor-card-content' : 'workspace-preview-card-content';
  const headerControls = isEditor
    ? `
      <button class="workspace-editor-card-drag-handle" type="button" data-action="drag-card" aria-label="拖拽卡片" title="拖拽卡片">⋮⋮</button>
      <button class="workspace-editor-card-delete" type="button" data-action="delete-card" aria-label="删除卡片" title="删除卡片">×</button>
    `
    : '';
  const resizeHandle = isEditor ? '<button class="workspace-editor-card-resize-handle" type="button" data-action="resize-card" aria-label="缩放卡片" title="缩放卡片">↘</button>' : '';

  return `
    <article class="${shellClass}" data-item-id="${escapeHtml(item.id)}" data-template-id="${escapeHtml(item.templateId)}">
      <header class="workspace-editor-card-header">
        <div class="workspace-editor-card-header-main">
          ${isEditor ? headerControls : ''}
          <div class="workspace-editor-card-title">${escapeHtml(title)}</div>
        </div>
        ${isEditor ? `<div class="workspace-editor-card-meta">${escapeHtml(item.templateId)}</div>` : ''}
      </header>
      <div class="${contentClass}">${body}</div>
      ${resizeHandle}
    </article>
  `;
}
```

- [ ] **Step 2: Remove duplicated render helpers from runtime**

In `web/src/workspace/runtime.ts`, remove local `CARD_TITLES`, `WorkspaceCardContent`, `escapeHtml`, `buildCardRows`, `renderTodoCardContent`, `renderNewsCardContent`, `renderScheduleCardContent`, `renderQuickAccessCardContent`, `renderWorkspaceCardContent`, and `getCardDisplayTitle`.

Add imports:

```ts
import { getWorkspaceCardTitle, renderWorkspaceCardShell } from './card-renderer';
```

Update property panel title usage:

```ts
const title = item ? getWorkspaceCardTitle(item, workspaceTemplateCache) : '未选中卡片';
```

- [ ] **Step 3: Keep runtime rendering behavior passing existing tests**

Temporarily update `renderWorkspaceEditorShell()` to call the shared shell while still using CSS grid:

```ts
canvas.innerHTML = workspace.items.map((item) => {
  const gridStyle = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
  const shell = renderWorkspaceCardShell({ item, context: { mode: 'editor', templateCache: workspaceTemplateCache } });
  return shell.replace('<article class="workspace-editor-card"', `<article class="workspace-editor-card" style="${gridStyle}" data-width="${item.w}" data-height="${item.h}"`);
}).join('');
```

- [ ] **Step 4: Run workspace renderer-related tests**

Run:

```bash
npx vitest run tests/unit/WorkspaceEditorRichCardContent.test.ts tests/unit/WorkspaceEditorTemplateDrivenContent.test.ts tests/unit/WorkspaceEditorPropertyForms.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit shared renderer extraction**

```bash
git add web/src/workspace/card-renderer.ts web/src/workspace/runtime.ts
git commit -m "refactor: share workspace card rendering"
```

---

### Task 3: Add preview renderer and wire preview homepage to workspace data

**Files:**
- Create: `web/src/workspace/preview.ts`
- Modify: `web/src/ui-setup.ts`
- Modify: `web/src/main.ts`
- Modify: `web/src/chat-manager.ts`
- Test: `tests/unit/WorkspacePreviewSyncContracts.test.ts`

- [ ] **Step 1: Create preview renderer**

Create `web/src/workspace/preview.ts`:

```ts
import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';
import { renderWorkspaceCardShell } from './card-renderer';

export function renderWorkspacePreview(target: HTMLElement | null, workspace: WorkspaceConfig | null, templateCache: Record<string, CardTemplateListItem> = {}): void {
  if (!target) return;
  const host = target.querySelector('.portal-workspace-preview-host') as HTMLElement | null
    ?? target.querySelector('.desktop-main-content') as HTMLElement | null
    ?? target.querySelector('main') as HTMLElement | null
    ?? target;

  if (!workspace || !Array.isArray(workspace.items) || workspace.items.length === 0) {
    host.innerHTML = '<div class="workspace-preview-empty">暂无工作区卡片，请在工作区设计中添加。</div>';
    return;
  }

  host.classList.add('portal-workspace-preview-host');
  host.style.setProperty('--workspace-columns', String(workspace.settings.columns || 4));
  host.style.setProperty('--workspace-row-height', `${workspace.settings.rowHeight || 24}px`);
  host.style.setProperty('--workspace-gap-x', `${workspace.settings.gapX || 16}px`);
  host.style.setProperty('--workspace-gap-y', `${workspace.settings.gapY || 16}px`);
  host.style.setProperty('--workspace-padding-x', `${workspace.settings.paddingX || 20}px`);
  host.style.setProperty('--workspace-padding-y', `${workspace.settings.paddingY || 20}px`);

  host.innerHTML = workspace.items.map((item) => {
    const style = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    return renderWorkspaceCardShell({ item, context: { mode: 'preview', templateCache } })
      .replace('<article class="workspace-preview-card"', `<article class="workspace-preview-card" style="${style}"`);
  }).join('');
}
```

- [ ] **Step 2: Wire initial template render to preview renderer**

In `web/src/ui-setup.ts`, import:

```ts
import { getCurrentProjectId, loadProject } from './project-manager';
import { renderWorkspacePreview } from './workspace/preview';
```

After `await renderTemplate('desktop', mainPage);`, add:

```ts
const projectId = getCurrentProjectId();
const project = projectId ? await loadProject(projectId) : null;
renderWorkspacePreview(mainPage, project?.workspace ?? null);
```

- [ ] **Step 3: Wire restored projects to preview renderer**

In `web/src/main.ts`, import:

```ts
import { renderWorkspacePreview } from './workspace/preview';
```

After `renderWorkspaceEditorShell(project.workspace ?? null);` in the `sidebar:restore-project` handler, add:

```ts
renderWorkspacePreview(document.getElementById('mainPage'), project.workspace ?? null);
```

- [ ] **Step 4: Wire chat-generated projects to preview renderer**

In `web/src/chat-manager.ts`, import:

```ts
import { renderWorkspacePreview } from './workspace/preview';
```

After each `renderWorkspaceEditorShell(project.workspace ?? null);`, add:

```ts
renderWorkspacePreview(document.getElementById('mainPage'), project.workspace ?? null);
```

- [ ] **Step 5: Add preview CSS**

In `web/src/styles/workspace.css`, add:

```css
.portal-workspace-preview-host {
  display: grid;
  grid-template-columns: repeat(var(--workspace-columns, 4), minmax(0, 1fr));
  grid-auto-rows: var(--workspace-row-height, 24px);
  column-gap: var(--workspace-gap-x, 16px);
  row-gap: var(--workspace-gap-y, 16px);
  padding: var(--workspace-padding-y, 20px) var(--workspace-padding-x, 20px);
  align-content: start;
}

.workspace-preview-card {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.workspace-preview-card-content {
  padding: 14px 16px 16px;
}

.workspace-preview-empty {
  padding: 24px;
  border: 1px dashed rgba(15, 23, 42, 0.2);
  border-radius: 16px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.72);
}
```

- [ ] **Step 6: Run preview sync test**

Run:

```bash
npx vitest run tests/unit/WorkspacePreviewSyncContracts.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit preview sync**

```bash
git add web/src/workspace/preview.ts web/src/ui-setup.ts web/src/main.ts web/src/chat-manager.ts web/src/styles/workspace.css tests/unit/WorkspacePreviewSyncContracts.test.ts
git commit -m "feat: sync workspace layout into portal preview"
```

---

### Task 4: Replace custom drag/resize with GridStack adapter

**Files:**
- Create: `web/src/workspace/gridstack-adapter.ts`
- Modify: `web/src/workspace/runtime.ts`
- Modify: `web/src/styles/workspace.css`
- Test: `tests/unit/WorkspaceGridStackContracts.test.ts`

- [ ] **Step 1: Create GridStack adapter**

Create `web/src/workspace/gridstack-adapter.ts`:

```ts
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
```

- [ ] **Step 2: Update editor shell markup for GridStack**

In `renderWorkspaceEditorShell()` in `web/src/workspace/runtime.ts`, replace CSS-grid inline style rendering with GridStack item attributes:

```ts
canvas.classList.add('grid-stack');
canvas.innerHTML = workspace.items.map((item) => {
  const shell = renderWorkspaceCardShell({ item, context: { mode: 'editor', templateCache: workspaceTemplateCache } });
  return shell
    .replace('<article class="workspace-editor-card"', `<article class="workspace-editor-card grid-stack-item" gs-id="${item.id}" gs-x="${item.x}" gs-y="${item.y}" gs-w="${item.w}" gs-h="${item.h}" gs-min-w="${item.minW ?? 1}" gs-min-h="${item.minH ?? 1}"`)
    .replace('<div class="workspace-editor-card-content">', '<div class="grid-stack-item-content"><div class="workspace-editor-card-content">')
    .replace('</article>', '</div></article>');
}).join('');
```

- [ ] **Step 3: Mount GridStack after rendering cards**

Import adapter in `web/src/workspace/runtime.ts`:

```ts
import { destroyWorkspaceGrid, mountWorkspaceGrid } from './gridstack-adapter';
```

After `canvas.innerHTML = ...`, call:

```ts
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
```

When workspace is empty, call:

```ts
destroyWorkspaceGrid();
canvas.classList.remove('grid-stack');
```

- [ ] **Step 4: Remove old pointer drag/resize implementation**

Delete from `web/src/workspace/runtime.ts`:

```ts
function getGridMetrics(...)
function startWorkspaceDrag(...)
function startWorkspaceResize(...)
```

Remove pointerdown handlers for `drag-card` and `resize-card` in `bindWorkspaceCardSelection()`. Keep click selection and delete handlers.

- [ ] **Step 5: Update GridStack CSS**

In `web/src/styles/workspace.css`, add:

```css
.workspace-card-canvas.grid-stack {
  display: block;
  min-height: 520px;
}

.grid-stack-item-content {
  inset: 0;
  border-radius: 16px;
  overflow: visible;
}

.grid-stack .workspace-editor-card {
  height: 100%;
}

.grid-stack .workspace-editor-card-content {
  height: calc(100% - 48px);
  overflow: hidden;
}

.workspace-editor-card-drag-handle {
  cursor: grab;
}

.workspace-editor-card-drag-handle:active {
  cursor: grabbing;
}
```

- [ ] **Step 6: Run GridStack contract test**

Run:

```bash
npx vitest run tests/unit/WorkspaceGridStackContracts.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run existing workspace editor tests**

Run:

```bash
npx vitest run tests/unit/WorkspaceEditorLayoutContracts.test.ts tests/unit/WorkspaceEditorMutationContracts.test.ts tests/unit/WorkspaceEditorReflowContracts.test.ts tests/unit/WorkspaceEditorStabilityContracts.test.ts
```

Expected: PASS or only failures caused by tests asserting removed pointer handlers. If pointer-handler assertions fail, update those tests to assert GridStack adapter behavior instead.

- [ ] **Step 8: Commit GridStack editor integration**

```bash
git add web/src/workspace/gridstack-adapter.ts web/src/workspace/runtime.ts web/src/styles/workspace.css tests/unit/WorkspaceGridStackContracts.test.ts tests/unit/WorkspaceEditor*.test.ts web/package.json web/package-lock.json
git commit -m "feat: use gridstack for workspace editing"
```

---

### Task 5: Ensure preview refreshes after workspace mutations

**Files:**
- Modify: `web/src/workspace/runtime.ts`
- Test: `tests/unit/WorkspacePreviewSyncContracts.test.ts`

- [ ] **Step 1: Add a helper to refresh preview from current workspace**

In `web/src/workspace/runtime.ts`, import:

```ts
import { renderWorkspacePreview } from './preview';
```

Add helper near `commitWorkspaceMutation()`:

```ts
function refreshWorkspacePreview(): void {
  renderWorkspacePreview(document.getElementById('mainPage'), currentWorkspace);
  requestAnimationFrame(() => (window as any).resizePreview?.());
}
```

- [ ] **Step 2: Call helper after every editor render**

In `commitWorkspaceMutation()`, after each `renderWorkspaceEditorShell(currentWorkspace);`, call:

```ts
refreshWorkspacePreview();
```

The no-project branch should be:

```ts
if (!projectId) {
  renderWorkspaceEditorShell(currentWorkspace);
  refreshWorkspacePreview();
  return;
}
```

The project branch should be:

```ts
renderWorkspaceEditorShell(currentWorkspace);
refreshWorkspacePreview();
void syncWorkspaceToServer(projectId, currentWorkspace);
```

- [ ] **Step 3: Extend preview sync contract**

In `tests/unit/WorkspacePreviewSyncContracts.test.ts`, add:

```ts
test('workspace mutations refresh the portal preview immediately', () => {
  const runtime = read('web/src/workspace/runtime.ts');

  expect(runtime).toContain('function refreshWorkspacePreview');
  expect(runtime).toContain("document.getElementById('mainPage')");
  expect(runtime).toContain('renderWorkspacePreview');
  expect(runtime).toMatch(/commitWorkspaceMutation[\s\S]*?renderWorkspaceEditorShell\(currentWorkspace\);[\s\S]*?refreshWorkspacePreview\(\);/);
});
```

- [ ] **Step 4: Run preview sync tests**

Run:

```bash
npx vitest run tests/unit/WorkspacePreviewSyncContracts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit immediate preview refresh**

```bash
git add web/src/workspace/runtime.ts tests/unit/WorkspacePreviewSyncContracts.test.ts
git commit -m "fix: refresh portal preview after workspace edits"
```

---

### Task 6: Browser verification

**Files:**
- No code changes unless verification exposes a defect.

- [ ] **Step 1: Start dev server if needed**

Run:

```bash
npm run dev:all
```

Expected: web at `http://127.0.0.1:5173`, API at `http://127.0.0.1:3001`.

- [ ] **Step 2: Open app with Playwright CLI**

Run:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" open http://localhost:5173/ --headed
```

Expected: app loads with no blocking console errors.

- [ ] **Step 3: Generate or restore a project with workspace data**

Use existing app flow or sidebar restore. Verify:

- Preview is open.
- Main preview contains `.portal-workspace-preview-host`.
- Work area cards have `.workspace-preview-card`.
- Editor mode contains `.grid-stack` and `.grid-stack-item`.

Run measurement:

```bash
"$PWCLI" eval "function(){return {previewCards:document.querySelectorAll('.workspace-preview-card').length, editorCards:document.querySelectorAll('.grid-stack-item').length, hasGrid:!!document.querySelector('.workspace-card-canvas.grid-stack')}}" --json
```

Expected:

```json
{
  "previewCards": 4,
  "editorCards": 4,
  "hasGrid": true
}
```

- [ ] **Step 4: Verify drag/resize behavior manually**

In browser:

1. Switch to `工作区设计`.
2. Drag a card by the `⋮⋮` handle.
3. Confirm card snaps to grid and other cards do not overlap.
4. Resize a card from southeast handle.
5. Switch back to preview.
6. Confirm preview reflects the same position/size.

- [ ] **Step 5: Run full relevant tests**

Run:

```bash
npx vitest run tests/unit/WorkspacePreviewSyncContracts.test.ts tests/unit/WorkspaceGridStackContracts.test.ts tests/unit/WorkspaceEditorLayoutContracts.test.ts tests/unit/WorkspaceEditorMutationContracts.test.ts tests/unit/WorkspaceEditorReflowContracts.test.ts tests/unit/WorkspaceEditorStabilityContracts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit verification fixes if any**

If browser verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: stabilize workspace grid verification"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: preview/editor single source of truth is covered by Tasks 2, 3, and 5. GridStack replacement is covered by Task 4. Browser verification is covered by Task 6.
- Placeholder scan: no TBD/TODO/fill-later language remains; every task includes explicit files, code, commands, and expected results.
- Type consistency: all tasks use existing `WorkspaceConfig`, `CardTemplateListItem`, `renderWorkspacePreview`, `renderWorkspaceCardShell`, and `mountWorkspaceGrid` names consistently.
