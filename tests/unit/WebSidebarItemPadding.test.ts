import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web sidebar item padding', () => {
  test('uses a 24px left padding for conversation rows', () => {
    const styles = readAllCSS();
    const block = [...styles.matchAll(/\.sidebar-item\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(block).toContain('padding: 6px 10px 6px 24px;');
  });
});
