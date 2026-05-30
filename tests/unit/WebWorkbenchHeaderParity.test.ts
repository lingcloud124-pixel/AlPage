import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web workbench header parity', () => {
  test('keeps chat header and preview topbar title treatments aligned', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.project-name');
    expect(styles).toContain('font-size: var(--font-size-title);');
    expect(styles).toContain('height: 70px;');
  });
});
