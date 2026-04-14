import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui typography scale', () => {
  test('defines a restrained typography and text-color scale for the app shell', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('--text-tertiary: rgba(255,255,255,0.28);');
    expect(styles).toContain('--font-size-display: 28px;');
    expect(styles).toContain('--font-size-title: 16px;');
    expect(styles).toContain('--font-size-body: 14px;');
    expect(styles).toContain('--font-size-meta: 12px;');
    expect(styles).toContain('--font-size-micro: 11px;');
  });
});
