import { describe, expect, test } from 'vitest';

import { HEADER_TYPE_RELATIONS, PEN_EXPORT_RULES } from '../../src/config/themeRuleRegistry';
import {
  getExpectedExportSizes,
  REQUIRED_EXPORT_FILES,
  buildSourceImageFileMap,
} from '../../scripts/lib/export-asset-rules.mjs';

describe('export asset rules', () => {
  test('required export files include the current packaging-critical assets', () => {
    expect(REQUIRED_EXPORT_FILES).toContain(PEN_EXPORT_RULES['light-ui'].loginBackground.full.outputFile);
    expect(REQUIRED_EXPORT_FILES).toContain(PEN_EXPORT_RULES['light-ui'].headers.banner.outputFile);
    expect(REQUIRED_EXPORT_FILES).toContain('login_thumb.jpg');
    expect(REQUIRED_EXPORT_FILES).toContain('login_bg/thumb-1.jpg');
    expect(REQUIRED_EXPORT_FILES).toContain('login_bg/thumb-2.jpg');
  });

  test('source image file map aligns critical names with current registry conventions', () => {
    const fileMap = buildSourceImageFileMap();

    expect(fileMap.headerBanner).toBe(PEN_EXPORT_RULES['light-ui'].headers.banner.outputFile);
    expect(fileMap.headerComplex).toBe(PEN_EXPORT_RULES['light-ui'].headers.complex.outputFile);
    expect(fileMap.headerSimple).toBe(PEN_EXPORT_RULES['light-ui'].headers.default.outputFile);
    expect(fileMap.headerSideheader).toBe(PEN_EXPORT_RULES['light-ui'].headers.sideHeader.outputFile);
    expect(fileMap.headerSingleMenuFrameBg).toBe(HEADER_TYPE_RELATIONS['light-ui'].singleMenu.outputFile);
    expect(fileMap.headerZoneFrameBg).toBe(HEADER_TYPE_RELATIONS['light-ui'].simple.outputFile);
    expect(fileMap.headerZoneNavFrameBg).toBe(HEADER_TYPE_RELATIONS['light-ui'].zoneNav.outputFile);
  });

  test('export size rules honor template-specific sideheader dimensions', () => {
    expect(getExpectedExportSizes('light-ui')['header-sideheader.png']).toEqual({ width: 200, height: 900 });
    expect(getExpectedExportSizes('dark-ui')['header-sideheader.png']).toEqual({ width: 200, height: 488 });
  });
});
