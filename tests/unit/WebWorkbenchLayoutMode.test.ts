import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web workbench layout mode', () => {
  test('syncs sidebar/chat layout with active preview tab and preview availability', () => {
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(uiSetup).toContain('syncWorkbenchLayoutForActiveTab');
    expect(uiSetup).toContain("activeTabId === 'mainPageTab'");
    expect(uiSetup).toContain('setChatPanelWidth(372)');
    expect(uiSetup).toContain('setChatPanelWidth(null)');
    expect(main).toContain('syncWorkbenchLayoutForActiveTab(true');
    expect(main).toContain('syncWorkbenchLayoutForActiveTab(false');
  });
});
