import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScssCompiler } from '../../src/core/ScssCompiler';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('ScssCompiler', () => {
  let compiler: ScssCompiler;
  let tempDir: string;
  let inputDir: string;
  let outputDir: string;

  beforeEach(() => {
    compiler = new ScssCompiler();
    tempDir = join(process.cwd(), 'temp', 'scss-test');
    inputDir = join(tempDir, 'scss');
    outputDir = join(tempDir, 'css');
    mkdirSync(inputDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('compileFile', () => {
    it('should compile a single SCSS file to CSS with expanded style', async () => {
      const scssContent = `
        $color: #3498db;
        .test {
          color: $color;
        }
      `;

      const scssPath = join(inputDir, 'test.scss');
      const cssPath = join(outputDir, 'test.css');

      require('fs').writeFileSync(scssPath, scssContent);

      const result = await compiler.compileFile(scssPath, cssPath);

      expect(result).toBe(true);
      expect(existsSync(cssPath)).toBe(true);

      const cssContent = readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('.test');
      expect(cssContent).toContain('color: #3498db');
      expect(cssContent).not.toContain('/*# sourceMappingURL=');
    });

    it('should compile a single SCSS file to CSS with compressed style', async () => {
      const scssContent = `
        $color: #3498db;
        .test {
          color: $color;
        }
      `;

      const scssPath = join(inputDir, 'test.scss');
      const cssPath = join(outputDir, 'test.css');

      require('fs').writeFileSync(scssPath, scssContent);

      const result = await compiler.compileFile(scssPath, cssPath, 'compressed');

      expect(result).toBe(true);
      expect(existsSync(cssPath)).toBe(true);

      const cssContent = readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('.test');
      expect(cssContent.split('\n').length).toBeLessThan(3);
    });

    it('should return false when SCSS file does not exist', async () => {
      const scssPath = join(inputDir, 'nonexistent.scss');
      const cssPath = join(outputDir, 'test.css');

      const result = await compiler.compileFile(scssPath, cssPath);

      expect(result).toBe(false);
      expect(existsSync(cssPath)).toBe(false);
    });

    it('should return false when SCSS has syntax errors', async () => {
      const scssContent = `
        .test {
          color: #3498db
        // Missing closing brace
      `;

      const scssPath = join(inputDir, 'invalid.scss');
      const cssPath = join(outputDir, 'invalid.css');

      require('fs').writeFileSync(scssPath, scssContent);

      const result = await compiler.compileFile(scssPath, cssPath);

      expect(result).toBe(false);
      expect(existsSync(cssPath)).toBe(false);
    });

    it('should handle @import statements correctly', async () => {
      const partialContent = `
        $primary-color: #3498db;
      `;

      const mainContent = `
        @import '_partial';
        .test {
          color: $primary-color;
        }
      `;

      const partialPath = join(inputDir, '_partial.scss');
      const mainPath = join(inputDir, 'main.scss');
      const cssPath = join(outputDir, 'main.css');

      require('fs').writeFileSync(partialPath, partialContent);
      require('fs').writeFileSync(mainPath, mainContent);

      const result = await compiler.compileFile(mainPath, cssPath);

      expect(result).toBe(true);
      expect(existsSync(cssPath)).toBe(true);

      const cssContent = readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('color: #3498db');
    });
  });

  describe('compile', () => {
    it('should compile all SCSS files in a directory', async () => {
      const scssFile1 = `
        .test1 { color: #3498db; }
      `;
      const scssFile2 = `
        .test2 { background: #2ecc71; }
      `;

      require('fs').writeFileSync(join(inputDir, 'file1.scss'), scssFile1);
      require('fs').writeFileSync(join(inputDir, 'file2.scss'), scssFile2);

      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(true);
      expect(result.compiledFiles).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(existsSync(join(outputDir, 'file1.css'))).toBe(true);
      expect(existsSync(join(outputDir, 'file2.css'))).toBe(true);
    });

    it('should skip partial files starting with underscore', async () => {
      const partialContent = `
        $color: #3498db;
      `;
      const mainContent = `
        @import '_partial';
        .test { color: $color; }
      `;

      require('fs').writeFileSync(join(inputDir, '_partial.scss'), partialContent);
      require('fs').writeFileSync(join(inputDir, 'main.scss'), mainContent);

      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(true);
      expect(result.compiledFiles).toHaveLength(1);
      expect(result.compiledFiles[0]).toContain('main.css');
      expect(existsSync(join(outputDir, '_partial.css'))).toBe(false);
    });

    it('should handle compilation errors gracefully', async () => {
      const validContent = `.valid { color: #3498db; }`;
      const invalidContent = `.invalid { color: #3498db`; // Missing closing brace

      require('fs').writeFileSync(join(inputDir, 'valid.scss'), validContent);
      require('fs').writeFileSync(join(inputDir, 'invalid.scss'), invalidContent);

      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.compiledFiles).toHaveLength(1);
    });

    it('should return success with empty arrays when no SCSS files found', async () => {
      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(true);
      expect(result.compiledFiles).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should create output directory if it does not exist', async () => {
      const newOutputDir = join(tempDir, 'new-css');
      const scssContent = `.test { color: #3498db; }`;

      require('fs').writeFileSync(join(inputDir, 'test.scss'), scssContent);

      expect(existsSync(newOutputDir)).toBe(false);

      const result = await compiler.compile({
        inputDir,
        outputDir: newOutputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(true);
      expect(existsSync(newOutputDir)).toBe(true);
      expect(existsSync(join(newOutputDir, 'test.css'))).toBe(true);
    });

    it('should support compressed output style', async () => {
      const scssContent = `
        .test {
          color: #3498db;
          padding: 10px;
        }
      `;

      require('fs').writeFileSync(join(inputDir, 'test.scss'), scssContent);

      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'compressed'
      });

      expect(result.success).toBe(true);

      const cssContent = readFileSync(join(outputDir, 'test.css'), 'utf-8');
      expect(cssContent.split('\n').filter(l => l.trim()).length).toBeLessThan(2);
    });

    it('should handle nested SCSS directories', async () => {
      const nestedDir = join(inputDir, 'nested');
      mkdirSync(nestedDir, { recursive: true });

      const scssContent = `.test { color: #3498db; }`;
      require('fs').writeFileSync(join(nestedDir, 'nested.scss'), scssContent);

      const result = await compiler.compile({
        inputDir,
        outputDir,
        style: 'expanded'
      });

      expect(result.success).toBe(true);
      expect(result.compiledFiles.length).toBeGreaterThan(0);
    });
  });
});