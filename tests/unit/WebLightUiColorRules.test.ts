import { describe, expect, test } from 'vitest';

import { getDefaultColors } from '../../web/src/project-manager';
import {
  DEFAULT_LIGHT_UI_PRIMARY,
  blendWhite,
  buildThemeGenerationReport,
  darken,
  deriveColorsFromPrimary,
  desaturate,
  lighten,
} from '../../web/src/theme/color-utils';

describe('web light-ui color rules', () => {
  test('derives light-ui colors from the documented blend and alter formulas', () => {
    const primary = '#4CAF50';
    const derived = deriveColorsFromPrimary(primary, 'light-ui');

    expect(derived['primary-color']).toBe(primary);
    expect(derived['primary-color-hover']).toBe(lighten(primary, 15));
    expect(derived['alter-color']).toBe(desaturate(darken(primary, 15), 20));
    expect(derived['alter-color-hover-on']).toBe(lighten(derived['primary-color-hover'], 15));
    expect(derived['primary-color-opacity-10']).toBe(blendWhite(primary, 0.1));
    expect(derived['primary-color-opacity-20']).toBe(blendWhite(primary, 0.2));
    expect(derived['primary-color-opacity-30']).toBe(blendWhite(primary, 0.3));
    expect(derived['header-font-color']).toBe('#333333');
    expect(derived['login-bg-color']).toBe('#FDFFF6');
    expect(derived['sidebar-panel-bg']).toBe(derived['portal-header-bg-extend-color']);
    expect(derived['sidebar-icon-color']).toBe(primary);
  });

  test('keeps default project colors aligned with the shared light-ui derivation', () => {
    const defaults = getDefaultColors();
    const derivedDefaults = deriveColorsFromPrimary(DEFAULT_LIGHT_UI_PRIMARY, 'light-ui');

    expect(defaults['--primary-color']).toBe(DEFAULT_LIGHT_UI_PRIMARY);
    expect(defaults['--primary-color-hover']).toBe(derivedDefaults['primary-color-hover']);
    expect(defaults['--alter-color']).toBe(derivedDefaults['alter-color']);
    expect(defaults['--alter-color-hover-on']).toBe(derivedDefaults['alter-color-hover-on']);
    expect(defaults['--login-bg-color']).toBe('#FDFFF6');
    expect(defaults['--sidebar-panel-bg']).toBe('#FBFCF2');
  });

  test('representative compliant primary still passes the light-ui validation report', () => {
    const primary = '#4CAF50';
    const derived = deriveColorsFromPrimary(primary, 'light-ui');

    expect(buildThemeGenerationReport(primary, derived, 'light-ui').passed).toBe(true);
  });
});
