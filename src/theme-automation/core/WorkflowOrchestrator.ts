/**
 * ⚠️ DEPRECATED — 此文件属于旧 TypeScript 工具链。
 * 当前生产工具为 Python 脚本：theme_builder.py、update-pen-theme.py、verify-build.py。
 * 参见 package.json "update" 脚本说明。
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ColorSchemeGenerator } from './ColorSchemeGenerator.js';
import { DesignGenerator } from './DesignGenerator.js';
import { AssetExtractor } from './AssetExtractor.js';
import { ThemeUpdater } from '../../core/ThemeUpdater.js';
import { PencilMCPClient } from '../../core/PencilMCPClient.js';
import {
  ThemeRequest,
  WorkflowStage,
  WorkflowState,
  AutomationResult,
  Report,
  ThemePackNames,
  ParsedFeedback,
  ManifestConfigExtended
} from '../types/WorkflowTypes.js';
import { ColorScheme, DesktopAIColorScheme } from '../types/ColorScheme.js';
import { generateThemePackNames } from '../utils/namingUtils.js';
import { Report as ThemeUpdateReport, ProcessResult } from '../../types/ManifestTypes.js';

export class WorkflowOrchestrator {
  private readonly samplePacksRoot = 'assets/references/samples/主题样例包';
  private colorGenerator: ColorSchemeGenerator;
  private designGenerator: DesignGenerator;
  private assetExtractor: AssetExtractor;
  private themeUpdater: ThemeUpdater;
  private pencilClient: PencilMCPClient;
  private state: WorkflowState;
  private executionId: string;

  constructor() {
    this.pencilClient = new PencilMCPClient();
    this.colorGenerator = new ColorSchemeGenerator();
    this.designGenerator = new DesignGenerator(this.pencilClient);
    this.assetExtractor = new AssetExtractor(this.pencilClient);
    this.themeUpdater = new ThemeUpdater();
    this.executionId = uuidv4();
    
    this.state = {
      stage: WorkflowStage.INIT,
      request: { description: '' },
      errors: [],
      timestamps: { init: new Date() },
      feedbackHistory: []
    };
  }

  async execute(request: ThemeRequest): Promise<AutomationResult> {
    this.state.request = request;
    const startTime = Date.now();
    
    try {
      await this.generateColorScheme();
      await this.generateDesign();
      await this.pauseForConfirmation(WorkflowStage.DESIGN_GENERATED);
      
      return this.buildResult(startTime);
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.INIT);
      this.state.stage = WorkflowStage.FAILED;
      return this.buildResult(startTime);
    }
  }

  async resume(feedback: string): Promise<AutomationResult> {
    const startTime = Date.now();
    this.state.feedbackHistory.push(feedback);
    
    try {
      const parsedFeedback = this.parseFeedback(feedback);
      
      switch (this.state.stage) {
        case WorkflowStage.COLORS_GENERATED:
          await this.handleColorFeedback(parsedFeedback);
          break;
          
        case WorkflowStage.DESIGN_GENERATED:
          await this.handleDesignFeedback(parsedFeedback);
          break;
          
        case WorkflowStage.ASSETS_EXTRACTED:
          await this.handleAssetFeedback(parsedFeedback);
          break;
          
        default:
          throw new Error(`Cannot resume from stage: ${this.state.stage}`);
      }
      
      return this.buildResult(startTime);
    } catch (error) {
      this.recordError(error as Error, this.state.stage);
      this.state.stage = WorkflowStage.FAILED;
      return this.buildResult(startTime);
    }
  }

  private async generateColorScheme(): Promise<void> {
    try {
      const colorScheme = await this.colorGenerator.generateDesktopAIColorScheme(
        this.state.request.description,
        this.state.request.themeMode || 'light'
      );
      
      this.state.colorScheme = colorScheme;
      this.state.stage = WorkflowStage.COLORS_GENERATED;
      this.state.timestamps.colorsGenerated = new Date();
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.INIT);
      throw error;
    }
  }

  private async generateDesign(): Promise<void> {
    try {
      if (!this.state.colorScheme) {
        throw new Error('Color scheme not generated');
      }
      
      const themeName = this.state.request.name || 
        this.extractThemeName(this.state.request.description);
      
      // generateDesign only accepts DesktopAIColorScheme
      if (!this.state.colorScheme || !('primary-color' in this.state.colorScheme)) {
        throw new Error('generateDesign requires a DesktopAIColorScheme');
      }
      
      const designAssets = await this.designGenerator.generateDesign(
        this.state.colorScheme as DesktopAIColorScheme,
        themeName
      );
      
      this.state.designAssets = designAssets;
      
      this.state.stage = WorkflowStage.DESIGN_GENERATED;
      this.state.timestamps.designGenerated = new Date();
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.COLORS_GENERATED);
      throw error;
    }
  }

  private async extractAssets(): Promise<void> {
    try {
      if (!this.state.designAssets) {
        throw new Error('Design assets not generated');
      }
      
      const outputDir = this.state.request.options?.outputDir || './source-images';
      
      const extractionResult = await this.assetExtractor.batchExtractAssets(
        this.state.designAssets,
        outputDir
      );

      if (extractionResult.errors.length > 0) {
        throw new Error(`Asset extraction failed: ${extractionResult.errors.join('; ')}`);
      }
      
      this.state.extractedAssets = extractionResult;
      this.state.stage = WorkflowStage.ASSETS_EXTRACTED;
      this.state.timestamps.assetsExtracted = new Date();
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.DESIGN_GENERATED);
      throw error;
    }
  }

  async generateManifest(
    colorScheme: ColorScheme | DesktopAIColorScheme,
    themeName: string,
    year: number
  ): Promise<string> {
    try {
      const themePackNames = generateThemePackNames(themeName, year);
      this.state.themePackNames = themePackNames;
      
      const isDesktopAI = 'primary-color' in colorScheme;
      const globalColors = isDesktopAI
        ? {
            primary: (colorScheme as DesktopAIColorScheme)['primary-color'],
            primaryHover: (colorScheme as DesktopAIColorScheme)['primary-color-hover'],
            secondary: (colorScheme as DesktopAIColorScheme)['alter-color'],
            third: (colorScheme as DesktopAIColorScheme)['alter-color-hover-on'],
            primaryOpacity10: (colorScheme as DesktopAIColorScheme)['primary-color-opacity-10'],
            primaryOpacity20: (colorScheme as DesktopAIColorScheme)['primary-color-opacity-20'],
            primaryOpacity30: (colorScheme as DesktopAIColorScheme)['primary-color-opacity-30'],
            sidebarBg: (colorScheme as DesktopAIColorScheme)['sidebar-panel-bg'] || '#FFFFFF',
            linkText: (colorScheme as DesktopAIColorScheme)['link-text'],
            linkTextHover: (colorScheme as DesktopAIColorScheme)['link-text-hover']
          }
        : {
            primary: (colorScheme as ColorScheme).primary,
            primaryHover: (colorScheme as ColorScheme).primaryHover,
            secondary: (colorScheme as ColorScheme).secondary,
            third: (colorScheme as ColorScheme).third,
            primaryOpacity10: (colorScheme as ColorScheme).primaryOpacity10,
            primaryOpacity20: (colorScheme as ColorScheme).primaryOpacity20,
            primaryOpacity30: (colorScheme as ColorScheme).primaryOpacity30,
            sidebarBg: (colorScheme as ColorScheme).sidebarBg,
            linkText: (colorScheme as ColorScheme).linkText,
            linkTextHover: (colorScheme as ColorScheme).linkTextHover
          };
      
      const manifest: ManifestConfigExtended = {
        version: '1.0',
        globalColors,
        sourceImages: {
          templateType: this.resolveTemplateTypeFromMode(),
          penFile: this.state.designAssets?.penFilePath || './designs/Light-UI-模板.pen',
          headerBanner: 'header-banner.png',
          headerSimple: 'header-simple.png',
          headerTabs: 'header-tabs.png',
          headerSideheader: 'header-sideheader.png',
          loginBg: 'login-bg.jpg'
        },
        themes: this.buildThemePackList(themePackNames),
        outputDir: 'output',
        options: {
          preserveOriginal: this.state.request.options?.preserveOriginal ?? true,
          generateHighRes: this.state.request.options?.generateHighRes ?? true,
          verbose: this.state.request.options?.verbose ?? true
        },
        workflowMetadata: {
          description: this.state.request.description,
          executionId: this.executionId,
          generatedAt: new Date()
        }
      };
      
      const manifestPath = './manifest.json';
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      
      this.state.manifestPath = manifestPath;
      return manifestPath;
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.ASSETS_EXTRACTED);
      throw error;
    }
  }

  async executeThemeUpdater(manifestPath: string): Promise<void> {
    try {
      this.state.stage = WorkflowStage.EXECUTING;
      this.state.timestamps.executing = new Date();

      const report = await this.themeUpdater.processAll(manifestPath);
      this.state.themeUpdateReport = report;
      this.state.outputDir = await this.resolveOutputDir(manifestPath);

      if (report.failed > 0) {
        throw new Error(`Theme updater failed for ${report.failed} theme pack(s)`);
      }

      this.state.stage = WorkflowStage.COMPLETED;
      this.state.timestamps.completed = new Date();
    } catch (error) {
      this.recordError(error as Error, WorkflowStage.EXECUTING);
      this.state.stage = WorkflowStage.FAILED;
      throw error;
    }
  }

  private buildThemePackList(names: ThemePackNames): Array<{
    name: string;
    zip: string;
    enabled: boolean;
    scssCompile?: boolean;
  }> {
    return [
      { name: names.mk, zip: this.resolveSampleThemeZipPath(names.mk), enabled: true },
      { name: names.v12, zip: this.resolveSampleThemeZipPath(names.v12), enabled: true, scssCompile: true },
      { name: names.v13_v13_5, zip: this.resolveSampleThemeZipPath(names.v13_v13_5), enabled: true, scssCompile: true },
      { name: names.v14_v16, zip: this.resolveSampleThemeZipPath(names.v14_v16), enabled: true, scssCompile: true },
      { name: names.v17, zip: this.resolveSampleThemeZipPath(names.v17), enabled: true },
      
      { name: names.login_mk, zip: this.resolveSampleZipPath(`${names.login_mk}.zip`), enabled: true },
      { name: names.login_v12, zip: this.resolveSampleZipPath(`${names.login_v12}.zip`), enabled: true },
      { name: names.login_v13, zip: this.resolveSampleZipPath(`${names.login_v13}.zip`), enabled: true },
      { name: names.login_v13_5, zip: this.resolveSampleZipPath(`${names.login_v13_5}.zip`), enabled: true },
      { name: names.login_v14, zip: this.resolveSampleZipPath(`${names.login_v14}.zip`), enabled: true },
      { name: names.login_v15, zip: this.resolveSampleZipPath(`${names.login_v15}.zip`), enabled: true },
      { name: names.login_v16, zip: this.resolveSampleZipPath(`${names.login_v16}.zip`), enabled: true },
      { name: names.login_v17, zip: this.resolveSampleZipPath(`${names.login_v17}.zip`), enabled: true },
      
      { name: names.kk, zip: this.resolveSampleZipPath(`${names.kk}.zip`), enabled: true }
    ];
  }

  private resolveSampleThemeZipPath(themePackName: string): string {
    const fileName = themePackName.endsWith('主题')
      ? `${themePackName}.zip`
      : `${themePackName}主题.zip`;
    return this.resolveSampleZipPath(fileName);
  }

  private resolveSampleZipPath(fileName: string): string {
    const modeDir = this.state.request.themeMode === 'dark' ? 'Dark-UI' : 'Light-UI';
    const modeSpecificPath = path.join(this.samplePacksRoot, modeDir, fileName);
    if (this.samplePathExists(modeSpecificPath)) {
      return modeSpecificPath;
    }
    return path.join(this.samplePacksRoot, fileName);
  }

  private samplePathExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  private resolveTemplateTypeFromMode(): 'light-ui' | 'dark-ui' {
    return this.state.request.themeMode === 'dark' ? 'dark-ui' : 'light-ui';
  }

  private async pauseForConfirmation(_stage: WorkflowStage): Promise<void> {
    if (!this.state.request.options?.autoConfirm) {
      return;
    }
  }

  private parseFeedback(feedback: string): ParsedFeedback {
    const lowerFeedback = feedback.toLowerCase();
    
    if (lowerFeedback.includes('确认') || lowerFeedback.includes('继续') || lowerFeedback.includes('开始生成')) {
      return { type: 'proceed', text: feedback };
    }
    
    if (lowerFeedback.includes('取消') || lowerFeedback.includes('停止')) {
      return { type: 'cancel', text: feedback };
    }
    
    if (lowerFeedback.includes('重新开始') || lowerFeedback.includes('重来')) {
      return { type: 'restart', text: feedback };
    }
    
    if (lowerFeedback.includes('主色') || lowerFeedback.includes('颜色') || 
        lowerFeedback.includes('太深') || lowerFeedback.includes('太亮') || 
        feedback.match(/#[0-9A-Fa-f]{6}/)) {
      return { type: 'color_adjustment', text: feedback };
    }
    
    return { type: 'proceed', text: feedback };
  }

  private async handleColorFeedback(parsedFeedback: ParsedFeedback): Promise<void> {
    switch (parsedFeedback.type) {
      case 'color_adjustment':
        if (this.state.colorScheme) {
          this.state.colorScheme = this.refineCurrentColorScheme(parsedFeedback.text);
          await this.generateDesign();
        }
        break;
        
      case 'proceed':
        await this.generateDesign();
        break;
        
      case 'cancel':
        this.state.stage = WorkflowStage.FAILED;
        throw new Error('Workflow cancelled by user');
        
      case 'restart':
        await this.execute(this.state.request);
        break;
    }
  }

  private async handleDesignFeedback(parsedFeedback: ParsedFeedback): Promise<void> {
    switch (parsedFeedback.type) {
      case 'color_adjustment':
        if (this.state.colorScheme) {
          this.state.colorScheme = this.refineCurrentColorScheme(parsedFeedback.text);
          await this.generateDesign();
        }
        break;
        
      case 'proceed':
        await this.extractAssets();
        const themeName = this.extractThemeName(this.state.request.description);
        const year = this.state.request.year || new Date().getFullYear();
        
        if (this.state.colorScheme) {
          await this.generateManifest(this.state.colorScheme, themeName, year);
          
          if (this.state.manifestPath) {
            await this.executeThemeUpdater(this.state.manifestPath);
          }
        }
        break;
        
      case 'cancel':
        this.state.stage = WorkflowStage.FAILED;
        throw new Error('Workflow cancelled by user');
        
      case 'restart':
        await this.execute(this.state.request);
        break;
    }
  }

  private async handleAssetFeedback(parsedFeedback: ParsedFeedback): Promise<void> {
    switch (parsedFeedback.type) {
      case 'proceed':
        const themeName = this.extractThemeName(this.state.request.description);
        const year = this.state.request.year || new Date().getFullYear();
        
        if (this.state.colorScheme) {
          await this.generateManifest(this.state.colorScheme, themeName, year);
          
          if (this.state.manifestPath) {
            await this.executeThemeUpdater(this.state.manifestPath);
          }
        }
        break;
        
      case 'cancel':
        this.state.stage = WorkflowStage.FAILED;
        throw new Error('Workflow cancelled by user');
        
      case 'restart':
        await this.execute(this.state.request);
        break;
    }
  }

  private extractThemeName(description: string): string {
    const yearMatch = description.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    
    const keywords = ['清明', '春节', '新年', '元宵', '端午', '中秋', '国庆', 
                      '圣诞', '五一', '元旦', '七夕', '重阳'];
    
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        return `${year}${keyword}`;
      }
    }
    
    return `${year}主题`;
  }

  private recordError(error: Error, stage: WorkflowStage): void {
    this.state.errors.push({
      stage,
      message: error.message,
      timestamp: new Date()
    });
  }

  private refineCurrentColorScheme(feedback: string): ColorScheme | DesktopAIColorScheme {
    if (!this.state.colorScheme) {
      throw new Error('Color scheme not generated');
    }

    if ('primary-color' in this.state.colorScheme) {
      const baseScheme = this.colorGenerator.deriveColorScheme(this.state.colorScheme['primary-color']);
      const refinedScheme = this.colorGenerator.refineScheme(baseScheme, feedback);
      return this.colorGenerator.deriveDesktopAIColorScheme(refinedScheme.primary);
    }

    return this.colorGenerator.refineScheme(this.state.colorScheme as ColorScheme, feedback);
  }

  private async resolveOutputDir(manifestPath: string): Promise<string> {
    const manifest = await fs.readJson(manifestPath) as ManifestConfigExtended;
    return path.isAbsolute(manifest.outputDir)
      ? manifest.outputDir
      : path.join(path.dirname(manifestPath), manifest.outputDir || 'output');
  }

  private buildThemePackPaths(names: ThemePackNames, outputDir: string): string[] {
    return [
      path.join(outputDir, `${names.mk}-新版.zip`),
      path.join(outputDir, `${names.v12}-新版.zip`),
      path.join(outputDir, `${names.v13_v13_5}-新版.zip`),
      path.join(outputDir, `${names.v14_v16}-新版.zip`),
      path.join(outputDir, `${names.v17}-新版.zip`),
      path.join(outputDir, `${names.login_mk}-新版.zip`),
      path.join(outputDir, `${names.login_v12}-新版.zip`),
      path.join(outputDir, `${names.login_v13}-新版.zip`),
      path.join(outputDir, `${names.login_v13_5}-新版.zip`),
      path.join(outputDir, `${names.login_v14}-新版.zip`),
      path.join(outputDir, `${names.login_v15}-新版.zip`),
      path.join(outputDir, `${names.login_v16}-新版.zip`),
      path.join(outputDir, `${names.login_v17}-新版.zip`),
      path.join(outputDir, `${names.kk}-新版.zip`)
    ];
  }

  private buildPackDetails(
    outputDir: string,
    fallbackThemePacks: string[],
    themeUpdateReport?: ThemeUpdateReport
  ): Array<{
    name: string;
    path: string;
    duration: number;
    success: boolean;
    updatedFiles: string[];
    errors: string[];
  }> {
    if (themeUpdateReport) {
      return themeUpdateReport.results.map((result: ProcessResult) => ({
        name: result.themeName,
        path: path.join(outputDir, `${result.themeName}-新版.zip`),
        duration: result.duration,
        success: result.success,
        updatedFiles: result.updatedFiles,
        errors: result.errors
      }));
    }

    return fallbackThemePacks.map(packPath => ({
      name: path.basename(packPath, '-新版.zip'),
      path: packPath,
      duration: 0,
      success: !this.state.errors.some(e => e.message.includes(packPath)),
      updatedFiles: [],
      errors: []
    }));
  }

  private buildResult(startTime: number): AutomationResult {
    const outputDir = this.state.outputDir || path.join(process.cwd(), 'output');
    const themePacks = this.state.themeUpdateReport
      ? this.state.themeUpdateReport.results.map(result => path.join(outputDir, `${result.themeName}-新版.zip`))
      : (this.state.stage === WorkflowStage.COMPLETED && this.state.themePackNames
          ? this.buildThemePackPaths(this.state.themePackNames, outputDir)
          : []);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const packDetails = this.buildPackDetails(outputDir, themePacks, this.state.themeUpdateReport);
    const reportErrors = packDetails.flatMap(detail => detail.errors);
    const workflowErrors = this.state.errors.map(e => e.message);
    
    const report: Report = {
      totalTime,
      totalPacks: themePacks.length,
      successfulPacks: this.state.themeUpdateReport?.successful ?? packDetails.filter(detail => detail.success).length,
      failedPacks: this.state.themeUpdateReport?.failed ?? packDetails.filter(detail => !detail.success).length,
      packDetails,
      errors: [...workflowErrors, ...reportErrors],
      warnings: [],
      outputLocations: {
        outputDir,
        sourceImagesDir: './source-images',
        manifestFile: this.state.manifestPath || '',
        designFile: this.state.designAssets?.penFilePath || './designs/Light-UI-模板.pen',
        reportFile: this.state.manifestPath
          ? path.join(path.dirname(this.state.manifestPath), 'output', 'report.json')
          : path.join(process.cwd(), 'output', 'report.json')
      },
      generatedAt: new Date()
    };
    
    return {
      colorScheme: this.state.colorScheme || {} as ColorScheme,
      designAssets: this.state.designAssets || {} as any,
      extractedAssets: this.state.extractedAssets || {} as any,
      manifestPath: this.state.manifestPath || '',
      themePacks,
      report,
      stage: this.state.stage
    };
  }

  getState(): WorkflowState {
    return this.state;
  }
}
