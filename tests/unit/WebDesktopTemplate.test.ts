import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  buildThemeImageAssignments,
  getThemeImageVariables,
} from '../../web/src/templates/theme-images';

const projectRoot = process.cwd();

describe('web desktop theme image mapping', () => {
  test('desktop background image is applied to all key visual regions', () => {
    expect(getThemeImageVariables('desktop')).toEqual([
      '--theme-header-bg-image',
      '--theme-sidebar-bg-image',
      '--theme-desktop-feature-image',
      '--theme-desktop-accent-image',
    ]);

    expect(buildThemeImageAssignments('desktop', 'https://example.com/theme.png')).toEqual({
      '--theme-header-bg-image': "url('https://example.com/theme.png')",
      '--theme-sidebar-bg-image': "url('https://example.com/theme.png')",
      '--theme-desktop-feature-image': "url('https://example.com/theme.png')",
      '--theme-desktop-accent-image': "url('https://example.com/theme.png')",
    });
  });

  test('login background image keeps its dedicated variable', () => {
    expect(getThemeImageVariables('login')).toEqual(['--theme-login-bg-image']);
    expect(buildThemeImageAssignments('login', 'https://example.com/login.png')).toEqual({
      '--theme-login-bg-image': "url('https://example.com/login.png')",
    });
  });
});

describe('web desktop template structure', () => {
  test('desktop html includes themed hero and sidebar visual anchors', () => {
    const desktopHtml = fs.readFileSync(
      path.join(projectRoot, 'web/src/templates/desktop.html'),
      'utf8',
    );

    expect(desktopHtml).toContain('sidebar-theme-top');
    expect(desktopHtml).toContain('sidebar-theme-bottom');
    expect(desktopHtml).toContain('featured-story-card');
    expect(desktopHtml).toContain('featured-story-media');
    expect(desktopHtml).toContain('featured-story-list');
  });

  test('theme variable sheet declares desktop-specific image variables', () => {
    const themeVariablesCss = fs.readFileSync(
      path.join(projectRoot, 'web/src/templates/theme-variables.css'),
      'utf8',
    );

    expect(themeVariablesCss).toContain('--theme-sidebar-bg-image');
    expect(themeVariablesCss).toContain('--theme-desktop-feature-image');
    expect(themeVariablesCss).toContain('--theme-desktop-accent-image');
  });

  test('desktop chrome styling stays theme-driven instead of baking in basketball colors', () => {
    const desktopCss = fs.readFileSync(
      path.join(projectRoot, 'web/src/templates/desktop.css'),
      'utf8',
    );

    expect(desktopCss).not.toMatch(/rgba\(\s*240,\s*120,\s*40/i);
    expect(desktopCss).not.toContain('#F07828');
    expect(desktopCss).not.toMatch(/rgba\(\s*51,\s*51,\s*51/i);
    expect(desktopCss).toContain('color-mix(in srgb, var(--primary-color)');
    expect(desktopCss).toContain('color-mix(in srgb, var(--header-font-color)');
  });
});
