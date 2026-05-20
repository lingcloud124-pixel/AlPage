import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar scrollbar tone', () => {
  test('hides scrollbar for clean appearance', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const block = [...styles.matchAll(/\.sidebar-list::-webkit-scrollbar\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(block).toContain('display: none;');
  });
});
