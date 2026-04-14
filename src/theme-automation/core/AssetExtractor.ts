/**
 * ⚠️ LEGACY / 历史工具链
 *
 * 此模块服务于旧的 Pencil 资产提取流程，
 * 当前产品导出主链路已改为 HTML 预览 + Playwright 截图。
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { ColorScheme } from '../types/ColorScheme.js';
import { DesignAssets } from '../types/DesignAssets.js';
import { 
  SizeInfo, 
  ExtractionResult, 
  DesignAssetSpec 
} from '../types/AssetTypes.js';
import { PencilMCPClient } from '../../core/PencilMCPClient.js';

export class AssetExtractor {
  private pencilClient: PencilMCPClient;

  constructor(pencilClient?: PencilMCPClient) {
    this.pencilClient = pencilClient || new PencilMCPClient();
  }

  async exportImages(
    nodeIds: string[], 
    outputDir: string, 
    format: 'png' | 'jpeg' | 'webp' = 'png',
    scale: number = 1
  ): Promise<string[]> {
    try {
      await fs.ensureDir(outputDir);
      
      const currentFilePath = this.pencilClient.getCurrentFilePath();
      if (!currentFilePath) {
        console.error('No document opened in Pencil client');
        return [];
      }
      
      const exportedFiles = await this.pencilClient.exportNodes(
        currentFilePath,
        nodeIds,
        outputDir,
        format,
        scale
      );
      
      return exportedFiles;
    } catch (error: any) {
      console.error('Export error:', error);
      return [];
    }
  }

  async extractColors(_filePath: string): Promise<ColorScheme> {
    try {
      const currentFilePath = this.pencilClient.getCurrentFilePath();
      if (!currentFilePath) {
        console.warn('No document opened, returning default colors');
        return this.getDefaultColors();
      }

      const variables = await this.pencilClient.getVariables(currentFilePath);
      const colorScheme = this.mapVariablesToColorScheme(variables);
      colorScheme.generatedAt = new Date();
      return colorScheme;
    } catch (error: any) {
      console.error('Color extraction error:', error);
      return this.getDefaultColors();
    }
  }

  private mapVariablesToColorScheme(variables: Record<string, unknown>): ColorScheme {
    const scheme: ColorScheme = {
      primary: '#2C615C',
      generatedAt: new Date()
    };

    const mapping: Array<{
      pencilVar: string;
      schemeKey: keyof ColorScheme;
    }> = [
      { pencilVar: 'primary-color', schemeKey: 'primary' },
      { pencilVar: 'primary-color-hover', schemeKey: 'primaryHover' },
      { pencilVar: 'secondary-color', schemeKey: 'secondary' },
      { pencilVar: 'third-color', schemeKey: 'third' },
      { pencilVar: 'sidebar-bg-color', schemeKey: 'sidebarBg' },
      { pencilVar: 'sidebar-panel-bg', schemeKey: 'sidebarPanelBg' },
      { pencilVar: 'link-text', schemeKey: 'linkText' },
      { pencilVar: 'link-text-hover', schemeKey: 'linkTextHover' },
    ];

    for (const { pencilVar, schemeKey } of mapping) {
      const varKey = `$${pencilVar}`;
      const varData = variables[varKey];
      if (varData && typeof varData === 'object' && 'value' in (varData as any)) {
        const value = (varData as any).value;
        if (typeof value === 'string' && value.startsWith('#')) {
          (scheme as any)[schemeKey] = value;
        }
      }
    }

    if (scheme.primary) {
      const opacity = this.calculateOpacityVariants(scheme.primary);
      scheme.primaryOpacity10 = opacity.primaryOpacity10;
      scheme.primaryOpacity20 = opacity.primaryOpacity20;
      scheme.primaryOpacity30 = opacity.primaryOpacity30;
    }

    return scheme;
  }

  private calculateOpacityVariants(color: string): { primaryOpacity10: string; primaryOpacity20: string; primaryOpacity30: string } {
    const hex = color.startsWith('#') ? color.substring(1) : color;
    let r: number, g: number, b: number;

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return { primaryOpacity10: '', primaryOpacity20: '', primaryOpacity30: '' };
    }

    return {
      primaryOpacity10: `rgba(${r}, ${g}, ${b}, 0.1)`,
      primaryOpacity20: `rgba(${r}, ${g}, ${b}, 0.2)`,
      primaryOpacity30: `rgba(${r}, ${g}, ${b}, 0.3)`,
    };
  }

  private getDefaultColors(): ColorScheme {
    return {
      primary: '#2C615C',
      primaryHover: '#3A7D78',
      secondary: '#E53935',
      third: '#FFA000',
      primaryOpacity10: 'rgba(44, 97, 92, 0.1)',
      primaryOpacity20: 'rgba(44, 97, 92, 0.2)',
      primaryOpacity30: 'rgba(44, 97, 92, 0.3)',
      sidebarBg: '#F5F8FA',
      linkText: '#2C615C',
      linkTextHover: '#3A7D78',
      generatedAt: new Date()
    };
  }

  async detectSize(nodeId: string): Promise<SizeInfo> {
    try {
      const sizeMap: Record<string, { width: number; height: number }> = {
        'login': { width: 1920, height: 1080 },
        'banner': { width: 1920, height: 200 },
        'simple': { width: 1920, height: 60 },
        'tabs': { width: 1920, height: 80 },
        'sideheader': { width: 300, height: 1080 }
      };

      let size: { width: number; height: number } = { width: 1920, height: 1080 };
      
      if (nodeId.includes('login') || nodeId.includes('background')) {
        size = sizeMap.login;
      } else if (nodeId.includes('banner')) {
        size = sizeMap.banner;
      } else if (nodeId.includes('simple')) {
        size = sizeMap.simple;
      } else if (nodeId.includes('tabs')) {
        size = sizeMap.tabs;
      } else if (nodeId.includes('side')) {
        size = sizeMap.sideheader;
      }

      return {
        width: size.width,
        height: size.height,
        format: 'png'
      };
    } catch (error: any) {
      console.error(`Size detection error for node ${nodeId}:`, error);
      return {
        width: 1920,
        height: 1080,
        format: 'png'
      };
    }
  }

  async batchExtractAssets(designAssets: DesignAssets, outputDir: string): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      images: [],
      colors: {} as ColorScheme,
      manifest: {
        headers: {},
        generatedAt: new Date()
      },
      errors: []
    };

    try {
      const currentFile = this.pencilClient.getCurrentFilePath();
      result.colors = await this.extractColors(currentFile || 'Light-UI-模板.pen');

      const assetSpecs: DesignAssetSpec[] = [];
      
      if (designAssets.loginPageId) {
        assetSpecs.push({
          nodeId: designAssets.loginPageId,
          filename: 'login-bg',
          expectedSize: { width: 1920, height: 1080 },
          format: 'jpg'
        });
      }

      if (designAssets.headerBannerId) {
        assetSpecs.push({
          nodeId: designAssets.headerBannerId,
          filename: 'header-banner',
          expectedSize: { width: 1920, height: 200 },
          format: 'png'
        });
      }

      if (designAssets.headerSimpleId) {
        assetSpecs.push({
          nodeId: designAssets.headerSimpleId,
          filename: 'header-simple', 
          expectedSize: { width: 1920, height: 60 },
          format: 'png'
        });
      }

      if (designAssets.headerTabsId) {
        assetSpecs.push({
          nodeId: designAssets.headerTabsId,
          filename: 'header-tabs',
          expectedSize: { width: 1920, height: 80 },
          format: 'png'
        });
      }

      if (designAssets.headerSideHeaderId) {
        assetSpecs.push({
          nodeId: designAssets.headerSideHeaderId,
          filename: 'header-sideheader',
          expectedSize: { width: 300, height: 1080 },
          format: 'png'
        });
      }

      const nodeIdsToExport = assetSpecs.map(spec => spec.nodeId);
      const exportedFiles = await this.exportImages(nodeIdsToExport, outputDir);
      result.images = exportedFiles;

      if (exportedFiles.length !== assetSpecs.length) {
        result.errors.push(`Expected ${assetSpecs.length} exported assets, received ${exportedFiles.length}`);
      }

      result.manifest = {
        headers: {},
        colorScheme: {
          primary: result.colors.primary,
          primaryHover: result.colors.primaryHover,
          secondary: result.colors.secondary,
          third: result.colors.third,
          primaryOpacity10: result.colors.primaryOpacity10,
          sidebarBg: result.colors.sidebarBg,
          linkText: result.colors.linkText
        },
        generatedAt: new Date()
      };

      if (designAssets.loginPageId) {
        result.manifest.loginBackground = {
          filename: 'login-bg.jpg',
          path: path.join(outputDir, 'login-bg.jpg'),
          size: { width: 1920, height: 1080, format: 'jpg' }
        };
      }

      const headerMap = [
        { id: designAssets.headerBannerId, key: 'banner', size: { width: 1920, height: 200 } },
        { id: designAssets.headerSimpleId, key: 'simple', size: { width: 1920, height: 60 } },
        { id: designAssets.headerTabsId, key: 'tabs', size: { width: 1920, height: 80 } },
        { id: designAssets.headerSideHeaderId, key: 'sideheader', size: { width: 300, height: 1080 } }
      ];

      for (const header of headerMap) {
        if (header.id) {
          (result.manifest.headers as any)[header.key] = {
            filename: `header-${header.key}.png`,
            path: path.join(outputDir, `header-${header.key}.png`),
            size: { ...header.size, format: 'png' }
          };
        }
      }

    } catch (error: any) {
      result.errors.push(`Batch extraction failed: ${error.message}`);
      console.error('Batch extraction error:', error);
    }

    return result;
  }
}
