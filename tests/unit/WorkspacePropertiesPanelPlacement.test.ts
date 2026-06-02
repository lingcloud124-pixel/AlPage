import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace properties panel placement', () => {
  test('places the properties entry in the preview topbar and not inside the workspace editor toolbar', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const runtime = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const css = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');

    const topbarRight = html.match(/<div class="topbar-right">[\s\S]*?<\/div>\s*<\/div>\s*<div class="preview-content">/)?.[0] ?? '';
    const editorToolbarActions = html.match(/<div class="workspace-editor-toolbar-actions">[\s\S]*?<\/div>/)?.[0] ?? '';

    expect(topbarRight).toContain('id="panelToggleBtn"');
    expect(topbarRight).toContain('id="workspacePropertiesTopbarBtn"');
    expect(topbarRight.indexOf('id="workspacePropertiesTopbarBtn"')).toBeGreaterThan(topbarRight.indexOf('id="panelToggleBtn"'));
    expect(editorToolbarActions).not.toContain('id="workspaceEditorPropertiesBtn"');

    expect(runtime).toContain("openWorkspacePropertiesDrawer('card')");
    expect(runtime).toContain("setActiveConfigTab('card')");
    expect(runtime).toContain('renderConfigPanelContent()');
    expect(runtime).toContain('workspacePropertiesTopbarBtn');
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
    expect(html).toContain('data-tab="theme"');
    expect(html).not.toContain('data-tab="card"');
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
