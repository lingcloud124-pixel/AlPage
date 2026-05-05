import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web workbench pane layout', () => {
  test('includes dedicated pane dividers and main-page tab behavior hooks', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(html).toContain('id="previewDivider"');
    expect(uiSetup).toContain('setChatPanelWidth');
    expect(uiSetup).toContain('syncWorkbenchLayoutForActiveTab');
    expect(styles).toContain('.pane-divider');
    expect(styles).toContain('#chatPanel');
    expect(styles).toContain('flex: 1 1 auto;');
    expect(styles).toContain('.preview-page.active-preview');
  });
});
