import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar scrollbar tone', () => {
  test('uses a light transparent scrollbar thumb', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const block = [...styles.matchAll(/\.sidebar-list::-webkit-scrollbar-thumb\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(block).toContain('background: rgba(0, 0, 0, 0.1);');
  });
});
