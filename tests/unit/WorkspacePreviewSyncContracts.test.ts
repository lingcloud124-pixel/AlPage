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
    expect(preview).toContain('portal-workspace-preview-host');
    expect(preview).toContain('.desktop-grid');
    expect(preview).toContain('renderWorkspaceCardShell');
    expect(preview).toContain("mode: 'preview'");

    expect(uiSetup).toContain('renderWorkspacePreview');
    expect(uiSetup).toMatch(/renderTemplate\('desktop', mainPage\)[\s\S]*?renderWorkspacePreview/);

    expect(main).toContain('renderWorkspacePreview');
    expect(main).toMatch(/restoreFromSnapshot\(snapshot\);[\s\S]*?renderWorkspacePreview/);

    expect(chatManager).toContain('renderWorkspacePreview');
    expect(chatManager).toMatch(/renderWorkspaceEditorShell\(project\.workspace \?\? null\);[\s\S]*?renderWorkspacePreview/);
  });

  test('workspace mutations refresh the portal preview immediately', () => {
    const runtime = read('web/src/workspace/runtime.ts');

    expect(runtime).toContain('function refreshWorkspacePreview');
    expect(runtime).toContain("document.getElementById('mainPage')");
    expect(runtime).toContain('renderWorkspacePreview');
    expect(runtime).toMatch(/commitWorkspaceMutation[\s\S]*?renderWorkspaceEditorShell\(currentWorkspace\);[\s\S]*?refreshWorkspacePreview\(\);/);
  });

  test('new projects do not seed unrelated default workspace cards', () => {
    const projectManager = read('web/src/project-manager.ts');

    expect(projectManager).toContain('function createDefaultWorkspaceConfig');
    expect(projectManager).not.toContain('items: DEFAULT_WORKSPACE_ITEMS.map');
    expect(projectManager).toMatch(/items:\s*\[\]/);
  });

  test('desktop template no longer carries static business cards in the workspace grid', () => {
    const desktop = read('web/src/templates/desktop.html');
    const grid = desktop.match(/<div class="desktop-grid">([\s\S]*?)<\/div>\s*<\/div>\s*<\/main>/)?.[1] ?? '';

    expect(grid).not.toContain('widget-card');
    expect(grid).not.toContain('采购合同');
    expect(grid).not.toContain('企业新闻头条');
    expect(grid).not.toContain('数字化项目周报');
  });

  test('empty preview suppresses static portal business chrome', () => {
    const preview = read('web/src/workspace/preview.ts');

    expect(preview).toContain('suppressStaticPortalChrome');
    expect(preview).toMatch(/quickLinksBar\.style\.display\s*=\s*'none'/);
    expect(preview).toContain('workspace-preview-empty');
  });
});
