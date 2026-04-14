import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar toggle icon', () => {
  test('uses a left-arrow hamburger icon and shell-neutral color instead of theme-driven color', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(html).toContain('id="sidebarToggleBtn"');
    expect(html).toContain('polyline points="7 9 3 12 7 15"');
    expect(styles).toContain('.sidebar-toggle-btn svg');
    expect(styles).toContain('stroke: currentColor;');
    expect(styles).not.toContain('.project-sidebar.collapsed ~ .chat-panel .sidebar-toggle-btn');
  });
});
