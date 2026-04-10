import { describe, it, expect, beforeEach } from 'vitest';
import { ColorSchemeGenerator } from '../../src/theme-automation/core/ColorSchemeGenerator';
import { generateThemePackNames } from '../../src/theme-automation/utils/namingUtils';

describe('Theme Automation - ColorSchemeGenerator', () => {
  let colorGenerator: ColorSchemeGenerator;

  beforeEach(() => {
    colorGenerator = new ColorSchemeGenerator();
  });

  describe('deriveColorScheme', () => {
    it('should generate valid color scheme from primary color', () => {
      const scheme = colorGenerator.deriveColorScheme('#C41E3A');

      expect(scheme.primary).toBe('#C41E3A');
      expect(scheme.primaryHover).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.third).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.primaryOpacity10).toMatch(/^rgba?\(/);
      expect(scheme.primaryOpacity20).toMatch(/^rgba?\(/);
      expect(scheme.primaryOpacity30).toMatch(/^rgba?\(/);
    });

    it('should throw error for invalid hex color', () => {
      expect(() => {
        colorGenerator.deriveColorScheme('invalid-color');
      }).toThrow();
    });

    it('should calculate contrast ratios', () => {
      const scheme = colorGenerator.deriveColorScheme('#C41E3A');

      expect(scheme.contrastRatios).toBeDefined();
      expect(scheme.contrastRatios!.primaryOnWhite).toBeGreaterThan(0);
      expect(scheme.contrastRatios!.primaryHoverOnWhite).toBeGreaterThan(0);
    });
  });

  describe('deriveDesktopAIColorScheme', () => {
    it('should generate Desktop AI color scheme', () => {
      const scheme = colorGenerator.deriveDesktopAIColorScheme('#C41E3A');

      expect(scheme['primary-color']).toBe('#C41E3A');
      expect(scheme['primary-color-hover']).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme['alter-color']).toBeDefined();
      expect(scheme['sidebar-panel-bg']).toBeDefined();
    });

    it('should generate dark mode variant', () => {
      const scheme = colorGenerator.deriveDesktopAIColorScheme('#C41E3A');

      const darkScheme = colorGenerator.deriveDesktopAIColorScheme('#C41E3A');

      expect(scheme['primary-color']).toBe(darkScheme['primary-color']);
    });
  });

  describe('generateFromKeywords', () => {
    it('should generate color scheme from keywords', async () => {
      const scheme = await colorGenerator.generateFromKeywords('2026年清明节主题，绿色科技能源风格');

      expect(scheme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.keywords).toContain('清明');
      expect(scheme.keywords).toContain('绿色');
    });

    it('should handle festival keywords', async () => {
      const scheme = await colorGenerator.generateFromKeywords('春节主题');

      expect(scheme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.keywords).toContain('春节');
    });
  });

  describe('refineScheme', () => {
    it('should refine scheme based on primary color feedback', () => {
      const current = colorGenerator.deriveColorScheme('#C41E3A');
      const feedback = '主色改成深红色 #B22222';

      const refined = colorGenerator.refineScheme(current, feedback);

      expect(refined.primary).toBe('#B22222');
    });

    it('should handle brightness adjustment feedback', () => {
      const current = colorGenerator.deriveColorScheme('#C41E3A');
      const feedback = '颜色太深';

      const refined = colorGenerator.refineScheme(current, feedback);

      expect(refined.primary).toBeDefined();
    });
  });
});

describe('Naming Utils', () => {
  describe('generateThemePackNames', () => {
    it('should generate correct theme pack names', () => {
      const names = generateThemePackNames('清明节主题', 2026);

      expect(names.mk).toBe('主题-MK-2026清明');
      expect(names.v12).toBe('主题-V12-2026清明');
      expect(names.v13_v13_5).toBe('主题-V13〜V13.5-2026清明');
      expect(names.v14_v16).toBe('主题-V14〜V16-2026清明');
      expect(names.v17).toBe('主题-V17-2026清明');
      expect(names.login_mk).toBe('登录-MK-2026清明');
      expect(names.kk).toBe('KK-清明-2026');
    });

    it('should handle different years', () => {
      const names = generateThemePackNames('春节主题', 2025);

      expect(names.mk).toBe('主题-MK-2025春节');
      expect(names.v17).toBe('主题-V17-2025春节');
    });
  });
});
