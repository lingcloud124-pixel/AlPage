import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web landing brand navigation', () => {
  test('chat header brand is rendered as a home button in the workspace shell', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="landingHomeBtn"');
    expect(html).toContain('class="landing-brand" type="button"');
    expect(html).toContain('title="返回首页"');
  });

  test('ui setup wires the landing brand button into the shared back-to-home handler', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');

    expect(source).toContain("document.getElementById('landingHomeBtn')");
    expect(source).toContain("trigger.addEventListener('click', () => showWorkspaceLandingState())");
  });
});
