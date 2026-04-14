import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web topbar tabs', () => {
  test('styles preview tabs as tighter lab-console controls instead of soft consumer pills', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.topbar-tabs');
    expect(styles).toContain('padding: 1px;');
    expect(styles).toContain('height: 35px;');
    expect(styles).toContain('.topbar-tabs .tab-indicator');
    expect(styles).toContain('.tab-btn');
    expect(styles).toContain('font-size: 10px;');
    expect(styles).toContain('background: var(--surface-3);');
  });
});
