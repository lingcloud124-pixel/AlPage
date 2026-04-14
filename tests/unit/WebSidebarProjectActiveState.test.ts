import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar project active state', () => {
  test('uses background-only active styling for sidebar projects in dark and light mode', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-project-item.active {');
    expect(styles).toContain('background: var(--border-strong);');
    expect(styles).toContain('body[data-ui-theme="light"] .sidebar-project-item.active');
    expect(styles).toContain('background: var(--accent-ui-soft);');
  });

  test('hover uses lighter background than active state', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-project-item:hover {');
    expect(styles).toContain('background: var(--accent-ui-soft);');
    expect(styles).toContain('body[data-ui-theme="light"] .sidebar-project-item:hover');
    expect(styles).toContain('background: var(--accent-ui-soft);');
  });
});
