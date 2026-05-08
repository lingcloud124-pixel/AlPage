import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web vite build inputs', () => {
  test('build includes preview and auxiliary html entry pages required by packaging flows', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/vite.config.ts'), 'utf8');

    expect(source).toContain("desktopPreview: resolve(__dirname, 'desktop-preview.html')");
    expect(source).toContain("landingPromptsAdmin: resolve(__dirname, 'landing-prompts-admin.html')");
    expect(source).toContain("loginPreview: resolve(__dirname, 'login-preview.html')");
    expect(source).not.toContain("login: resolve(__dirname, 'login.html')");
    expect(source).not.toContain("reset: resolve(__dirname, 'reset.html')");
  });
});
