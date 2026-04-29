import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar collapsed spacing', () => {
  test('does not keep 12px vertical padding on the collapsed sidebar rail', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const match = styles.match(/\.sidebar-collapsed\s*\{([^}]*)\}/);

    expect(match?.[1] || '').not.toContain('padding: 12px 0');
  });
});
