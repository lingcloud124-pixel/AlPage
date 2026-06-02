import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor mutation contracts', () => {
  test('runtime adds cards from template selection, supports delete action and syncs workspace state', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('addWorkspaceCardFromTemplate');
    expect(source).toContain('deleteWorkspaceCard');
    expect(source).toContain('persistWorkspaceToLocal');
    expect(source).toContain('syncWorkspaceToServer');
    expect(source).toContain('getCurrentProjectId');
    expect(source).toContain('data-action="delete-card"');
    expect(source).toContain('crypto.randomUUID');
  });

  test('workspace cards expose a delete affordance in the shared renderer shell', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/card-renderer.ts'), 'utf8');

    expect(source).toContain('workspace-editor-card-delete');
    expect(source).toContain('删除卡片');
  });

  test('store exposes local persistence and server sync helpers consumed by editor mutations', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/store.ts'), 'utf8');

    expect(source).toContain('export function persistWorkspaceToLocal');
    expect(source).toContain('export async function syncWorkspaceToServer');
  });
});
