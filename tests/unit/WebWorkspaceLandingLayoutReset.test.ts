import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace landing layout reset', () => {
  test('clears preview and side-panel state so chat occupies the default full workspace', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const css = fs.readFileSync(path.join(projectRoot, 'web/src/styles/base.css'), 'utf8');

    const landingFunction = main.match(/export function showWorkspaceLandingState\(\): void \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(landingFunction).toContain("document.querySelector('.app-container')");
    expect(landingFunction).toContain("document.getElementById('previewPanel')");
    expect(landingFunction).toContain("document.getElementById('sidePanel')");
    expect(landingFunction).toContain("appContainer?.classList.remove('preview-open')");
    expect(landingFunction).toContain("appContainer?.classList.remove('panel-open')");
    expect(landingFunction).toContain("previewPanel?.classList.remove('expanded')");
    expect(landingFunction).toContain("sidePanel?.classList.remove('open')");
    expect(landingFunction).toContain('setChatPanelWidth(null)');
    expect(landingFunction).toContain("chatPanel?.classList.add('is-full-landing')");
    expect(landingFunction).toMatch(/showDefaultChatView\(\);\s*setChatPanelWidth\(null\);/);
    expect(uiSetup).toContain("classList.contains('preview-open')");
    expect(uiSetup).toMatch(/appContainer\?\.classList\.add\('preview-open'\);[\s\S]*?syncWorkbenchLayoutForActiveTab\(true, 'loginTab'\);/);

    const syncLayoutFunction = uiSetup.match(/export function syncWorkbenchLayoutForActiveTab[\s\S]*?\n\}/)?.[0] ?? '';
    expect(syncLayoutFunction).toMatch(/classList\.contains\('preview-open'\)[\s\S]*?chatPanel\.classList\.remove\('is-full-landing'\)[\s\S]*?if \(!chatPanel\.style\.width\)/);
    expect(uiSetup).toContain("chatPanel.classList.remove('is-full-landing')");

    const previewPanelBlock = css.match(/\.app-container:not\(\.preview-open\) \.preview-panel\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(previewPanelBlock).toContain('display: none;');
    expect(previewPanelBlock).toContain('flex: 0 0 0;');
    expect(previewPanelBlock).toContain('width: 0;');

    const fullLandingBlock = css.match(/\.chat-panel\.is-full-landing\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(fullLandingBlock).toContain('width: auto !important;');
    expect(fullLandingBlock).toContain('flex: 1 1 auto !important;');
    expect(fullLandingBlock).toContain('min-width: 0 !important;');
  });
});
