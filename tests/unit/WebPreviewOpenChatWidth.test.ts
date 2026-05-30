import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web preview-open chat width', () => {
  test('uses 378px chat width when preview is expanded', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.app-container.preview-open .chat-panel');
    expect(styles).toContain('width: 378px;');
    expect(styles).toContain('flex: 0 0 auto;');
  });
});
