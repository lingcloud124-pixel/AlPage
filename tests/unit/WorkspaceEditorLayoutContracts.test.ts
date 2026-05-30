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

  test('runtime positions cards via GridStack and exposes drag resize through the adapter', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const adapter = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/gridstack-adapter.ts'), 'utf8');

    expect(source).toContain('mountWorkspaceGrid');
    expect(source).toContain('gs-x');
    expect(source).toContain('gs-y');
    expect(source).toContain('gs-w');
    expect(source).toContain('gs-h');
    expect(source).not.toContain('function startWorkspaceDrag');
    expect(source).not.toContain('function startWorkspaceResize');

    expect(adapter).toContain("import { GridStack }");
    expect(adapter).toContain('GridStack.init');
    expect(adapter).toContain('.workspace-editor-card-drag-handle');
  });

  test('layout mutations still reuse workspace persistence and sync path', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('commitWorkspaceMutation');
    expect(source).toContain('persistWorkspaceToLocal');
    expect(source).toContain('syncWorkspaceToServer');
  });
});
