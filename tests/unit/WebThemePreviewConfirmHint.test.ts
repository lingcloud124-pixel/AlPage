import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web theme preview confirm hint', () => {
  test('uses a dedicated shared class instead of inline confirm hint color styling', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const styles = readAllCSS();

    expect(source).toContain('class="theme-preview-confirm-hint"');
    expect(source).not.toContain('font-size:13px;color:#999;');
    expect(styles).toContain('.theme-preview-confirm-hint');
    expect(styles).toContain('color: #999;');
  });
});
