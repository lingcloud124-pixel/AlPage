import { describe, expect, test } from 'vitest';

import { pickBestThemeCandidate, quantizedBucketToHex } from '../../web/src/tools/executor';
import {
  hexToHsl,
  isDisallowedThemeColor,
  normalizePrimaryForTemplate,
  pickFallbackPaletteColorByHue,
} from '../../web/src/theme/color-utils';
import { getContrastRatio } from '../../web/src/tools/contrast-validator';

describe('web theme generation constraints', () => {
  test('enforces confirmed red hue when extracted candidates do not contain red', () => {
    const result = pickBestThemeCandidate(
      ['#D4AF37', '#F0C85A', '#E6D3A3'],
      'light-ui',
      'red',
    );

    const hsl = hexToHsl(result.primaryColor);
    expect(hsl.h).toBeGreaterThanOrEqual(0);
    expect(hsl.h).toBeLessThanOrEqual(10);
    expect(hsl.l).toBeGreaterThanOrEqual(45);
    expect(hsl.l).toBeLessThanOrEqual(60);
    expect(result.enforcedPreferredHue).toBe(true);
    expect(result.enforcementReason).toContain('强制校正');
  });

  test('keeps extracted hue when it matches the confirmed direction', () => {
    const result = pickBestThemeCandidate(
      ['#C93A32', '#D95A43', '#E8B36F'],
      'light-ui',
      'red',
    );

    expect(result.enforcedPreferredHue).toBe(false);
    expect(result.primaryColor.startsWith('#')).toBe(true);
  });

  test('normalizes an over-bright light-ui candidate back into the recommended range', () => {
    const result = pickBestThemeCandidate(
      ['#DCFFDC', '#D4F5D4', '#C8EBC8'],
      'light-ui',
    );

    expect(result.primaryColor).not.toBe('#DCFFDC');
    expect(hexToHsl(result.primaryColor).l).toBeGreaterThanOrEqual(45);
    expect(hexToHsl(result.primaryColor).l).toBeLessThanOrEqual(60);
    expect(result.report.passed).toBe(true);
  });

  test('keeps bucket hex output aligned with the filtered quantized color', () => {
    expect(quantizedBucketToHex(220, 255, 220)).toBe('#dcffdc');
    expect(quantizedBucketToHex(200, 240, 200)).toBe('#c8f0c8');
    expect(quantizedBucketToHex(200, 240, 200)).not.toBe('#dcffdc');
  });

  test('rejects gray and over-bright colors as disallowed theme colors', () => {
    expect(isDisallowedThemeColor('#BFBFBF')).toBe(true);
    expect(isDisallowedThemeColor('#DCFFDC')).toBe(true);
    expect(isDisallowedThemeColor('#0E70EE')).toBe(false);
  });

  test('normalizes low-saturation light-ui candidates into the standard saturation and lightness bands', () => {
    const normalized = normalizePrimaryForTemplate('#8A9A8A', 'light-ui');
    const hsl = hexToHsl(normalized);

    expect(hsl.s).toBeGreaterThanOrEqual(50);
    expect(hsl.s).toBeLessThanOrEqual(70);
    expect(hsl.l).toBeGreaterThanOrEqual(45);
    expect(hsl.l).toBeLessThanOrEqual(60);
  });

  test('falls back to the nearest standard palette color for unmatched hues', () => {
    expect(pickFallbackPaletteColorByHue(210)).toBe('#0E70EE');
    expect(pickFallbackPaletteColorByHue(120)).toBe('#07B11F');
  });

  test('falls back to the standard palette when extracted candidates are all disallowed', () => {
    const result = pickBestThemeCandidate(
      ['#DCFFDC', '#F2F2F2', '#101010'],
      'light-ui',
    );

    const hsl = hexToHsl(result.primaryColor);
    expect(hsl.h).toBeGreaterThanOrEqual(205);
    expect(hsl.h).toBeLessThanOrEqual(220);
    expect(hsl.s).toBeGreaterThanOrEqual(50);
    expect(hsl.l).toBeGreaterThanOrEqual(45);
    expect(hsl.l).toBeLessThanOrEqual(60);
    expect(result.report.passed).toBe(true);
  });

  test('produces a readable primary text token for the selected light-ui theme', () => {
    const result = pickBestThemeCandidate(
      ['#7FBFFF', '#63A8F5', '#4C92E0'],
      'light-ui',
    );

    expect(getContrastRatio(
      result.derivedColors['primary-text-color'],
      result.derivedColors['primary-color'],
    )).toBeGreaterThanOrEqual(4.5);
  });
});
