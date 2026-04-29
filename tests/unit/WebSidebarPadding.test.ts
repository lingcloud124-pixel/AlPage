import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar padding', () => {
  test('uses 12px vertical padding on the active sidebar shell', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const matches = [...styles.matchAll(/\.sidebar\s*\{([^}]*)\}/g)];
    const activeBlock = matches[matches.length - 1]?.[1] || '';

    expect(activeBlock).toContain('padding: 12px 0;');
  });
});
