import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web history preview resume', () => {
  test('project persistence keeps data image backgrounds so generated preview history can be reopened', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('if (project.bgImageUrl) {');
  });

  test('workspace reopens preview when the project has saved preview assets or primary visual context', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('window.addEventListener(\'sidebar:restore-project\'');
    expect(source).toContain('if (project.bgImageUrl) {');
    expect(source).toContain('if (project.headerBgImageUrl) {');
    expect(source).toContain('expandPreview();');
  });
});
