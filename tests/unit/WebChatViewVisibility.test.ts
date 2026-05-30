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
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain("defaultView.classList.toggle('is-hidden', mode !== 'default')");
    expect(source).toContain("conversationView.classList.toggle('is-hidden', mode !== 'conversation')");
  });

  test('main initializes workspace with an explicit default chat view before loading history', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('showDefaultChatView()');
  });
});
