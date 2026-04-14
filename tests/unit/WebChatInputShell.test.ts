import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web chat input shell', () => {
  test('uses dedicated shell classes for attachment strip, plus button, and send button instead of broad legacy rules', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(html).toContain('class="attachments-preview chat-shell-attachments"');
    expect(html).toContain('class="plus-btn ui-icon-button chat-shell-plus"');
    expect(html).toContain('id="sendBtn" class="ui-icon-button chat-shell-send"');

    expect(styles).toContain('.chat-shell-attachments');
    expect(styles).toContain('.chat-shell-send');
    expect(styles).toContain('.chat-shell-plus');
    expect(styles).toContain('.attachment-item');
    expect(styles).toContain('background: var(--surface-btn);');
    expect(styles).not.toContain('.input-row button {');
  });
});
