import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web theme state reset', () => {
  test('landing reset clears stale preview theme state before syncing color editor', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('resetThemeTargetStyles();');
    expect(source).toContain("applyTemplateSpecificThemeVars('light-ui');");
    expect(source).toContain('syncThemeConfigurationFromTheme();');
  });

  test('restoring a project reapplies template vars using the project template type', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('applyTemplateSpecificThemeVars(project.templateType);');
    expect(source).not.toContain('applyTemplateSpecificThemeVars(project);');
  });
});
