import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web composer textarea scroll behavior', () => {
  test('chat manager marks textarea as scrollable only after auto-grow reaches its cap', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain("input.dataset.scrollLocked = String(input.scrollHeight <= 72);");
    expect(source).toContain("const scrollable = input.scrollHeight > 72;");
    expect(source).toContain("input.classList.toggle('is-scrollable', scrollable);");
  });

  test('composer textarea keeps overflow hidden by default and enables vertical scroll when needed', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/chat-input.css'), 'utf8');

    expect(styles).toContain('overflow-y: hidden;');
    expect(styles).toContain('.chat-shell-composer-inner textarea.is-scrollable');
    expect(styles).toContain('overflow-y: auto;');
    expect(styles).toContain('overscroll-behavior: contain;');
  });
});
