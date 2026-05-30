import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web workbench adaptive chat', () => {
  test('does not hard-lock the chat panel to 280px in css when preview is absent', () => {
    const styles = readAllCSS();

    expect(styles).toContain('#chatPanel');
    expect(styles).toContain('flex: 1 1 auto;');
    expect(styles).toContain('min-width: 0;');
    expect(styles).not.toContain('flex: 0 0 280px;');
  });
});
