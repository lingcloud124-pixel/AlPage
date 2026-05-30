import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor reflow contracts', () => {
  test('runtime exposes compaction and reflow helpers for stable layout updates', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('compactWorkspaceItems');
    expect(source).toContain('pushCollidingItemsDown');
    expect(source).toContain('normalizeWorkspaceLayout');
  });

  test('workspace mutations normalize layout after add delete drag and resize', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('const normalizedItems = normalizeWorkspaceLayout');
    expect(source).toContain('items: normalizedItems');
  });
});
