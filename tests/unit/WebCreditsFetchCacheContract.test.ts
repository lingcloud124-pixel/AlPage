import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web credits fetch cache contract', () => {
  test('credits fetch disables browser cache so admin toggle changes apply immediately', () => {
    const creditsSource = fs.readFileSync(path.join(projectRoot, 'web/src/credits.ts'), 'utf8');

    expect(creditsSource).toContain("apiFetch('/api/theme/credits', {");
    expect(creditsSource).toContain("cache: 'no-store'");
  });
});
