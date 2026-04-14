import { describe, expect, test } from 'vitest';

import { buildExportBatchPaths, normalizeExportRoot } from '../../web/src/export/export-paths';

describe('web export paths', () => {
  test('normalizes user-configured export roots without trailing separators', () => {
    expect(normalizeExportRoot('  /Users/demo/Documents/Theme Studio/  ')).toBe('/Users/demo/Documents/Theme Studio');
    expect(normalizeExportRoot('')).toBe('');
  });

  test('builds project-fixed and batch-specific export directories', () => {
    const paths = buildExportBatchPaths({
      exportRoot: '/Users/demo/Documents/Theme Studio',
      projectNameEn: 'project-123-project',
      timestamp: 1712999999000,
    });

    expect(paths.projectDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project');
    expect(paths.exportDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959');
  });
});
