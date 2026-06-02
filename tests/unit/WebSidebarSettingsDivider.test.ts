import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web sidebar settings divider', () => {
  test('uses a single divider treatment above the settings button instead of overlapping lines', () => {
    const styles = readAllCSS();

    expect(styles).toContain('.sidebar-settings-btn');
    expect(styles).not.toContain('.sidebar-settings-btn::before');
  });
});
