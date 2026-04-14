import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui micro polish', () => {
  test('includes final shell polish hooks for toast, menus, and modal detail surfaces', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');

    expect(styles).toContain('.theme-studio-toast');
    expect(styles).toContain('min-width: 280px;');
    expect(styles).toContain('.project-action-menu');
    expect(styles).toContain('gap: 6px;');
    expect(styles).toContain('.modal-body h4');
    expect(styles).toContain('letter-spacing: 0.06em;');
    expect(source).toContain("toast.className = 'theme-studio-toast'");
  });
});
