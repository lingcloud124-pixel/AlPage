import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar item padding', () => {
  test('uses padding for conversation rows', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');
    const block = [...styles.matchAll(/\.sidebar-item\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(block).toContain('padding: 6px 10px;');
  });
});
