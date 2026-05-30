import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web workbench chrome heights', () => {
  test('locks chat header, settings button presence, and topbar tab scoping', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.chat-header');
    expect(styles).toContain('height: 70px;');
    expect(styles).toContain('.sidebar-settings-btn');
    expect(styles).toContain('.topbar-tabs');
    expect(styles).toContain('.tab-btn');
    expect(styles).toContain('.topbar-tabs .tab-indicator');
  });
});
