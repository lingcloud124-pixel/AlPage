import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web settings surface removal', () => {
  test('frontend no longer ships workspace settings modal or sidebar entrypoints', () => {
    const uiSetupSource = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const indexSource = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const mainSource = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(uiSetupSource).not.toContain('settingsModal');
    expect(uiSetupSource).not.toContain('setupSettingsDialog');
    expect(indexSource).not.toContain('settingsModal');
    expect(indexSource).not.toContain('sidebarSettingsBtn');
    expect(indexSource).not.toContain('sidebarSettingsFullBtn');
    expect(mainSource).not.toContain('setupSettingsDialog');
  });
});
