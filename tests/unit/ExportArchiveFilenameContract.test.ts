import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('export archive filename contract', () => {
  test('frontend and backend both use YYYYMMDD-themeNameEn zip naming without -all suffix', () => {
    const packageManager = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');
    const exportRoute = fs.readFileSync(path.join(projectRoot, 'server/src/routes/export-jobs.ts'), 'utf8');

    expect(packageManager).toContain('function formatExportDatePrefix(now: Date = new Date()): string');
    expect(packageManager).toContain('const filename = `${formatExportDatePrefix()}-${snapshotName}.zip`;');
    expect(exportRoute).toContain('function formatDatePrefix(now: Date = new Date()): string');
    expect(exportRoute).toContain('const archiveName = `${formatDatePrefix()}-${snapshotName}.zip`;');
    expect(packageManager).not.toContain('-all.zip');
    expect(exportRoute).not.toContain('-all.zip');
  });
});
