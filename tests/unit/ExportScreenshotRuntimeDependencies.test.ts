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

  test('asset preparation forwards explicit export preview mode to screenshot capture', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/prepare_export_assets.py'), 'utf8');

    expect(source).toContain('EXPORT_PREVIEW_MODE');
    expect(source).toContain('"--preview-mode"');
  });

  test('runtime apt package manifest is the single source for browser system libraries', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
    const manifest = readFileSync(join(process.cwd(), 'deploy/runtime-apt-packages.txt'), 'utf8');

    expect(dockerfile).toContain('deploy/runtime-apt-packages.txt');
    expect(dockerfile).toContain('xargs -a deploy/runtime-apt-packages.txt apt-get install');
    expect(manifest).toContain('libnspr4');
    expect(manifest).toContain('libnss3');
    expect(manifest).toContain('python3');
    expect(manifest).toContain('python3-pil');
  });
});
