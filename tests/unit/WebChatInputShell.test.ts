import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web chat input shell', () => {
  test('uses dedicated shell classes for attachment strip, plus button, and send button instead of broad legacy rules', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const styles = readAllCSS();

    expect(html).toContain('class="plus-btn ui-icon-button chat-shell-plus"');
    expect(html).toContain('id="sendBtn" class="ui-icon-button chat-shell-send"');

    expect(styles).toContain('.chat-shell-attachments');
    expect(styles).toContain('.chat-shell-send');
    expect(styles).toContain('.chat-shell-plus');
    expect(styles).toContain('.attachment-item');
    expect(styles).toContain('background: var(--surface-btn);');
    expect(styles).not.toContain('.input-row button {');
  });

  test('landing upload trigger is an icon button without visible upload text', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const plusButton = html.match(/<button id="plusBtn"[\s\S]*?<\/button>/)?.[0] ?? '';

    expect(plusButton).toContain('aria-label="上传图片"');
    expect(plusButton).toContain('<svg');
    expect(plusButton).not.toContain('>上传图片<');
    expect(plusButton).not.toContain('style="font-size:13px');
  });
});
