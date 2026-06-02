import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web sidebar new chat spacing', () => {
  test('uses the tighter expanded sidebar new-chat spacing', () => {
    const styles = readAllCSS();
    const block = [...styles.matchAll(/\.sidebar-new-chat-full\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(block).toContain('margin: 8px 0 0;');
    expect(block).toContain('padding: 4px 12px 4px 5px;');
  });
});
