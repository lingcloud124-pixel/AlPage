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
    expect(adapter).toContain('import { GridStack }');
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
