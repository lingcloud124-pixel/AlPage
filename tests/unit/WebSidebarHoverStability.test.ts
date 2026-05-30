import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web sidebar hover stability', () => {
  test('keeps the sidebar item action slot reserved so hover does not shift the title text', () => {
    const styles = readAllCSS();
    const menuBlock = styles.match(/\n\.sidebar-item-menu\s*\{([^}]*)\}/)?.[1] || '';
    const hoverBlock = styles.match(/\n\.sidebar-item:hover \.sidebar-item-menu\s*\{([^}]*)\}/)?.[1] || '';

    expect(menuBlock).toContain('display: flex;');
    expect(menuBlock).toContain('opacity: 0;');
    expect(menuBlock).toContain('pointer-events: none;');
    expect(hoverBlock).toContain('opacity: 1;');
    expect(hoverBlock).toContain('pointer-events: auto;');
  });
});
