import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web history preview resume', () => {
  test('project persistence keeps data image backgrounds so generated preview history can be reopened', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/project-manager.ts'), 'utf8');

    expect(source).toContain("if (project.bgImageUrl !== undefined) result.bg_image_url = project.bgImageUrl;");
  });

  test('workspace reopens preview when the project has saved preview assets or primary visual context', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('const hasSavedPreviewAssets = Boolean(project.bgImageUrl || project.headerBgImageUrl);');
    expect(source).toContain("const hasPrimaryVisualContext = project.visualContext?.imageInput?.role === 'primary';");
    expect(source).toContain('const shouldOpenPreview = hasSavedColors || hasSavedPreviewAssets || hasPrimaryVisualContext;');
    expect(source).toContain('if (shouldOpenPreview) {');
  });
});
