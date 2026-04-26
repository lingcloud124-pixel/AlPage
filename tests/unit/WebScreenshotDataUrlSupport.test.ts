import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('web screenshot data url support', () => {
  test('preview screenshot runtime preserves data image urls instead of coercing to file urls', () => {
    const scriptPath = path.resolve('web/scripts/screenshot.ts');
    const source = fs.readFileSync(scriptPath, 'utf-8');

    expect(source).toContain("source.startsWith('data:image/')");
    expect(source).toContain('return source;');
  });
});
