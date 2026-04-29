import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web preview/sidebar tone sync', () => {
  test('uses the expanded sidebar surface color for preview shell backgrounds', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('background-color: #f7f7fa;');
    expect(styles).toContain('.workspace-topbar');
    expect(styles).toContain('background: #f7f7fa;');
    expect(styles).toContain('.preview-panel.expanded');
    expect(styles).toContain('.preview-content,');
    expect(styles).toContain('.preview-page');
  });
});
