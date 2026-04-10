import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImageProcessor } from '../../src/core/ImageProcessor';
import { ThemeType } from '../../src/types/ThemeType';

describe('ImageProcessor', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/images');
  const tempOutputDir = path.join(__dirname, '../temp');
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });

  describe('getImageSize', () => {
    it('should get correct dimensions for PNG image', async () => {
      const imagePath = path.join(fixturesDir, 'header-banner.png');
      const size = await imageProcessor.getImageSize(imagePath);
      
      expect(size).toEqual({ width: 10, height: 10 });
    });

    it('should get correct dimensions for JPG image', async () => {
      const imagePath = path.join(fixturesDir, 'login-bg.jpg');
      const size = await imageProcessor.getImageSize(imagePath);
      
      expect(size).toEqual({ width: 10, height: 10 });
    });

    it('should throw error for non-existent file', async () => {
      await expect(imageProcessor.getImageSize('non-existent.png')).rejects.toThrow();
    });
  });

  describe('resizeImage', () => {
    it('should resize PNG image to specified dimensions', async () => {
      const inputPath = path.join(fixturesDir, 'header-banner.png');
      const outputPath = path.join(tempOutputDir, 'resized.png');
      const targetSize = { width: 100, height: 50 };
      
      await imageProcessor.resizeImage(inputPath, outputPath, targetSize);
      
      expect(fs.existsSync(outputPath)).toBe(true);
      const newSize = await imageProcessor.getImageSize(outputPath);
      expect(newSize).toEqual(targetSize);
    });

    it('should resize JPG image to specified dimensions', async () => {
      const inputPath = path.join(fixturesDir, 'login-bg.jpg');
      const outputPath = path.join(tempOutputDir, 'resized.jpg');
      const targetSize = { width: 200, height: 100 };
      
      await imageProcessor.resizeImage(inputPath, outputPath, targetSize);
      
      expect(fs.existsSync(outputPath)).toBe(true);
      const newSize = await imageProcessor.getImageSize(outputPath);
      expect(newSize).toEqual(targetSize);
    });
  });

  describe('convertFormat', () => {
    it('should convert PNG to JPG', async () => {
      const inputPath = path.join(fixturesDir, 'header-banner.png');
      const outputPath = path.join(tempOutputDir, 'converted.jpg');
      
      await imageProcessor.convertFormat(inputPath, outputPath, 'jpg');
      
      expect(fs.existsSync(outputPath)).toBe(true);
      // Check if it's actually a JPG by reading first few bytes
      const buffer = fs.readFileSync(outputPath);
      expect(buffer[0]).toBe(0xFF);
      expect(buffer[1]).toBe(0xD8); // JPEG SOI marker
    });

    it('should convert JPG to PNG', async () => {
      const inputPath = path.join(fixturesDir, 'login-bg.jpg');
      const outputPath = path.join(tempOutputDir, 'converted.png');
      
      await imageProcessor.convertFormat(inputPath, outputPath, 'png');
      
      expect(fs.existsSync(outputPath)).toBe(true);
      // Check if it's actually a PNG by reading signature
      const buffer = fs.readFileSync(outputPath);
      const signature = buffer.subarray(0, 8);
      const expectedSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(signature).toEqual(expectedSignature);
    });
  });

  describe('processImages', () => {
    it('should process MK_GREEN theme images with correct mappings', async () => {
      const config = {
        headerBanner: path.join(fixturesDir, 'header-banner.png'),
        headerSimple: path.join(fixturesDir, 'header-simple.png')
      };
      
      const result = await imageProcessor.processImages(config, ThemeType.MK_GREEN, tempOutputDir);
      
      // Check that files were created in correct locations
      expect(fs.existsSync(path.join(tempOutputDir, 'static', 'main.png'))).toBe(true);
      expect(fs.existsSync(path.join(tempOutputDir, 'static', 'simple.png'))).toBe(true);
      expect(result.processedFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should process V17_SCSS theme images with correct mappings', async () => {
      const config = {
        headerBanner: path.join(fixturesDir, 'header-banner.png'),
        loginBg: path.join(fixturesDir, 'login-bg.jpg')
      };
      
      const result = await imageProcessor.processImages(config, ThemeType.V17_SCSS, tempOutputDir);
      
      // Check that files were created in correct locations
      expect(fs.existsSync(path.join(tempOutputDir, 'images', 'image-style', 'header_complex_frame_bg.png'))).toBe(true);
      expect(fs.existsSync(path.join(tempOutputDir, 'login_bg', 'bg-login.jpg'))).toBe(true);
      expect(result.processedFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should process LOGIN_PACKAGE theme images with correct mappings', async () => {
      const config = {
        loginBg: path.join(fixturesDir, 'login-bg.jpg')
      };
      
      const result = await imageProcessor.processImages(config, ThemeType.LOGIN_PACKAGE, tempOutputDir);
      
      // Check that files were created in correct locations
      expect(fs.existsSync(path.join(tempOutputDir, 'login_bg', 'bg-login.jpg'))).toBe(true);
      expect(result.processedFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing optional images gracefully', async () => {
      const config = {
        headerBanner: path.join(fixturesDir, 'header-banner.png')
        // Missing other optional images
      };
      
      const result = await imageProcessor.processImages(config, ThemeType.MK_GREEN, tempOutputDir);
      
      expect(fs.existsSync(path.join(tempOutputDir, 'static', 'main.png'))).toBe(true);
      expect(result.processedFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle processing errors gracefully and return error information', async () => {
      const config = {
        headerBanner: 'non-existent-file.png'
      };
      
      const result = await imageProcessor.processImages(config, ThemeType.MK_GREEN, tempOutputDir);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});