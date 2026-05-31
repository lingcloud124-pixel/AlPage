import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

describe('workspace pointer-events interaction contracts', () => {
  test('editor uses raw pointer events for drag and resize and persists change events', () => {
    const adapter = read('web/src/workspace/interact-adapter.ts');
    const runtime = read('web/src/workspace/runtime.ts');

    // adapter uses pointer events (no interact.js)
    expect(adapter).toContain('pointerdown');
    expect(adapter).toContain('pointermove');
    expect(adapter).toContain('pointerup');
    expect(adapter).toContain('addEventListener');
    expect(adapter).toContain('onLayoutChange');
    expect(adapter).toContain('export function mountWorkspaceGrid');
    expect(adapter).toContain('export function destroyWorkspaceGrid');
    expect(adapter).not.toContain('interact');
    expect(adapter).not.toContain('.draggable(');
    expect(adapter).not.toContain('.resizable(');

    // runtime delegates to adapter
    expect(runtime).toContain('mountWorkspaceGrid');
    expect(runtime).toContain('syncPortalPlanFromWorkspace');
    expect(runtime).toMatch(/project\.workspace = currentWorkspace;[\s\S]*?Object\.assign\(project, syncPortalPlanFromWorkspace\(project\)\);[\s\S]*?await saveProject\(project\);/);
    expect(runtime).toMatch(/workspace\.items\.map\([\s\S]*?\)\.join\(''\)/);
    expect(runtime).not.toContain('function startWorkspaceDrag');
    expect(runtime).not.toContain('function startWorkspaceResize');
  });
});
