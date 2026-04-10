import { describe, it, expect } from 'vitest';
import { ColorSchemeGenerator } from '../../src/theme-automation/core/ColorSchemeGenerator.js';
import { ColorScheme } from '../../src/theme-automation/types/ColorScheme.js';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  lighten,
  darken,
  complement,
  analogous,
  withAlpha,
  calculateContrastRatio,
  isValidHex
} from '../../src/theme-automation/utils/colorUtils.js';

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex to RGB', () => {
      const result = hexToRgb('#FF0000');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert 3-digit hex to RGB', () => {
      const result = hexToRgb('#F00');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex without # prefix', () => {
      const result = hexToRgb('00FF00');
      expect(result).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#12')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
    });

    it('should clamp values to valid range', () => {
      expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
    });
  });

  describe('rgbToHsl', () => {
    it('should convert pure red to HSL', () => {
      const result = rgbToHsl({ r: 255, g: 0, b: 0 });
      expect(result.h).toBe(0);
      expect(result.s).toBe(100);
      expect(result.l).toBe(50);
    });

    it('should convert white to HSL', () => {
      const result = rgbToHsl({ r: 255, g: 255, b: 255 });
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.l).toBe(100);
    });

    it('should convert black to HSL', () => {
      const result = rgbToHsl({ r: 0, g: 0, b: 0 });
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.l).toBe(0);
    });
  });

  describe('hslToRgb', () => {
    it('should convert HSL back to RGB', () => {
      const rgb = { r: 255, g: 0, b: 0 };
      const hsl = rgbToHsl(rgb);
      const result = hslToRgb(hsl);
      expect(result.r).toBeCloseTo(255, 1);
      expect(result.g).toBeCloseTo(0, 1);
      expect(result.b).toBeCloseTo(0, 1);
    });
  });

  describe('lighten', () => {
    it('should lighten a color by specified percent', () => {
      const result = lighten('#800000', 20);
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.l).toBeGreaterThan(20);
    });

    it('should not exceed 100 lightness', () => {
      const result = lighten('#FFFFFF', 10);
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.l).toBe(100);
    });

    it('should return original color for invalid hex', () => {
      expect(lighten('invalid', 10)).toBe('invalid');
    });
  });

  describe('darken', () => {
    it('should darken a color by specified percent', () => {
      const result = darken('#FF0000', 20);
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.l).toBeLessThan(50);
    });

    it('should not go below 0 lightness', () => {
      const result = darken('#000000', 10);
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.l).toBe(0);
    });
  });

  describe('complement', () => {
    it('should return complementary color (180 degree hue shift)', () => {
      const redHsl = rgbToHsl({ r: 255, g: 0, b: 0 });
      const complementResult = complement('#FF0000');
      const rgb = hexToRgb(complementResult);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.h).toBe((redHsl.h + 180) % 360);
    });
  });

  describe('analogous', () => {
    it('should return analogous color with default 30 degree shift', () => {
      const result = analogous('#FF0000');
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.h).toBe(30);
    });

    it('should support custom angle', () => {
      const result = analogous('#FF0000', 60);
      const rgb = hexToRgb(result);
      const hsl = rgbToHsl(rgb!);
      expect(hsl.h).toBe(60);
    });
  });

  describe('withAlpha', () => {
    it('should convert hex to rgba with alpha', () => {
      expect(withAlpha('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(withAlpha('#00FF00', 0.1)).toBe('rgba(0, 255, 0, 0.1)');
    });

    it('should handle invalid hex', () => {
      expect(withAlpha('invalid', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    });
  });

  describe('calculateContrastRatio', () => {
    it('should calculate WCAG contrast ratio', () => {
      const ratio = calculateContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should return 1 for invalid colors', () => {
      expect(calculateContrastRatio('invalid', '#FFFFFF')).toBe(1);
    });
  });

  describe('isValidHex', () => {
    it('should validate 6-digit hex', () => {
      expect(isValidHex('#FF0000')).toBe(true);
      expect(isValidHex('FF0000')).toBe(true);
    });

    it('should validate 3-digit hex', () => {
      expect(isValidHex('#F00')).toBe(true);
      expect(isValidHex('F00')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidHex('#FF')).toBe(false);
      expect(isValidHex('invalid')).toBe(false);
      expect(isValidHex('#FFFFFFF')).toBe(false);
    });
  });
});

describe('ColorSchemeGenerator', () => {
  const generator = new ColorSchemeGenerator();

  describe('deriveColorScheme', () => {
    it('should derive complete color scheme from primary color', () => {
      const scheme = generator.deriveColorScheme('#2C615C');
      
      expect(scheme.primary).toBe('#2C615C');
      expect(scheme.primaryHover).toBeDefined();
      expect(scheme.secondary).toBeDefined();
      expect(scheme.third).toBeDefined();
      expect(scheme.primaryOpacity10).toBeDefined();
      expect(scheme.primaryOpacity20).toBeDefined();
      expect(scheme.primaryOpacity30).toBeDefined();
      expect(scheme.sidebarBg).toBeDefined();
      expect(scheme.linkText).toBe(scheme.primary);
      expect(scheme.linkTextHover).toBe(scheme.primaryHover);
      expect(scheme.contrastRatios).toBeDefined();
      expect(scheme.generatedAt).toBeDefined();
    });

    it('should create lighter hover color', () => {
      const scheme = generator.deriveColorScheme('#2C615C');
      const primaryRgb = hexToRgb(scheme.primary);
      const hoverRgb = hexToRgb(scheme.primaryHover!);
      
      const primaryHsl = rgbToHsl(primaryRgb!);
      const hoverHsl = rgbToHsl(hoverRgb!);
      
      expect(hoverHsl.l).toBeGreaterThan(primaryHsl.l);
    });

    it('should create complementary secondary color', () => {
      const scheme = generator.deriveColorScheme('#FF0000');
      const primaryHsl = rgbToHsl(hexToRgb(scheme.primary)!);
      const secondaryHsl = rgbToHsl(hexToRgb(scheme.secondary!)!);
      
      expect(secondaryHsl.h).toBe((primaryHsl.h + 180) % 360);
    });

    it('should create opacity variants', () => {
      const scheme = generator.deriveColorScheme('#FF0000');
      
      expect(scheme.primaryOpacity10).toBe('rgba(255, 0, 0, 0.1)');
      expect(scheme.primaryOpacity20).toBe('rgba(255, 0, 0, 0.2)');
      expect(scheme.primaryOpacity30).toBe('rgba(255, 0, 0, 0.3)');
    });

    it('should create very light sidebar background', () => {
      const scheme = generator.deriveColorScheme('#2C615C');
      const sidebarHsl = rgbToHsl(hexToRgb(scheme.sidebarBg!)!);
      
      expect(sidebarHsl.l).toBeGreaterThan(90);
    });

    it('should throw error for invalid primary color', () => {
      expect(() => generator.deriveColorScheme('invalid')).toThrow('Invalid hex color');
    });
  });

  describe('deriveDesktopAIColorScheme', () => {
    it('should generate valid rgba opacity values', () => {
      const scheme = generator.deriveDesktopAIColorScheme('#00AA00');

      expect(scheme['primary-color-opacity-10']).toBe('rgba(0, 170, 0, 0.1)');
      expect(scheme['primary-color-opacity-20']).toBe('rgba(0, 170, 0, 0.2)');
      expect(scheme['primary-color-opacity-30']).toBe('rgba(0, 170, 0, 0.3)');
    });
  });

  describe('generateFromKeywords', () => {
    it('should generate green color for Qingming keyword', async () => {
      const scheme = await generator.generateFromKeywords('清明节主题');
      
      expect(scheme.keywords).toContain('清明');
      expect(scheme.description).toBe('清明节主题');
      
      const hsl = rgbToHsl(hexToRgb(scheme.primary)!);
      expect(hsl.h).toBeGreaterThanOrEqual(90);
      expect(hsl.h).toBeLessThanOrEqual(150);
    });

    it('should generate red color for Spring Festival', async () => {
      const scheme = await generator.generateFromKeywords('春节喜庆主题');
      
      expect(scheme.keywords).toContain('春节');
      
      const hsl = rgbToHsl(hexToRgb(scheme.primary)!);
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(30);
    });

    it('should generate blue color for tech keywords', async () => {
      const scheme = await generator.generateFromKeywords('科技现代风格');
      
      expect(scheme.keywords).toContain('科技');
      
      const hsl = rgbToHsl(hexToRgb(scheme.primary)!);
      expect(hsl.h).toBeGreaterThanOrEqual(200);
      expect(hsl.h).toBeLessThanOrEqual(260);
    });

    it('should combine multiple keywords', async () => {
      const scheme = await generator.generateFromKeywords('清明节，科技能源风格');
      
      expect(scheme.keywords?.length).toBeGreaterThan(1);
      expect(scheme.keywords).toContain('清明');
      expect(scheme.keywords).toContain('科技');
      expect(scheme.keywords).toContain('能源');
    });

    it('should return default color for unknown keywords', async () => {
      const scheme = await generator.generateFromKeywords('未知主题');
      
      expect(scheme.keywords).toContain('default');
      expect(scheme.primary).toBe('#2C615C');
    });

    it('should include derived colors', async () => {
      const scheme = await generator.generateFromKeywords('清明节');
      
      expect(scheme.primaryHover).toBeDefined();
      expect(scheme.secondary).toBeDefined();
      expect(scheme.primaryOpacity10).toBeDefined();
      expect(scheme.contrastRatios).toBeDefined();
    });
  });

  describe('refineScheme', () => {
    it('should adjust primary color from feedback', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '主色改成 #FF0000');
      
      expect(refined.primary).toBe('#FF0000');
      expect(refined.primaryHover).not.toBe(original.primaryHover);
      expect(refined.feedbackHistory?.length).toBe(1);
    });

    it('should lighten color when feedback says too dark', () => {
      const original = generator.deriveColorScheme('#800000');
      const refined = generator.refineScheme(original, '主色太深');
      
      const originalHsl = rgbToHsl(hexToRgb(original.primary)!);
      const refinedHsl = rgbToHsl(hexToRgb(refined.primary)!);
      
      expect(refinedHsl.l).toBeGreaterThan(originalHsl.l);
    });

    it('should darken color when feedback says too bright', () => {
      const original = generator.deriveColorScheme('#FF8080');
      const refined = generator.refineScheme(original, '主色太亮');
      
      const originalHsl = rgbToHsl(hexToRgb(original.primary)!);
      const refinedHsl = rgbToHsl(hexToRgb(refined.primary)!);
      
      expect(refinedHsl.l).toBeLessThan(originalHsl.l);
    });

    it('should add secondary color from feedback', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '增加辅助色 #00FF00');
      
      expect(refined.secondary).toBe('#00FF00');
      expect(refined.primary).toBe(original.primary);
      expect(refined.feedbackHistory?.length).toBe(1);
    });

    it('should add third color from feedback', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '第三色改成 #0000FF');
      
      expect(refined.third).toBe('#0000FF');
      expect(refined.primary).toBe(original.primary);
    });

    it('should handle hex color in any feedback', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '改成 #ABC123');
      
      expect(refined.primary).toBe('#ABC123');
    });

    it('should preserve description and keywords', async () => {
      const original = await generator.generateFromKeywords('清明节');
      const refined = generator.refineScheme(original, '主色改成 #00FF00');
      
      expect(refined.description).toBe(original.description);
      expect(refined.keywords).toEqual(original.keywords);
    });

    it('should accumulate feedback history', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined1 = generator.refineScheme(original, '主色改成 #FF0000');
      const refined2 = generator.refineScheme(refined1, '主色太深');
      
      expect(refined2.feedbackHistory?.length).toBe(2);
    });

    it('should return original for unparseable feedback', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '完全无法理解的反馈');
      
      expect(refined).toEqual(original);
    });
  });

  describe('accessibility validation', () => {
    it('should include WCAG contrast ratios', () => {
      const scheme = generator.deriveColorScheme('#2C615C');
      
      expect(scheme.contrastRatios?.primaryOnWhite).toBeDefined();
      expect(scheme.contrastRatios?.primaryHoverOnWhite).toBeDefined();
      expect(scheme.contrastRatios?.linkTextOnWhite).toBeDefined();
    });

    it('should meet WCAG AA standard for normal text (4.5:1)', () => {
      const scheme = generator.deriveColorScheme('#2C615C');
      expect(scheme.contrastRatios?.primaryOnWhite).toBeGreaterThan(4.5);
    });

    it('should meet WCAG AA standard for large text (3:1)', () => {
      const darkScheme = generator.deriveColorScheme('#333333');
      expect(darkScheme.contrastRatios?.primaryOnWhite).toBeGreaterThan(3);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme lightening', () => {
      const scheme = generator.deriveColorScheme('#000000');
      const sidebarHsl = rgbToHsl(hexToRgb(scheme.sidebarBg!)!);
      expect(sidebarHsl.l).toBeLessThanOrEqual(100);
    });

    it('should handle pure colors', () => {
      const scheme = generator.deriveColorScheme('#FFFFFF');
      expect(scheme.primary).toBe('#FFFFFF');
      expect(isValidHex(scheme.primaryHover!)).toBe(true);
    });

    it('should handle 3-digit hex input', () => {
      const scheme = generator.deriveColorScheme('#F00');
      expect(scheme.primary).toBe('#F00');
      expect(scheme.primaryOpacity10).toContain('rgba(255');
    });

    it('should maintain color relationships after refinement', () => {
      const original = generator.deriveColorScheme('#2C615C');
      const refined = generator.refineScheme(original, '主色改成 #FF0000');
      
      const secondaryHsl = rgbToHsl(hexToRgb(refined.secondary!)!);
      const primaryHsl = rgbToHsl(hexToRgb(refined.primary)!);
      
      expect(Math.abs(secondaryHsl.h - ((primaryHsl.h + 180) % 360))).toBeLessThan(1);
    });
  });
});
