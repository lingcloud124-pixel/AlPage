import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web new project button style', () => {
  test('uses outlined soft-fill styling with white text in dark mode and light surface with black text in light mode', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-new-btn {');
    expect(styles).toContain('background: var(--accent-ui-soft);');
    expect(styles).toContain('color: var(--text-primary);');
    expect(styles).toContain('border: 1px solid var(--border-strong);');
    expect(styles).toContain('body[data-ui-theme="light"] .sidebar-new-btn');
    expect(styles).toContain('background: #FAFAFA;');
    expect(styles).toContain('color: #111111;');
  });
});
