import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('web preview panel border', () => {
  test('does not render an outer left border on the expanded preview column', () => {
    const styles = readAllCSS();
    const match = styles.match(/\.preview-panel\.expanded\s*\{([^}]*)\}/);
    expect(match?.[1] || '').not.toContain('border-left');
  });

  test('does not paint an outer preview halo that leaks the panel background', () => {
    const styles = readAllCSS();
    const matches = [...styles.matchAll(/\.preview-panel\.expanded\s*\{([^}]*)\}/g)];
    expect(matches.every((match) => !match[1].includes('box-shadow'))).toBe(true);
  });
});
