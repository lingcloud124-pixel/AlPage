import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web workbench header parity', () => {
  test('keeps chat header and preview topbar title treatments aligned', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.project-name');
    expect(styles).toContain('font-size: var(--font-size-title);');
    expect(styles).toContain('padding: 14px 22px;');
    expect(styles).toContain('height: 70px;');
  });
});
