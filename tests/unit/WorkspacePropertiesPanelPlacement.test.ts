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
    expect(runtime).toContain("openWorkspacePropertiesDrawer('global')");
    expect(runtime).toContain("mode === 'card' ? '卡片配置' : '属性配置'");
    expect(runtime).toContain("renderWorkspacePropertyPanel(mode)");
    expect(runtime).toContain('workspacePropertiesTopbarBtn');
    expect(runtime).toContain("appContainer.classList.add('panel-open')");
    expect(runtime).toContain("sidePanel?.classList.remove('open')");
    expect(runtime).toContain("drawer.classList.remove('open')");
    expect(runtime).toContain("panelToggleBtn.textContent = '面板'");
    expect(runtime).not.toContain("panelToggleBtn.textContent = '收起面板'");
    expect(runtime).not.toContain('workspaceEditorPropertiesBtn');
    expect(uiSetup).toContain("document.getElementById('workspacePropertiesDrawer')");
    expect(uiSetup).toContain("propertiesDrawer?.classList.remove('open')");
    expect(uiSetup).toContain("sidePanel.classList.add('open')");
    expect(uiSetup).toContain("propertiesDrawer?.classList.remove('open')");
    expect(uiSetup).not.toContain("if (appContainer.classList.contains('panel-open')) return;");
    expect(uiSetup).toContain("if (sidePanel.classList.contains('open')) closePanel();");
    expect(uiSetup).toContain("panelToggleBtn.textContent = '面板'");
    expect(uiSetup).not.toContain("panelToggleBtn.textContent = '收起面板'");

    expect(html).toContain('<h3>颜色配置</h3>');
    expect(html).toContain('<h3>属性配置</h3>');
    const drawerBlock = css.match(/\.workspace-properties-drawer\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const drawerHeaderBlock = css.match(/\.workspace-properties-drawer \.drawer-header\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const panelOpenBlock = css.match(/\.app-container\.panel-open \.workspace-properties-drawer\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(drawerBlock).toContain('position: fixed;');
    expect(drawerBlock).toContain('box-shadow: none;');
    expect(drawerHeaderBlock).toContain('height: 70px;');
    expect(drawerHeaderBlock).toContain('padding: 16px 20px;');
    expect(drawerHeaderBlock).toContain('justify-content: space-between;');
    expect(drawerHeaderBlock).toContain('align-items: center;');
    expect(panelOpenBlock).toContain('transform: translateX(0);');
  });
});
