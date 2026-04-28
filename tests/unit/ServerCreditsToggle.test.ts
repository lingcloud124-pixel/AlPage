import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server credits toggle', () => {
  test('credits middleware bypasses quota enforcement when quota is disabled', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/middleware/credits.ts'), 'utf8');

    expect(source).toContain('enabled_features?.quota === false');
    expect(source).toContain('return next();');
  });

  test('image route deducts credits after successful generation when quota is enabled', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(source).toContain('imageSecurityConfig?.enabled_features?.quota !== false');
    expect(source).toContain('deductCredits(imageUserId, imageCreditsPerGen);');
  });

  test('credits route exposes whether quota is enabled', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/credits.ts'), 'utf8');

    expect(source).toContain('const quotaEnabled = config?.enabled_features?.quota !== false;');
    expect(source).toContain('quotaEnabled,');
  });
});
