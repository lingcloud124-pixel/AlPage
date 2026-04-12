import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ThemeUpdater } from '../../src/core/ThemeUpdater.js';
import { ManifestConfig } from '../../src/types/ManifestTypes.js';
import { ensureLegacyZipFixtures } from '../helpers/fixtureZips';

describe('ThemeUpdater Integration Tests', () => {
  const testOutputDir = 'tests/output';
  const testManifestPath = 'tests/test-manifest.json';

  beforeAll(async () => {
    await ensureLegacyZipFixtures();
  });
  
  beforeEach(async () => {
    if (fs.existsSync(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
    
    const testManifest: ManifestConfig = {
      version: '1.0',
      globalColors: {
        primary: '#C41E3A',
        primaryHover: '#E63946',
        secondary: '#D4AF37',
        third: '#8B0000',
        primaryOpacity10: 'rgba(196, 30, 58, 0.1)',
        primaryOpacity20: 'rgba(196, 30, 58, 0.2)',
        primaryOpacity30: 'rgba(196, 30, 58, 0.3)',
        sidebarBg: '#FEF0F0',
        sidebarPanelBg: '#FFEDDE',
        linkText: '#C41E3A',
        linkTextHover: '#E63946'
      },
      sourceImages: {
        templateType: 'light-ui',
        penFile: 'designs/Light-UI-模板.pen',
        headerBanner: 'tests/fixtures/images/header-banner.png',
        headerSimple: 'tests/fixtures/images/header-simple.png',
        loginBg: 'tests/fixtures/images/login-bg.jpg'
      },
      themes: [
        {
          name: 'mk-green-test',
          zip: 'fixtures/zips/mk-green-test.zip',
          enabled: true
        },
        {
          name: 'v12-scss-test',
          zip: 'fixtures/zips/v12-scss-test.zip',
          enabled: true,
          scssCompile: true
        },
        {
          name: 'login-v12-test',
          zip: 'fixtures/zips/login-v12-test.zip',
          enabled: true
        }
      ],
      outputDir: testOutputDir,
      options: {
        preserveOriginal: true,
        generateHighRes: false,
        verbose: false
      }
    };
    
    await fs.writeJson(testManifestPath, testManifest);
  });
  
  afterEach(async () => {
    if (fs.existsSync(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
    if (fs.existsSync(testManifestPath)) {
      await fs.remove(testManifestPath);
    }
  });

  describe('processTheme', () => {
    it('should process MK_GREEN theme successfully', async () => {
      const themeUpdater = new ThemeUpdater();
      const result = await themeUpdater.processTheme(
        'tests/fixtures/zips/mk-green-test.zip',
        JSON.parse(await fs.readFile(testManifestPath, 'utf8')),
        testOutputDir
      );
      
      expect(result.success).toBe(true);
      expect(result.themeName).toBe('mk-green-test');
      expect(result.errors).toHaveLength(0);
      expect(result.updatedFiles.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      
      const outputZipPath = path.join(testOutputDir, 'mk-green-test-新版.zip');
      expect(fs.existsSync(outputZipPath)).toBe(true);
    }, 30000);

    it('should process V12_SCSS theme with compilation', async () => {
      const themeUpdater = new ThemeUpdater();
      const manifest = JSON.parse(await fs.readFile(testManifestPath, 'utf8'));
      const result = await themeUpdater.processTheme(
        'tests/fixtures/zips/v12-scss-test.zip',
        manifest,
        testOutputDir
      );
      
      expect(result.success).toBe(true);
      expect(result.themeName).toBe('v12-scss-test');
      expect(result.errors).toHaveLength(0);
      expect(result.updatedFiles.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      
      const outputZipPath = path.join(testOutputDir, 'v12-scss-test-新版.zip');
      expect(fs.existsSync(outputZipPath)).toBe(true);
    }, 30000);

    it('should process LOGIN_PACKAGE theme', async () => {
      const themeUpdater = new ThemeUpdater();
      const manifest = JSON.parse(await fs.readFile(testManifestPath, 'utf8'));
      const result = await themeUpdater.processTheme(
        'tests/fixtures/zips/login-v12-test.zip',
        manifest,
        testOutputDir
      );
      
      expect(result.success).toBe(true);
      expect(result.themeName).toBe('login-v12-test');
      expect(result.errors).toHaveLength(0);
      expect(result.updatedFiles.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      
      const outputZipPath = path.join(testOutputDir, 'login-v12-test-新版.zip');
      expect(fs.existsSync(outputZipPath)).toBe(true);
    }, 30000);

    it('should handle non-existent zip file gracefully', async () => {
      const themeUpdater = new ThemeUpdater();
      const manifest = JSON.parse(await fs.readFile(testManifestPath, 'utf8'));
      const result = await themeUpdater.processTheme(
        'non-existent.zip',
        manifest,
        testOutputDir
      );
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    }, 10000);
  });

  describe('processAll', () => {
    it('should process all enabled themes from manifest', async () => {
      const themeUpdater = new ThemeUpdater();
      const report = await themeUpdater.processAll(testManifestPath);
      
      expect(report.total).toBe(3);
      expect(report.successful).toBe(3);
      expect(report.failed).toBe(0);
      expect(report.results).toHaveLength(3);
      
      for (const result of report.results) {
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.duration).toBeGreaterThan(0);
        
        const outputZipPath = path.join(testOutputDir, `${result.themeName}-新版.zip`);
        expect(fs.existsSync(outputZipPath)).toBe(true);
      }
      
      const outputFiles = fs.readdirSync(testOutputDir);
      expect(outputFiles).toContain('mk-green-test-新版.zip');
      expect(outputFiles).toContain('v12-scss-test-新版.zip');
      expect(outputFiles).toContain('login-v12-test-新版.zip');
    }, 60000);

    it('should handle manifest processing error gracefully', async () => {
      const invalidManifestPath = 'tests/invalid-manifest.json';
      await fs.writeFile(invalidManifestPath, 'invalid json');
      
      try {
        const themeUpdater = new ThemeUpdater();
        const report = await themeUpdater.processAll(invalidManifestPath);
        
        expect(report.total).toBe(0);
        expect(report.successful).toBe(0);
        expect(report.failed).toBe(1);
        expect(report.results).toHaveLength(1);
        expect(report.results[0].themeName).toBe('MANIFEST_PROCESSING_ERROR');
        expect(report.results[0].success).toBe(false);
      } finally {
        if (fs.existsSync(invalidManifestPath)) {
          await fs.remove(invalidManifestPath);
        }
      }
    }, 10000);

    it('should skip disabled themes in manifest', async () => {
      const partialManifestPath = 'tests/partial-manifest.json';
      const partialManifest: ManifestConfig = {
        version: '1.0',
        globalColors: {
          primary: '#C41E3A'
        },
        sourceImages: {
          templateType: 'light-ui',
          penFile: 'designs/Light-UI-模板.pen',
          headerBanner: 'tests/fixtures/images/header-banner.png'
        },
        themes: [
          {
            name: 'mk-green-test',
            zip: 'fixtures/zips/mk-green-test.zip',
            enabled: true
          },
          {
            name: 'v12-scss-test',
            zip: 'fixtures/zips/v12-scss-test.zip',
            enabled: false
          }
        ],
        outputDir: testOutputDir
      };
      
      await fs.writeJson(partialManifestPath, partialManifest);
      
      try {
        const themeUpdater = new ThemeUpdater();
        const report = await themeUpdater.processAll(partialManifestPath);
        
        expect(report.total).toBe(1);
        expect(report.successful).toBe(1);
        expect(report.failed).toBe(0);
        expect(report.results).toHaveLength(1);
        expect(report.results[0].themeName).toBe('mk-green-test');
        
        const outputFiles = fs.readdirSync(testOutputDir);
        expect(outputFiles).toContain('mk-green-test-新版.zip');
        expect(outputFiles).not.toContain('v12-scss-test-新版.zip');
      } finally {
        if (fs.existsSync(partialManifestPath)) {
          await fs.remove(partialManifestPath);
        }
      }
    }, 30000);

    it('should archive previous output and allow repeated runs', async () => {
      const themeUpdater = new ThemeUpdater();

      const firstReport = await themeUpdater.processAll(testManifestPath);
      expect(firstReport.successful).toBe(3);
      expect(firstReport.failed).toBe(0);

      const secondReport = await themeUpdater.processAll(testManifestPath);
      expect(secondReport.successful).toBe(3);
      expect(secondReport.failed).toBe(0);

      const thirdReport = await themeUpdater.processAll(testManifestPath);
      expect(thirdReport.successful).toBe(3);
      expect(thirdReport.failed).toBe(0);

      const dateDir = new Date().toISOString().split('T')[0];
      const historyDir = path.join(testOutputDir, 'history', dateDir);
      const historyFiles = fs.readdirSync(historyDir);
      expect(historyFiles.length).toBeGreaterThanOrEqual(3);

      const latestFiles = fs.readdirSync(testOutputDir);
      expect(latestFiles).toContain('mk-green-test-新版.zip');
      expect(latestFiles).toContain('v12-scss-test-新版.zip');
      expect(latestFiles).toContain('login-v12-test-新版.zip');
    }, 60000);
  });
});
