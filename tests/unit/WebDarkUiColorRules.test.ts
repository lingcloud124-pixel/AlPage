import { describe, expect, test } from 'vitest';

import {
  blendWhite,
  buildThemeGenerationReport,
  deriveColorsFromPrimary,
} from '../../web/src/theme/color-utils';

describe('web dark-ui color rules', () => {
  test('keeps primary from the extracted image and derives the rest from dark-ui rules', () => {
    const primary = '#A7160B';
    const derived = deriveColorsFromPrimary(primary, 'dark-ui');

    expect(derived['primary-color'].toLowerCase()).toBe(primary.toLowerCase());
    expect(derived['primary-color-opacity-10']).toBe(blendWhite(primary, 0.1));
    expect(derived['primary-color-opacity-20']).toBe(blendWhite(primary, 0.2));
    expect(derived['primary-color-opacity-30']).toBe(blendWhite(primary, 0.3));
    expect(derived['portal-header-complex-bg-extend-color']).toBe(derived['portal-header-bg-extend-color']);
    expect(derived['header-font-color']).toBe('#FFE4CF');
    expect(derived['header-font-color-hover'].toLowerCase()).toBe(primary.toLowerCase());
    expect(derived['sidebar-icon-color']).toBe('#DCB496');
    expect(derived['search-font-color']).toBe(derived['header-font-color']);
    expect(derived['search-input-border-color'].toLowerCase()).toBe(primary.toLowerCase());
    expect(derived['search-placehold-font-color'].toLowerCase()).toBe(primary.toLowerCase());
    expect(derived['sidebar-panel-bg']).toBe(derived['header-font-color']);
    expect(derived['sidebar-accordionpanel-header-bg'].toLowerCase()).toBe(primary.toLowerCase());
    expect(derived['sidebar-accordionpanel-header-bgon']).toBe(derived['alter-color']);
  });

  test('passes the dark-ui generation checks for sample-style warm palettes', () => {
    const primary = '#A7160B';
    const derived = deriveColorsFromPrimary(primary, 'dark-ui');
    const report = buildThemeGenerationReport(primary, derived, 'dark-ui');

    expect(report.passed).toBe(true);
  });
});
