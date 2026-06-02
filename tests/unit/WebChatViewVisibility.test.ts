import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web chat view visibility', () => {
  test('styles define hidden behavior for chat view switching', () => {
    const source = readAllCSS();

    expect(source).toContain('.is-hidden');
    expect(source).toContain('display: none');
  });

  test('chat manager toggles is-hidden between default and conversation views', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat/chat-conversation-state.ts'), 'utf8');

    expect(source).toContain("defaultView.classList.toggle('is-hidden', mode !== 'default')");
    expect(source).toContain("conversationView.classList.toggle('is-hidden', mode !== 'conversation')");
  });

  test('restoring a conversation exits landing-only layout state', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat/chat-conversation-state.ts'), 'utf8');

    expect(source).toContain("chatPanel?.classList.remove('landing-mode')");
    expect(source).toContain("chatPanel?.classList.remove('is-full-landing')");
  });
});
