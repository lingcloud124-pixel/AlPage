import { describe, expect, test } from 'vitest';

import { buildScreenshotThemeImageAssignments } from '../../web/src/export/theme-image-overrides';

describe('web screenshot theme image overrides', () => {
  test('maps a single theme image into every screenshot visual slot', () => {
    expect(
      buildScreenshotThemeImageAssignments('https://example.com/theme-bg.png'),
    ).toEqual({
      '--theme-login-bg-image': "url('https://example.com/theme-bg.png')",
      '--theme-header-bg-image': "url('https://example.com/theme-bg.png')",
      '--theme-sidebar-bg-image': "url('https://example.com/theme-bg.png')",
      '--theme-desktop-feature-image': "url('https://example.com/theme-bg.png')",
      '--theme-desktop-accent-image': "url('https://example.com/theme-bg.png')",
    });
  });

  test('returns no overrides when no theme image is provided', () => {
    expect(buildScreenshotThemeImageAssignments('')).toEqual({});
  });
});
