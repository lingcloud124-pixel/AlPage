import { beforeAll, describe, it, expect } from 'vitest';
import { ThemeType, ThemeDetectionResult } from '../../src/types/ThemeType';
import { detectThemeType } from '../../src/core/ThemeDetector';
import { ensureLegacyZipFixtures } from '../helpers/fixtureZips';

describe('ThemeDetector', () => {
  beforeAll(async () => {
    await ensureLegacyZipFixtures();
  });

  describe('detectThemeType', () => {
    it('should detect MK_GREEN theme from meta.json with project mkworks', async () => {
      const result = await detectThemeType('tests/fixtures/zips/mk-green-test.zip');
      
      expect(result.type).toBe(ThemeType.MK_GREEN);
      expect(result.hasScssSource).toBe(false);
      expect(result.structure.rootFiles).toContain('meta.json');
      expect(result.structure.directories).toContain('static');
    }, 10000);

    it('should detect V12_SCSS theme from scss/lib/vars.scss', async () => {
      const result = await detectThemeType('tests/fixtures/zips/v12-scss-test.zip');
      
      expect(result.type).toBe(ThemeType.V12_SCSS);
      expect(result.hasScssSource).toBe(true);
      expect(result.structure.directories).toContain('scss');
      expect(result.structure.keyFiles).toContain('scss/lib/vars.scss');
    }, 10000);

    it('should detect V17 SCSS theme when no legacy V12 asset pattern exists', async () => {
      const result = await detectThemeType('tests/fixtures/zips/v17-scss-test.zip');
      
      expect(result.type).toBe(ThemeType.V17_SCSS);
      expect(result.hasScssSource).toBe(true);
      expect(result.structure.directories).toContain('scss');
      expect(result.structure.keyFiles).toContain('scss/lib/vars.scss');
    }, 10000);

    it('should detect LOGIN_PACKAGE theme from login.jsp + login directory', async () => {
      const result = await detectThemeType('tests/fixtures/zips/login-v12-test.zip');
      
      expect(result.type).toBe(ThemeType.LOGIN_PACKAGE);
      expect(result.hasScssSource).toBe(false);
      expect(result.structure.rootFiles).toContain('login.jsp');
      expect(result.structure.directories).toContain('login_26_festival_qingming');
    }, 10000);

    it('should detect KK_PACKAGE theme from android_theme/ + ios_theme/', async () => {
      const result = await detectThemeType('tests/fixtures/zips/kk-test.zip');
      
      expect(result.type).toBe(ThemeType.KK_PACKAGE);
      expect(result.hasScssSource).toBe(false);
      expect(result.structure.directories).toContain('android_theme');
      expect(result.structure.directories).toContain('ios_theme');
    }, 10000);

    it('should handle non-existent file gracefully', async () => {
      await expect(detectThemeType('non-existent-file.zip')).rejects.toThrow();
    }, 10000);

    it('should handle invalid zip file gracefully', async () => {
      await expect(detectThemeType('package.json')).rejects.toThrow();
    }, 10000);

    it('should extract detailed structure information', async () => {
      const result = await detectThemeType('tests/fixtures/zips/mk-green-test.zip');
      
      expect(result.structure).toBeDefined();
      expect(Array.isArray(result.structure.rootFiles)).toBe(true);
      expect(Array.isArray(result.structure.directories)).toBe(true);
      expect(Array.isArray(result.structure.keyFiles)).toBe(true);
      expect(result.structure.rootFiles.length).toBeGreaterThan(0);
      expect(result.structure.directories.length).toBeGreaterThan(0);
    }, 10000);
  });
});
