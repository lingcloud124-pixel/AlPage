import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ColorUpdater } from '../../src/core/ColorUpdater.js';
import { ColorConfig, UpdateResult } from '../../src/types/ConfigTypes.js';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('ColorUpdater', () => {
  const testDir = path.join(__dirname, '../fixtures/colors');
  const tempDir = path.join(__dirname, '../temp-color-updater');
  
  let originalMkIndex: string;
  let originalScssVars: string;
  let originalLoginCss: string;
  
  beforeEach(async () => {
    // Create temp directory
    await fs.ensureDir(tempDir);
    
    // Copy fixtures to temp directory for testing
    originalMkIndex = await fs.readFile(path.join(testDir, 'mk-index.js'), 'utf8');
    originalScssVars = await fs.readFile(path.join(testDir, 'scss-vars.scss'), 'utf8');
    originalLoginCss = await fs.readFile(path.join(testDir, 'login.css'), 'utf8');
    
    await fs.writeFile(path.join(tempDir, 'mk-index.js'), originalMkIndex);
    await fs.writeFile(path.join(tempDir, 'scss-vars.scss'), originalScssVars);
    await fs.writeFile(path.join(tempDir, 'login.css'), originalLoginCss);
  });
  
  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.remove(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const testConfig: ColorConfig = {
    primary: '#FF0000',
    primaryHover: '#CC0000',
    secondary: '#00FF00',
    third: '#0000FF',
    primaryOpacity10: 'rgba(255, 0, 0, 0.1)',
    primaryOpacity20: 'rgba(255, 0, 0, 0.2)',
    primaryOpacity30: 'rgba(255, 0, 0, 0.3)',
    sidebarBg: '#F0F0F0',
    sidebarPanelBg: '#FFFFFF',
    linkText: '#FF0000',
    linkTextHover: '#CC0000'
  };

  describe('calculateOpacityVariants', () => {
    it('should calculate opacity variants from hex color', () => {
      const colorUpdater = new ColorUpdater();
      const result = colorUpdater.calculateOpacityVariants('#FF0000');
      
      expect(result.primaryOpacity10).toBe('rgba(255, 0, 0, 0.1)');
      expect(result.primaryOpacity20).toBe('rgba(255, 0, 0, 0.2)');
      expect(result.primaryOpacity30).toBe('rgba(255, 0, 0, 0.3)');
    });

    it('should handle 3-digit hex colors', () => {
      const colorUpdater = new ColorUpdater();
      const result = colorUpdater.calculateOpacityVariants('#F00');
      
      expect(result.primaryOpacity10).toBe('rgba(255, 0, 0, 0.1)');
      expect(result.primaryOpacity20).toBe('rgba(255, 0, 0, 0.2)');
      expect(result.primaryOpacity30).toBe('rgba(255, 0, 0, 0.3)');
    });

    it('should handle invalid hex colors gracefully', () => {
      const colorUpdater = new ColorUpdater();
      const result = colorUpdater.calculateOpacityVariants('#invalid');
      
      expect(result.primaryOpacity10).toBeUndefined();
      expect(result.primaryOpacity20).toBeUndefined();
      expect(result.primaryOpacity30).toBeUndefined();
    });
  });

  describe('updateMKIndexJs', () => {
    it('should update themeColor variable in MK index.js', async () => {
      const filePath = path.join(tempDir, 'mk-index.js');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateMKIndexJs(filePath, testConfig);
      
      expect(result.updatedFiles).toContain(filePath);
      expect(result.errors).toHaveLength(0);
      
      const updatedContent = await fs.readFile(filePath, 'utf8');
      expect(updatedContent).toContain('themeColor:"#FF0000"');
      expect(updatedContent).toContain('sidebarBg:"#F0F0F0"');
      expect(updatedContent).toContain('linkTextColor:"#FF0000"');
    });

    it('should handle file not found error', async () => {
      const filePath = path.join(tempDir, 'non-existent.js');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateMKIndexJs(filePath, testConfig);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('ENOENT');
      expect(result.updatedFiles).toHaveLength(0);
    });
  });

  describe('updateScssVars', () => {
    it('should update SCSS variables', async () => {
      const filePath = path.join(tempDir, 'scss-vars.scss');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateScssVars(filePath, testConfig);
      
      expect(result.updatedFiles).toContain(filePath);
      expect(result.errors).toHaveLength(0);
      
      const updatedContent = await fs.readFile(filePath, 'utf8');
      expect(updatedContent).toContain('$primary-color: #FF0000;');
      expect(updatedContent).toContain('$primary-color-hover: #CC0000;');
      expect(updatedContent).toContain('$secondary-color: #00FF00;');
      expect(updatedContent).toContain('$third-color: #0000FF;');
      expect(updatedContent).toContain('$sidebar-panel-bg: #FFFFFF;');
      expect(updatedContent).toContain('$link-text-color: #FF0000;');
      expect(updatedContent).toContain('$link-text-hover-color: #CC0000;');
    });

    it('should handle file not found error', async () => {
      const filePath = path.join(tempDir, 'non-existent.scss');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateScssVars(filePath, testConfig);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('ENOENT');
      expect(result.updatedFiles).toHaveLength(0);
    });
  });

  describe('updateCssHardcoded', () => {
    it('should update hardcoded CSS colors', async () => {
      const filePath = path.join(tempDir, 'login.css');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateCssHardcoded(filePath, testConfig);
      
      expect(result.updatedFiles).toContain(filePath);
      expect(result.errors).toHaveLength(0);
      
      const updatedContent = await fs.readFile(filePath, 'utf8');
      expect(updatedContent).toContain('background: #FF0000;');
      expect(updatedContent).toContain('border: 2px solid #FF0000;');
      expect(updatedContent).toContain('background-color: #FF0000;');
      expect(updatedContent).toContain('background-color: #CC0000;');
      expect(updatedContent).toContain('color: #FF0000;');
      expect(updatedContent).toContain('color: #CC0000;');
    });

    it('should handle file not found error', async () => {
      const filePath = path.join(tempDir, 'non-existent.css');
      const colorUpdater = new ColorUpdater();
      
      const result = await colorUpdater.updateCssHardcoded(filePath, testConfig);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('ENOENT');
      expect(result.updatedFiles).toHaveLength(0);
    });
  });
});
