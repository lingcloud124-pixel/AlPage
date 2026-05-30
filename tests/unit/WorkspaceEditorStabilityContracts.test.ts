import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor stability contracts', () => {
  test('runtime uses auto placement helpers for newly added cards', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('findWorkspaceSlot');
    expect(source).toContain('hasWorkspaceCollision');
    expect(source).toContain('const slot = findWorkspaceSlot');
  });

  test('GridStack adapter delegates layout to gridstack.js and commitWorkspaceMutation normalizes items', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const adapter = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/gridstack-adapter.ts'), 'utf8');

    expect(source).toContain('isWithinWorkspaceBounds');
    expect(source).toContain('if (hasWorkspaceCollision(');
    expect(source).toContain('return origin');
    expect(source).toContain('normalizeWorkspaceLayout');

    expect(adapter).toContain('onLayoutChange');
    expect(adapter).toContain('GridStack.init');
  });

  test('styles expose drag preview state for rejected placement feedback', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-editor-card.is-drag-invalid');
  });
});
