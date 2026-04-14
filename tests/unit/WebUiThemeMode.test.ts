import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui theme mode', () => {
  test('stores a shell-only uiTheme setting and exposes a light-mode control in the settings modal', () => {
    const types = fs.readFileSync(path.join(projectRoot, 'web/src/types.ts'), 'utf8');
    const chatClient = fs.readFileSync(path.join(projectRoot, 'web/src/agent/chat-client.ts'), 'utf8');
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(types).toContain("uiTheme?: 'dark' | 'light';");
    expect(chatClient).toContain("uiTheme: 'dark'");
    expect(html).toContain('id="uiThemeMode"');
    expect(uiSetup).toContain('applyUiTheme');
    expect(styles).toContain('body[data-ui-theme="light"]');
    expect(styles).toContain('--app-bg: #F5F5F5;');
    expect(styles).toContain('body[data-ui-theme="light"] .project-sidebar');
    expect(styles).toContain('background: #F5F5F5;');
    expect(styles).toContain('body[data-ui-theme="light"] .chat-header');
    expect(styles).toContain('body[data-ui-theme="light"] .input-area');
    expect(styles).toContain('body[data-ui-theme="light"] .workspace-topbar');
  });
});
