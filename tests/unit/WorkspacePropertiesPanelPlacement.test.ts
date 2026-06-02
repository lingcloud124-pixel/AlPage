import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace properties panel placement', () => {
  test('places workspace configuration in the side drawer and keeps legacy property buttons out of rendered HTML', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const runtime = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const css = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');

    const topbarRight = html.slice(html.indexOf('<div class="topbar-right"'), html.indexOf('<div class="preview-content">'));
    const editorToolbarActions = html.match(/<div class="workspace-editor-toolbar-actions">[\s\S]*?<\/div>/)?.[0] ?? '';

    expect(topbarRight).toContain('id="panelToggleBtn"');
    expect(topbarRight).not.toContain('id="workspacePropertiesTopbarBtn"');
    expect(editorToolbarActions).not.toContain('id="workspaceEditorPropertiesBtn"');

    expect(runtime).toContain("openWorkspacePropertiesDrawer('card')");
    expect(runtime).toContain("setActiveConfigTab('card')");
    expect(runtime).toContain('renderConfigPanelContent()');
    expect(runtime).toContain("document.getElementById('workspacePropertiesTopbarBtn')");
    expect(runtime).toContain('propertiesBtn?.addEventListener');
    expect(runtime).toContain("appContainer.classList.add('panel-open')");
    expect(runtime).toContain("sidePanel?.classList.remove('open')");
    expect(runtime).toContain("drawer.classList.remove('open')");
    expect(runtime).not.toContain('workspaceEditorPropertiesBtn');
    expect(uiSetup).toContain("document.getElementById('workspacePropertiesDrawer')");
    expect(uiSetup).toContain("propertiesDrawer?.classList.remove('open')");
    expect(uiSetup).toContain("sidePanel.classList.add('open')");
    expect(uiSetup).toContain("propertiesDrawer?.classList.remove('open')");
    expect(uiSetup).not.toContain("if (appContainer.classList.contains('panel-open')) return;");
    expect(uiSetup).toContain("if (sidePanel.classList.contains('open')) closePanel();");

    // 工作区规划面板，卡片内容由工作区卡片点击触发
    expect(html).toContain('data-tab="layout"');
    expect(html).not.toContain('data-tab="theme"');
    expect(html).toContain('data-tab="card"');
    expect(html).toContain('config-panel-tabs');
    expect(runtime).toContain('renderWorkspacePlanningView');
    expect(runtime).toContain('renderCardContentConfiguration');
    expect(css).toContain('.config-panel-tab');
    expect(css).toContain('.workspace-planning-list');

    const drawerBlock = css.match(/\.workspace-properties-drawer\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const drawerHeaderBlock = css.match(/\.workspace-properties-drawer \.drawer-header\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const drawerOpenBlock = css.match(/\.workspace-properties-drawer\.open\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(drawerBlock).toContain('position: fixed;');
    expect(drawerBlock).toContain('box-shadow: none;');
    expect(drawerHeaderBlock).toContain('height: 70px;');
    expect(drawerHeaderBlock).toContain('padding: 16px 20px;');
    expect(drawerHeaderBlock).toContain('justify-content: space-between;');
    expect(drawerHeaderBlock).toContain('align-items: center;');
    expect(drawerOpenBlock).toContain('transform: translateX(0);');
  });
});
