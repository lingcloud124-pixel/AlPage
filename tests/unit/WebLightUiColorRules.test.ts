import { describe, expect, test } from 'vitest';

import { getDefaultColors } from '../../web/src/project-manager';
import {
  adjustHsl,
  DEFAULT_LIGHT_UI_PRIMARY,
  blendWhite,
  buildThemeGenerationReport,
  darken,
  deriveColorsFromPrimary,
  hexToHsl,
  mixColors,
  warmShift,
} from '../../web/src/theme/color-utils';
import { getContrastRatio, resolvePrimaryContrast } from '../../web/src/tools/contrast-validator';

describe('web light-ui color rules', () => {
  test('derives light-ui colors from the documented blend and alter formulas', () => {
    const primary = '#4CAF50';
    const derived = deriveColorsFromPrimary(primary, 'light-ui');
    const headerExtend = warmShift(blendWhite(primary, 0.05), 2, -1, -3);
    const loginBg = warmShift(blendWhite(primary, 0.04), 1, 0, -2);
    const sidebarPanel = warmShift(blendWhite(primary, 0.05), 3, 0, -4);

    expect(derived['primary-color']).toBe(primary);
    expect(derived['primary-color-hover']).toBe(adjustHsl(primary, 8, 4));
    expect(derived['alter-color']).toBe(darken(primary, 11));
    expect(derived['alter-color-hover-on']).toBe(mixColors('#FFFFFF', primary, 0.625));
    expect(derived['primary-color-opacity-10']).toBe(blendWhite(primary, 0.1));
    expect(derived['primary-color-opacity-20']).toBe(blendWhite(primary, 0.2));
    expect(derived['primary-color-opacity-30']).toBe(blendWhite(primary, 0.3));
    expect(derived['header-font-color']).toBe('#333333');
    expect(derived['tlayout-header-bg-extend-color']).toBe(headerExtend);
    expect(derived['portal-header-bg-extend-color']).toBe(headerExtend);
    expect(derived['portal-header-complex-bg-extend-color']).toBe(headerExtend);
    expect(derived['login-bg-color']).toBe(loginBg);
    expect(derived['sidebar-panel-bg']).toBe(sidebarPanel);
    expect(derived['gradient-start']).toBe(headerExtend);
    expect(derived['gradient-mid']).toBe(derived['primary-color-opacity-10']);
    expect(derived['sidebar-color']).toBe('#000000');
    expect(derived['sidebar-icon-color']).toBe(mixColors('#8A8A8A', primary, 0.2));
    expect(derived['border-color']).toBe('#D8D8D8');
    expect(derived['border-icon-color']).toBe(mixColors('#D8D8D8', primary, 0.05));
    expect(derived['primary-text-color']).toBe('#333333');
  });

  test('keeps default project colors aligned with the shared light-ui derivation', () => {
    const defaults = getDefaultColors();
    const derivedDefaults = deriveColorsFromPrimary(DEFAULT_LIGHT_UI_PRIMARY, 'light-ui');

    expect(defaults['--primary-color']).toBe(DEFAULT_LIGHT_UI_PRIMARY);
    expect(defaults['--primary-color-hover']).toBe(derivedDefaults['primary-color-hover']);
    expect(defaults['--alter-color']).toBe(derivedDefaults['alter-color']);
    expect(defaults['--alter-color-hover-on']).toBe(derivedDefaults['alter-color-hover-on']);
    expect(defaults['--tlayout-header-bg-extend-color']).toBe(derivedDefaults['tlayout-header-bg-extend-color']);
    expect(defaults['--portal-header-bg-extend-color']).toBe(derivedDefaults['portal-header-bg-extend-color']);
    expect(defaults['--login-bg-color']).toBe(derivedDefaults['login-bg-color']);
    expect(defaults['--sidebar-panel-bg']).toBe(derivedDefaults['sidebar-panel-bg']);
    expect(defaults['--gradient-start']).toBe(derivedDefaults['gradient-start']);
  });

  test('representative compliant primary still passes the light-ui validation report', () => {
    const primary = '#4CAF50';
    const derived = deriveColorsFromPrimary(primary, 'light-ui');

    expect(buildThemeGenerationReport(primary, derived, 'light-ui').passed).toBe(true);
  });

  test('automatically chooses a readable primary text color', () => {
    const resolvedLight = resolvePrimaryContrast('#BFE8FF');
    const resolvedDark = resolvePrimaryContrast('#0E70EE');

    expect(resolvedLight.text).toBe('#333333');
    expect(getContrastRatio(resolvedLight.text, resolvedLight.primary)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(resolvedDark.text, resolvedDark.primary)).toBeGreaterThanOrEqual(4.5);
  });

  test('adjusts light-ui primary when needed to preserve readability', () => {
    const resolved = resolvePrimaryContrast('#7FBFFF');
    const hsl = hexToHsl(resolved.primary);

    expect(hsl.l).toBeGreaterThanOrEqual(0);
    expect(getContrastRatio(resolved.text, resolved.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
