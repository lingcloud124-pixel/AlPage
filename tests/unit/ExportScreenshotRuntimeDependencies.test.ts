import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('export screenshot runtime dependencies', () => {
  test('root runtime install includes packages needed by server-side asset capture', () => {
    const rootPackage = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const dependencies = rootPackage.dependencies ?? {};

    expect(dependencies).toHaveProperty('playwright');
    expect(dependencies).toHaveProperty('tsx');
  });

  test('asset preparation can run screenshot capture with root-installed tsx', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/prepare_export_assets.py'), 'utf8');

    expect(source).toContain('PROJECT_ROOT / "node_modules" / "tsx" / "dist" / "loader.mjs"');
  });
});
