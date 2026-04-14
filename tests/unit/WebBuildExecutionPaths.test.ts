import { describe, expect, test } from 'vitest';

import { resolveBuildDirectories } from '../../web/scripts/build';

describe('web build execution paths', () => {
  test('uses explicit export batch directories when provided by the export bridge', () => {
    const resolved = resolveBuildDirectories({
      nameEn: 'project-123-project',
      exportDir: '/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959',
    });

    expect(resolved.baseDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959');
    expect(resolved.assetsDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959/素材包');
    expect(resolved.packagesDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959/输出包');
  });
});
