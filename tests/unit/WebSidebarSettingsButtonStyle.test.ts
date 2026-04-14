import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar settings button style', () => {
  test('uses theme-primary hover text for the sidebar settings button', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-settings-btn:hover');
    expect(styles).toContain('color: var(--text-primary);');
  });
});
