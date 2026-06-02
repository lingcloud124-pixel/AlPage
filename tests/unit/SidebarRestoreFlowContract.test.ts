import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('sidebar restore flow contract', () => {
  test('collapsed sidebar hides expanded-only regions and expanded sidebar hides collapsed-only regions', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');

    expect(html).toContain('class="sidebar-new-chat-full sidebar-expand-only"');
    expect(html).toContain('class="sidebar-list sidebar-expand-only"');
    expect(html).toContain('class="sidebar-icon-btn sidebar-collapsed-only"');
    expect(styles).toContain('.sidebar:not(.expanded) .sidebar-expand-only');
    expect(styles).toContain('display: none;');
    expect(styles).toContain('.sidebar.expanded .sidebar-collapsed-only');
    expect(styles).toContain('.sidebar.expanded .sidebar-new-chat-full.sidebar-expand-only');
  });

  test('expanded sidebar keeps saved projects and history stacked vertically', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');

    const expandedOnlyBlock = styles.match(/\.sidebar\.expanded \.sidebar-expand-only\s*\{([^}]*)\}/)?.[1] || '';
    const sidebarListBlock = styles.match(/\.sidebar-list\s*\{([^}]*)\}/)?.[1] || '';

    expect(expandedOnlyBlock).not.toContain('display: flex;');
    expect(sidebarListBlock).toContain('display: flex;');
    expect(sidebarListBlock).toContain('flex-direction: column;');
  });

  test('saved project restore event is unwrapped before project preview rendering', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(main).toContain('const detail = e.detail as');
    expect(main).toMatch(/const snapshot = \(?detail\.projectSnapshot \?\? detail\)? as Record<string, unknown>;/);
    expect(main).toContain('restoreFromSnapshot(snapshot)');
    expect(main).toContain('detail.conversation?.messages');
    expect(main).toContain("window.dispatchEvent(new CustomEvent('sidebar:restore-conversation'");
    expect(main).toContain('skipProjectRestore: true');
  });

  test('saved project restore refreshes the theme configuration drawer after project state is restored', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');
    const listenerStart = main.indexOf("window.addEventListener('sidebar:restore-project'");
    const listenerEnd = main.indexOf('});', listenerStart);
    const listenerBlock = main.slice(listenerStart, listenerEnd);
    const syncIndex = listenerBlock.indexOf('syncThemeConfigurationFromTheme();');
    const initializeIndex = listenerBlock.indexOf('initializeThemeConfiguration();', syncIndex);

    expect(listenerStart).toBeGreaterThan(-1);
    expect(syncIndex).toBeGreaterThan(-1);
    expect(initializeIndex).toBeGreaterThan(syncIndex);
    expect(listenerBlock).not.toContain("classList.contains('open')");
  });

  test('saved project restore does not let workspace template loading block theme and conversation restore', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');
    const listenerStart = main.indexOf("window.addEventListener('sidebar:restore-project'");
    const listenerEnd = main.indexOf('});', listenerStart);
    const listenerBlock = main.slice(listenerStart, listenerEnd);
    const ensureIndex = listenerBlock.indexOf('await ensureWorkspaceTemplateCache();');
    const initializeIndex = listenerBlock.indexOf('initializeThemeConfiguration();');
    const conversationIndex = listenerBlock.indexOf("window.dispatchEvent(new CustomEvent('sidebar:restore-conversation'");

    expect(listenerBlock).toContain('void ensureWorkspaceTemplateCache()');
    expect(listenerBlock).toContain("console.warn('[sidebar] Workspace preview restore skipped:', err)");
    expect(ensureIndex === -1 || ensureIndex > conversationIndex).toBe(true);
    expect(initializeIndex).toBeGreaterThan(-1);
    expect(conversationIndex).toBeGreaterThan(initializeIndex);
  });

  test('saved project restore recalculates preview centering after workspace preview renders', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');
    const listenerStart = main.indexOf("window.addEventListener('sidebar:restore-project'");
    const listenerEnd = main.indexOf('});', listenerStart);
    const listenerBlock = main.slice(listenerStart, listenerEnd);

    expect(listenerBlock).toContain("requestAnimationFrame(() => window.resizePreview?.())");
    expect(listenerBlock).toMatch(/renderWorkspacePreview\(document\.getElementById\('mainPage'\)[\s\S]*?requestAnimationFrame\(\(\) => window\.resizePreview\?\.\(\)\)/);
  });

  test('workspace editor background template refresh failures are contained', () => {
    const runtime = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const renderStart = runtime.indexOf('export function renderWorkspaceEditorShell');
    const renderBlock = runtime.slice(renderStart, renderStart + 900);

    expect(renderBlock).toContain('void ensureWorkspaceTemplateCache()');
    expect(renderBlock).toContain('.catch((err)');
    expect(renderBlock).toContain("console.warn('[workspace] Template cache refresh skipped:', err)");
  });

  test('conversation restore can skip project restore to avoid saved-project restore loops', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat/chat-conversation-state.ts'), 'utf8');

    expect(source).toContain('skipProjectRestore?: boolean');
    expect(source).toContain('!detail.skipProjectRestore');
  });

  test('saved project restore falls back to saved conversationSnapshot if conversation row is unavailable', () => {
    const sidebar = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');

    expect(sidebar).toContain('detail.conversationSnapshot');
    expect(sidebar).toContain('messages: (detail.conversationSnapshot as any).messages');
    expect(sidebar).toContain('conversation.projectSnapshot.savedPortalId = id');
  });
});
