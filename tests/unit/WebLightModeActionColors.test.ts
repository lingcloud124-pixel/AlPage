import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web light mode action colors', () => {
  test('uses light-appropriate action colors for sidebar, new project button, and workspace topbar', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    // Light mode shell variable overrides
    expect(styles).toContain('body[data-ui-theme="light"]');
    expect(styles).toContain('--app-bg: #F5F5F5');
    expect(styles).toContain('--surface-0: #FFFFFF');
    expect(styles).toContain('--text-primary: #111111');

    // Sidebar background
    expect(styles).toContain('body[data-ui-theme="light"] .project-sidebar');
    expect(styles).toContain('background: #F5F5F5;');

    // Workspace topbar
    expect(styles).toContain('body[data-ui-theme="light"] .workspace-topbar');
    expect(styles).toContain('background: rgba(255,255,255,0.92);');

    // New project button
    expect(styles).toContain('body[data-ui-theme="light"] .sidebar-new-btn');
    expect(styles).toContain('background: #FAFAFA;');
    expect(styles).toContain('color: #111111;');

    // Active project item
    expect(styles).toContain('body[data-ui-theme="light"] .sidebar-project-item.active');
    expect(styles).toContain('border-color: transparent;');
  });
});
