import { describe, expect, test } from 'vitest';

import { pickBestThemeCandidate } from '../../web/src/tools/executor';

describe('web theme generation constraints', () => {
  test('enforces confirmed red hue when extracted candidates do not contain red', () => {
    const result = pickBestThemeCandidate(
      ['#D4AF37', '#F0C85A', '#E6D3A3'],
      'light-ui',
      'red',
    );

    expect(result.primaryColor).toBe('#C62828');
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
});
