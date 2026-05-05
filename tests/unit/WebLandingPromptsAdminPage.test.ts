import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web landing prompts admin page', () => {
  test('exposes a dedicated standalone page for landing prompt configuration', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/landing-prompts-admin.html'), 'utf8');
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/landing-prompts-admin.ts'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('快捷指令配置');
    expect(html).toContain('landingPromptAdminList');
    expect(html).toContain('landingPromptSaveBtn');
    expect(html).toContain('landingPromptResetBtn');
    expect(source).toContain('saveLandingPromptEntries');
    expect(source).toContain('resetLandingPromptEntries');
    expect(indexHtml).not.toContain('landingPromptConfigList');
  });
});
