import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor template driven content', () => {
  test('card template api exposes default props and configurable metadata to the runtime', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/api/card-templates.ts'), 'utf8');

    expect(source).toContain('defaultProps');
    expect(source).toContain('configurable');
  });

  test('runtime caches backend templates and shared renderer merges defaultProps with instanceProps for rendering', () => {
    const runtimeSource = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');
    const rendererSource = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/card-renderer.ts'), 'utf8');

    expect(runtimeSource).toContain('workspaceTemplateCache');
    expect(runtimeSource).toContain('ensureWorkspaceTemplateCache');
    expect(runtimeSource).toContain('renderWorkspaceCardShell');
    expect(rendererSource).toContain('getTemplateProps');
    expect(rendererSource).toContain('defaultProps');
    expect(rendererSource).toContain('instanceProps');
  });

  test('property drawer exposes template driven content fields for card level editing', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/card-content-configuration.ts'), 'utf8');

    expect(source).toContain('workspace-card-item-count-input');
    expect(source).toContain('workspace-card-headline-input');
    expect(source).toContain('workspace-card-summary-input');
  });

  test('db seeds the first four templates with structured default props', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(source).toContain('items:');
    expect(source).toContain('headline:');
    expect(source).toContain('links:');
  });
});
