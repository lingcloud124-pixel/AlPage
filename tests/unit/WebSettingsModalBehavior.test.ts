import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web settings modal behavior', () => {
  test('scopes the close button to settings modal and does not close on overlay click', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');

    expect(source).toContain("settingsModal.querySelector('.modal-close-btn')");
    expect(source).not.toContain("document.querySelector('.modal-close-btn')");
    expect(source).not.toContain("if (e.target === settingsModal) closeSettingsDialog()");
  });
});
