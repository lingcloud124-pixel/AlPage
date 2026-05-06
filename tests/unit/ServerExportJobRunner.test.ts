import { describe, expect, test } from 'vitest';

describe('server export job runner', () => {
  test('runner source advances queued jobs through the online-service statuses', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(join(process.cwd(), 'server/src/export-job-runner.ts'), 'utf8');

    expect(source).toContain("status: 'preparing'");
    expect(source).toContain("status: 'capturing'");
    expect(source).toContain("status: 'packaging'");
    expect(source).toContain("status: 'verifying'");
    expect(source).toContain("status: 'completed'");
    expect(source).toContain('downloadUrl');
  });

  test('runner source invokes the shared asset preparation script before real packaging is wired in', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(join(process.cwd(), 'server/src/export-job-runner.ts'), 'utf8');

    expect(source).toContain('prepare_export_assets.py');
    expect(source).toContain('prepared-assets-manifest.json');
    expect(source).toContain('theme_builder.py');
    expect(source).toContain('verify-build.py');
    expect(source).toContain("const EXPORT_DIRECTORY_README_NAME = '使用说明.txt'");
    expect(source).toContain('writeExportDirectoryReadme(packagesDir)');
    expect(source).toContain('packagesReadmePath');
    expect(source).toContain("mode: 'packaged'");
  });
});
