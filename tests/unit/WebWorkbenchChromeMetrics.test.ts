import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web workbench chrome metrics', () => {
  test('uses a 70px preview topbar and invisible pane dividers', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.workspace-topbar');
    expect(styles).toContain('height: 70px;');
    expect(styles).toContain('.pane-divider');
    expect(styles).toContain('width: 0;');
    expect(styles).toContain('flex: 0 0 0;');
    expect(styles).toContain('background: transparent;');
  });
});
