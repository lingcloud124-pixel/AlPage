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

    // Workspace topbar
    expect(styles).toContain('body[data-ui-theme="light"] .workspace-topbar');
    expect(styles).toContain('background: var(--surface-0);');
  });
});
