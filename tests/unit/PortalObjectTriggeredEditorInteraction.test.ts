import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('Portal configuration side panel interaction', () => {
  test('uses the existing right side-panel pattern and removes unreasonable preview top-right buttons', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const css = fs.readFileSync(path.join(projectRoot, 'web/src/styles/portal-config-panel.css'), 'utf8');
    const themeEngine = fs.readFileSync(path.join(projectRoot, 'web/src/theme-engine.ts'), 'utf8');

    expect(html).toContain('id="sidePanel"');
    expect(html).toContain('id="panelToggleBtn"');
    expect(html).not.toContain('id="backToHomeBtn"');
    expect(html).not.toContain('id="portalThemePanelBtn"');
    expect(html).not.toContain('id="resultSaveBtn"');
    expect(html).not.toContain('id="resultEditBtn"');
    expect(html).not.toContain('id="portalWorkspacePanelBtn"');
    expect(html).not.toContain('portal-object-actions');
    expect(html).not.toContain('previewHeaderHotspot');
    expect(html).not.toContain('previewWorkspaceHotspot');
    expect(html).not.toContain('previewCardHotspot');
    expect(html).not.toContain('id="portalContextPanel"');

    expect(html).not.toContain('id="loginTab"');
    expect(html).not.toContain('id="mainPageTab"');
    expect(html).not.toContain('topbar-tabs');
    expect(html).toContain('id="mainPage" class="preview-page active-preview"');
    expect(html).not.toContain('id="loginPage"');

    expect(themeEngine).not.toContain("renderTemplate('login', loginTarget)");
    expect(themeEngine).toContain("renderTemplate('desktop', mainTarget)");

    expect(uiSetup).toContain('setupTabSwitching');
    expect(uiSetup).not.toContain('openPortalThemePanel');
    expect(uiSetup).not.toContain('openPortalContextPanel');

    expect(css).not.toContain('.portal-object-actions');
    expect(css).not.toContain('.portal-context-panel');
    expect(css).not.toContain('position: fixed');
  });
});
