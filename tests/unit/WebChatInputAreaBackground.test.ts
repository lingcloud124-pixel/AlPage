import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web chat input area background', () => {
  test('keeps the shell input area background transparent in dark and light mode', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toMatch(/body\[data-ui-theme="light"\]\s+\.input-area\s*\{[^}]*background:\s*transparent;[^}]*\}/s);
    expect(styles).toMatch(/\.input-area\s*\{[^}]*padding:\s*18px 20px 24px;[^}]*background:\s*transparent;[^}]*\}/s);
  });
});
