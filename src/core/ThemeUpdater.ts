import fs from 'fs-extra';
import * as fsSync from 'fs';
import { readFile } from 'node:fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { detectThemeType, detectThemeTypeFromDir } from './ThemeDetector.js';
import { ColorUpdater } from './ColorUpdater.js';
import { ImageProcessor } from './ImageProcessor.js';
import { ScssCompiler, ScssCompileOptions } from './ScssCompiler.js';
import { MetadataUpdater } from './MetadataUpdater.js';
import { ManifestConfig, ProcessResult, Report } from '../types/ManifestTypes.js';
import { ColorConfig } from '../types/ConfigTypes.js';
import { ThemeType, TemplateType } from '../types/ThemeType.js';

export class ThemeUpdater {
  private colorUpdater: ColorUpdater;
  private imageProcessor: ImageProcessor;
  private scssCompiler: ScssCompiler;
  private metadataUpdater: MetadataUpdater;

  constructor() {
    this.colorUpdater = new ColorUpdater();
    this.imageProcessor = new ImageProcessor();
    this.scssCompiler = new ScssCompiler();
    this.metadataUpdater = new MetadataUpdater();
  }

  /**
   * Process a single theme zip file with the given configuration
   * @param zipPath - Path to the theme zip file
   * @param config - Global configuration including colors and images
   * @param outputDir - Output directory for the processed theme
   * @returns ProcessResult with details of the processing
   */
  async processTheme(
    zipPath: string,
    config: ManifestConfig,
    outputDir: string
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    const themeName = path.basename(zipPath, '.zip');
    const result: ProcessResult = {
      themeName,
      success: false,
      updatedFiles: [],
      errors: [],
      duration: 0
    };

    const tempDir = path.join(tmpdir(), `theme-updater-${uuidv4()}`);
    
    try {
      await fs.ensureDir(outputDir);

      if (!await fs.pathExists(zipPath)) {
        throw new Error(`Theme file not found: ${zipPath}`);
      }

      const isDirectory = fsSync.statSync(zipPath).isDirectory();
      
      let themeType: ThemeType;
      let templateType: TemplateType;
      let hasScssSource: boolean;

      if (isDirectory) {
        await fs.copy(zipPath, tempDir);
        const structureResult = await detectThemeTypeFromDir(tempDir);
        themeType = structureResult.type;
        templateType = structureResult.templateType || TemplateType.LIGHT_UI;
        hasScssSource = structureResult.hasScssSource;
      } else {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);
        const detectionResult = await detectThemeType(zipPath);
        themeType = detectionResult.type;
        templateType = detectionResult.templateType || TemplateType.LIGHT_UI;
        hasScssSource = detectionResult.hasScssSource;
      }

      let subDir = this.findFirstSubDir(tempDir);
      let baseDir = subDir ? path.join(tempDir, subDir) : tempDir;
      
      // For LOGIN_PACKAGE, findFirstSubDir may return null because login packages
      // don't have scss/, style/, index.js, or style.css in subdirectories.
      // If baseDir equals tempDir (no subdir found), check if there's exactly one
      // subdirectory that should be the baseDir.
      if (themeType === ThemeType.LOGIN_PACKAGE && baseDir === tempDir) {
        const items = fsSync.readdirSync(tempDir);
        const subDirs = items.filter(item => {
          const fullPath = path.join(tempDir, item);
          return fsSync.statSync(fullPath).isDirectory() && !item.startsWith('.');
        });
        // If exactly one subdirectory, use it as baseDir
        if (subDirs.length === 1) {
          subDir = subDirs[0];
          baseDir = path.join(tempDir, subDir);
        }
      }

      const colorUpdateResult = await this.updateColorsByType(baseDir, themeType, config.globalColors);
      result.updatedFiles.push(...colorUpdateResult.updatedFiles);
      result.errors.push(...colorUpdateResult.errors);

      const imageUpdateResult = await this.imageProcessor.processImages(
        config.sourceImages, 
        themeType, 
        baseDir,
        templateType
      );
      result.updatedFiles.push(...imageUpdateResult.processedFiles);
      if (!imageUpdateResult.success) {
        result.errors.push(...imageUpdateResult.errors);
      }

      const themeConfig = config.themes.find(t => t.zip === zipPath || t.name === themeName);
      const shouldCompileScss = themeConfig?.scssCompile || hasScssSource;
      
      if (shouldCompileScss) {
        const scssCompileOptions: ScssCompileOptions = {
          inputDir: baseDir,
          outputDir: baseDir,
          style: 'expanded',
          sourceMap: false
        };
        
        const scssResult = await this.scssCompiler.compile(scssCompileOptions);
        result.updatedFiles.push(...scssResult.compiledFiles);
        if (!scssResult.success) {
          result.errors.push(...scssResult.errors);
        }
      }

      const manifestTheme = config.themes?.find(t => 
              t.zip === zipPath || 
              t.name === themeName ||
              path.basename(t.zip) === path.basename(zipPath)
            );
            const outputThemeName = manifestTheme?.name || themeName;
            const outputZipPath = path.join(outputDir, `${outputThemeName}-新版.zip`);
      const outputZip = new AdmZip();
      
      const addFilesToZip = (dir: string, zipPathPrefix = '') => {
        const items = fsSync.readdirSync(dir);
        for (const item of items) {
          if (item === '.DS_Store') continue;
          const fullPath = path.join(dir, item);
          const zipEntryPath = zipPathPrefix ? `${zipPathPrefix}/${item}` : item;
          
          if (fsSync.statSync(fullPath).isDirectory()) {
            addFilesToZip(fullPath, zipEntryPath);
          } else {
            const fileContent = fsSync.readFileSync(fullPath);
            outputZip.addFile(zipEntryPath, fileContent);
          }
        }
      };
      
      addFilesToZip(tempDir);
      outputZip.writeZip(outputZipPath);

      // Update metadata in the generated zip
      const metadataResult = await this.metadataUpdater.updateMetadata(
        outputZipPath,
        outputThemeName,
        manifestTheme?.name || themeName,
        manifestTheme?.name || themeName
      );
      result.updatedFiles.push(...metadataResult.updatedFiles);
      result.updatedFiles.push(...metadataResult.renamedFiles);
      if (!metadataResult.success) {
        result.errors.push(...metadataResult.errors);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
    } finally {
      try {
        if (fsSync.existsSync(tempDir)) {
          await fs.remove(tempDir);
        }
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp directory ${tempDir}: ${(cleanupError as Error).message}`);
      }
      
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async archiveExistingOutput(outputDir: string): Promise<void> {
    await fs.ensureDir(outputDir);

    const historyDateDir = path.join(outputDir, 'history', new Date().toISOString().split('T')[0]);
    const existingItems = await fs.readdir(outputDir);

    for (const item of existingItems) {
      if (item === 'history') continue;
      const srcPath = path.join(outputDir, item);
      await fs.ensureDir(historyDateDir);
      await fs.move(srcPath, path.join(historyDateDir, item), { overwrite: true });
    }
  }

  /**
   * Process all themes defined in the manifest file
   * @param manifestPath - Path to the manifest.json file
   * @returns Report with summary of all processing results
   */
  async processAll(manifestPath: string): Promise<Report> {
    const report: Report = {
      total: 0,
      successful: 0,
      failed: 0,
      results: []
    };

    try {
      if (!fsSync.existsSync(manifestPath)) {
        throw new Error(`Manifest file not found: ${manifestPath}`);
      }
      
      const manifestContent = await readFile(manifestPath, 'utf8');
      const manifest: ManifestConfig = JSON.parse(manifestContent);
      
      const enabledThemes = manifest.themes.filter(theme => theme.enabled);
      report.total = enabledThemes.length;

      const configuredOutputDir = manifest.outputDir || 'output';
      const zipOutputDir = path.isAbsolute(configuredOutputDir)
        ? configuredOutputDir
        : path.dirname(configuredOutputDir) === '.'
          ? path.join(path.dirname(manifestPath), configuredOutputDir)
          : configuredOutputDir;

      await this.archiveExistingOutput(zipOutputDir);
      await fs.ensureDir(zipOutputDir);

      const concurrency = Math.min(5, enabledThemes.length);
      const results: ProcessResult[] = [];
      
      for (let i = 0; i < enabledThemes.length; i += concurrency) {
        const batch = enabledThemes.slice(i, i + concurrency);
        const batchPromises = batch.map(async (theme) => {
          const zipPath = path.isAbsolute(theme.zip) 
            ? theme.zip 
            : path.join(path.dirname(manifestPath), theme.zip);
            
          return this.processTheme(zipPath, manifest, zipOutputDir);
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      report.results = results;
      report.successful = results.filter(r => r.success).length;
      report.failed = results.filter(r => !r.success).length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.results.push({
        themeName: 'MANIFEST_PROCESSING_ERROR',
        success: false,
        updatedFiles: [],
        errors: [errorMessage],
        duration: 0
      });
      report.failed = 1;
    }

    return report;
  }

  private findFirstSubDir(dir: string): string | null {
    const items = fsSync.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fsSync.statSync(fullPath).isDirectory()) {
        // Only return a subdirectory if it directly contains scss/ or style/ folders
        // This distinguishes actual theme content directories from metadata folders like "design-xml"
        // or partial content folders like "images/" which doesn't have scss/style at root level
        const subItems = fsSync.readdirSync(fullPath);
        const hasDirectThemeContent = subItems.some(subItem => 
          subItem === 'scss' || subItem === 'style'
        );
        const hasMkStyleContent = subItems.some(subItem => 
          subItem === 'index.js' || subItem === 'style.css'
        );
        if (hasDirectThemeContent || hasMkStyleContent) {
          return item;
        }
      }
    }
    return null;
  }

  private async updateColorsByType(
    extractDir: string, 
    themeType: ThemeType, 
    colorConfig: ColorConfig
  ): Promise<{ updatedFiles: string[]; errors: string[] }> {
    const result = { updatedFiles: [] as string[], errors: [] as string[] };
    
    try {
      switch (themeType) {
        case ThemeType.MK_GREEN:
          const mkIndexJsPath = path.join(extractDir, 'index.js');
          if (fsSync.existsSync(mkIndexJsPath)) {
            const mkResult = await this.colorUpdater.updateMKIndexJs(mkIndexJsPath, colorConfig);
            result.updatedFiles.push(...mkResult.updatedFiles);
            result.errors.push(...mkResult.errors);
          }
          const mkStyleCssPath = path.join(extractDir, 'style.css');
          if (fsSync.existsSync(mkStyleCssPath)) {
            const mkCssResult = await this.colorUpdater.updateCssHardcoded(mkStyleCssPath, colorConfig);
            result.updatedFiles.push(...mkCssResult.updatedFiles);
            result.errors.push(...mkCssResult.errors);
          }
          const mkSimpleCssPath = path.join(extractDir, 'simple.css');
          if (fsSync.existsSync(mkSimpleCssPath)) {
            const mkSimpleResult = await this.colorUpdater.updateCssHardcoded(mkSimpleCssPath, colorConfig);
            result.updatedFiles.push(...mkSimpleResult.updatedFiles);
            result.errors.push(...mkSimpleResult.errors);
          }
          break;
          
        case ThemeType.V12_SCSS:
        case ThemeType.V13_SCSS:
        case ThemeType.V14_V16_SCSS:
        case ThemeType.V17_SCSS:
          const scssVarsPath = path.join(extractDir, 'scss', 'lib', 'vars.scss');
          if (fsSync.existsSync(scssVarsPath)) {
            const scssResult = await this.colorUpdater.updateScssVars(scssVarsPath, colorConfig);
            result.updatedFiles.push(...scssResult.updatedFiles);
            result.errors.push(...scssResult.errors);
          }
          const scssStyleDir = path.join(extractDir, 'style');
          if (fsSync.existsSync(scssStyleDir)) {
            const scssCssFiles = fsSync.readdirSync(scssStyleDir)
              .filter(file => file.endsWith('.css'))
              .map(file => path.join(scssStyleDir, file));
            for (const cssFile of scssCssFiles) {
              const cssResult = await this.colorUpdater.updateCssHardcoded(cssFile, colorConfig);
              result.updatedFiles.push(...cssResult.updatedFiles);
              result.errors.push(...cssResult.errors);
            }
          }
          const scssDir = path.join(extractDir, 'scss');
          if (fsSync.existsSync(scssDir)) {
            const scssCssFiles = fsSync.readdirSync(scssDir)
              .filter(file => file.endsWith('.css') && file !== 'vars.css')
              .map(file => path.join(scssDir, file));
            for (const cssFile of scssCssFiles) {
              const cssResult = await this.colorUpdater.updateCssHardcoded(cssFile, colorConfig);
              result.updatedFiles.push(...cssResult.updatedFiles);
              result.errors.push(...cssResult.errors);
            }
          }
          break;
          
        case ThemeType.V17_CSS_ONLY:
          const styleDir = path.join(extractDir, 'style');
          if (fsSync.existsSync(styleDir)) {
            const cssFiles = fsSync.readdirSync(styleDir)
              .filter(file => file.endsWith('.css'))
              .map(file => path.join(styleDir, file));
              
            for (const cssFile of cssFiles) {
              const cssResult = await this.colorUpdater.updateCssHardcoded(cssFile, colorConfig);
              result.updatedFiles.push(...cssResult.updatedFiles);
              result.errors.push(...cssResult.errors);
            }
          }
          break;
          
        case ThemeType.LOGIN_PACKAGE:
          // Try style.css first (MK login packages use style.css at root)
          const styleCssPath = path.join(extractDir, 'style.css');
          if (fsSync.existsSync(styleCssPath)) {
            const styleResult = await this.colorUpdater.updateCssHardcoded(styleCssPath, colorConfig);
            result.updatedFiles.push(...styleResult.updatedFiles);
            result.errors.push(...styleResult.errors);
          }
          // Also check for login.css at root (V12 login packages)
          const loginCssPath = path.join(extractDir, 'login.css');
          if (fsSync.existsSync(loginCssPath)) {
            const loginResult = await this.colorUpdater.updateCssHardcoded(loginCssPath, colorConfig);
            result.updatedFiles.push(...loginResult.updatedFiles);
            result.errors.push(...loginResult.errors);
          }
          const findCssFiles = (dir: string): string[] => {
            const cssFiles: string[] = [];
            const scan = (d: string) => {
              if (!fsSync.existsSync(d)) return;
              const items = fsSync.readdirSync(d);
              for (const item of items) {
                const full = path.join(d, item);
                if (fsSync.statSync(full).isDirectory()) {
                  if (item === 'css' || item === 'style') {
                    const subItems = fsSync.readdirSync(full);
                    for (const sub of subItems) {
                      if (sub.endsWith('.css')) cssFiles.push(path.join(full, sub));
                    }
                  } else {
                    scan(full);
                  }
                }
              }
            };
            scan(dir);
            return cssFiles;
          };
          const nestedCssFiles = findCssFiles(extractDir);
          for (const cssFile of nestedCssFiles) {
            const cssResult = await this.colorUpdater.updateCssHardcoded(cssFile, colorConfig);
            result.updatedFiles.push(...cssResult.updatedFiles);
            result.errors.push(...cssResult.errors);
          }
          break;
          
        case ThemeType.KK_PACKAGE:
          break;
          
        default:
          result.errors.push(`Unsupported theme type: ${themeType}`);
      }
    } catch (error) {
      result.errors.push(`Error updating colors for theme type ${themeType}: ${(error as Error).message}`);
    }
    
    return result;
  }
}
