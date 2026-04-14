import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web topbar tabs', () => {
  test('styles preview tabs as tighter lab-console controls instead of soft consumer pills', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.topbar-tabs');
    expect(styles).toContain('gap: 4px;');
    expect(styles).toContain('padding: 2px;');
    expect(styles).toContain('min-height: 34px;');
    expect(styles).toContain('font-size: var(--font-size-meta);');
    expect(styles).toContain('letter-spacing: 0.06em;');
    expect(styles).toContain('border-color: var(--border-strong);');
  });
});
