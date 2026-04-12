import { describe, it, expect } from 'vitest';
import { getImageMappings } from '../../src/utils/imageMappings.js';
import { ThemeType } from '../../src/types/ThemeType.js';
import { getHeaderBgMappings, getHeaderGradientMappings, getLoginBgMapping } from '../../src/utils/imageMappings.js';
import { HEADER_TYPE_RELATIONS, PEN_EXPORT_RULES } from '../../src/config/themeRuleRegistry';
import { TemplateType } from '../../src/types/ThemeType.js';

describe('imageMappings', () => {
  it('does not map login background into MK desktop-only packs', () => {
    const mappings = getImageMappings(ThemeType.MK_GREEN);
    const targets = mappings.map(mapping => mapping.targetPath);
    expect(targets).not.toContain('login_bg/bg-login.jpg');
  });

  it('maps login background for packages that need login assets', () => {
    const scssTargets = getImageMappings(ThemeType.V12_SCSS).map(mapping => mapping.targetPath);
    expect(scssTargets).toContain('login_bg/bg-login.jpg');

    const mappings = getImageMappings(ThemeType.LOGIN_PACKAGE);
    const targets = mappings.map(mapping => mapping.targetPath);
    expect(targets).toContain('login_bg/bg-login.jpg');
  });

  it('derives login and gradient asset mappings from the rule registry', () => {
    expect(getLoginBgMapping(TemplateType.LIGHT_UI)).toStrictEqual({
      sourceFile: PEN_EXPORT_RULES['light-ui'].loginBackground.full.outputFile,
      targetPath: 'login_bg/bg-login.jpg',
      format: 'jpg',
    });

    expect(getHeaderGradientMappings(TemplateType.DARK_UI)).toStrictEqual([
      {
        sourceFile: PEN_EXPORT_RULES['dark-ui'].headers.gradientRight.outputFile,
        targetPath: 'static/header-gradient-right.png',
        format: 'png',
      },
      {
        sourceFile: PEN_EXPORT_RULES['dark-ui'].headers.gradientLeft.outputFile,
        targetPath: 'static/header-gradient-left.png',
        format: 'png',
      },
    ]);
  });

  it('uses the header type relation registry as the source of truth for V-series header background exports', () => {
    const expectedFiles = Object.values(HEADER_TYPE_RELATIONS['light-ui']).map((item) => item.outputFile);
    const actualFiles = getHeaderBgMappings(TemplateType.LIGHT_UI).map((item) => item.sourceFile);

    expect(actualFiles).toEqual(expectedFiles);
  });
});
