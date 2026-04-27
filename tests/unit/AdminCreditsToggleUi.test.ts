import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('admin credits toggle ui', () => {
  test('uses a switch control instead of a plain checkbox row for the credits toggle', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(html).toContain('class="setting-toggle-row"');
    expect(html).toContain('class="switch" aria-label="启用使用限制（积分制）"');
    expect(html).toContain('class="switch-slider"');
    expect(html).toContain('关闭后，前台将隐藏积分与积分消耗提示');
  });
});
