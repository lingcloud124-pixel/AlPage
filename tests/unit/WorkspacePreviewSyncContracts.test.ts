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
