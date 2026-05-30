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

  test('runtime positions cards from x y w h and exposes drag resize handlers', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('grid-column:');
    expect(source).toContain('grid-row:');
    expect(source).toContain('startWorkspaceDrag');
    expect(source).toContain('startWorkspaceResize');
    expect(source).toContain('pointermove');
    expect(source).toContain('pointerup');
    expect(source).toContain('workspace-editor-card-drag-handle');
    expect(source).toContain('workspace-editor-card-resize-handle');
  });

  test('layout mutations still reuse workspace persistence and sync path', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('commitWorkspaceMutation');
    expect(source).toContain('persistWorkspaceToLocal');
    expect(source).toContain('syncWorkspaceToServer');
  });
});
