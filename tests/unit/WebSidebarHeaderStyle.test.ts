import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar header style', () => {
  test('removes vertical padding and divider from the expanded sidebar header', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const matches = [...styles.matchAll(/\.sidebar-header\s*\{([^}]*)\}/g)];
    const activeBlock = matches[matches.length - 1]?.[1] || '';

    expect(activeBlock).toContain('padding: 0 4px;');
    expect(activeBlock).toContain('border-bottom: 0;');
  });
});
