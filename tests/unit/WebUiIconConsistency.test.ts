import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui icon consistency', () => {
  test('uses a unified icon system for workbench chrome instead of emoji/text glyph shortcuts', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(html).not.toContain('⚙ 设置');
    expect(styles).toContain('.ui-icon-button');
    expect(styles).toContain('width: 36px;');
    expect(styles).toContain('height: 36px;');
    expect(styles).toContain('.ui-icon-button svg');
    expect(styles).toContain('width: 18px;');
    expect(styles).toContain('height: 18px;');
  });
});
