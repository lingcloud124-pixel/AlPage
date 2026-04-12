import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web entry imports', () => {
  test('main entry does not dynamically re-import executor helpers already used in the main bundle', () => {
    const mainTs = fs.readFileSync(
      path.join(projectRoot, 'web/src/main.ts'),
      'utf8',
    );

    expect(mainTs).not.toContain("await import('./tools/executor')");
  });
});
