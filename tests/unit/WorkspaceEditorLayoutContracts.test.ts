import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor layout contracts', () => {
  test('styles expose grid layout variables and drag resize affordances', () => {
    const css = readAllCSS();

    expect(css).toContain('--workspace-columns');
    expect(css).toContain('--workspace-row-height');
    expect(css).toContain('.workspace-editor-card-drag-handle');
    expect(css).toContain('.workspace-editor-card-resize-handle');
  });

  test('runtime positions cards via CSS grid and exposes drag resize through interact adapter', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const adapter = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/interact-adapter.ts'), 'utf8');

    expect(source).toContain('mountWorkspaceGrid');
    expect(source).toContain('grid-column:');
    expect(source).toContain('grid-row:');
    expect(source).not.toContain('gs-x');
    expect(source).not.toContain('gs-y');
    expect(source).not.toContain('gs-w');
    expect(source).not.toContain('gs-h');
    expect(source).not.toContain('function startWorkspaceDrag');
    expect(source).not.toContain('function startWorkspaceResize');

    expect(adapter).toContain('pointerdown');
    expect(adapter).toContain('pointermove');
    expect(adapter).toContain('pointerup');
    expect(adapter).toContain('.workspace-editor-card-drag-handle');
  });

  test('layout mutations still reuse workspace persistence and sync path', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('commitWorkspaceMutation');
    expect(source).toContain('persistWorkspaceToLocal');
    expect(source).toContain('syncWorkspaceToServer');
  });
});
