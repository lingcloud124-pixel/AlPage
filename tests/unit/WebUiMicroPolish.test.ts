import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui micro polish', () => {
  test('includes final shell polish hooks for toast, menus, and modal detail surfaces', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.theme-studio-toast');
    expect(styles).toContain('min-width: 280px;');
    expect(styles).toContain('.project-action-menu');
    expect(styles).toContain('.modal-overlay');
    expect(styles).toContain('.modal-content');
  });
});
