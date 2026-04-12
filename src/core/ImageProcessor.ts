import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { ImageConfig } from '../types/ConfigTypes.js';
import { ThemeType, TemplateType } from '../types/ThemeType.js';
import { getImageMappings } from '../utils/imageMappings.js';

export interface UpdateResult {
  success: boolean;
  processedFiles: string[];
  errors: string[];
}

export class ImageProcessor {
  private getConfiguredSourcePath(config: ImageConfig, sourceFile: string): string | undefined {
    const extendedConfig = config as ImageConfig & Record<string, string | undefined>;

    switch (sourceFile) {
      case 'header-banner.png':
        return config.headerBanner ?? extendedConfig.headerComplex ?? extendedConfig.headerClassic;
      case 'header-simple.png':
        return config.headerSimple ?? extendedConfig.headerSimpleFrame ?? extendedConfig.headerSingleMenuFrameBg;
      case 'header-tabs.png':
        return config.headerTabs ?? extendedConfig.headerZoneFrameBg ?? extendedConfig.headerZoneNavFrameBg;
      case 'header-sideheader.png':
        return config.headerSideheader;
      case 'login-bg.png':
      case 'login-bg.jpg':
        return config.loginBg ?? extendedConfig.loginBackground;
      case 'desktop.png':
        return extendedConfig.desktop;
      case 'layout-banner.jpg':
        return extendedConfig.layoutBanner;
      default:
        return extendedConfig[sourceFile];
    }
  }

  async getImageSize(filePath: string): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(filePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error(`Could not determine dimensions for ${filePath}`);
      }
      return { width: metadata.width, height: metadata.height };
    } catch (error: any) {
      throw new Error(`Failed to get image size for ${filePath}: ${error.message}`);
    }
  }

  async resizeImage(input: string, output: string, size: { width: number; height: number }): Promise<void> {
    try {
      const outputDir = path.dirname(output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await sharp(input)
        .resize(size.width, size.height, {
          fit: 'fill',
          position: 'center'
        })
        .toFile(output);
    } catch (error: any) {
      throw new Error(`Failed to resize image ${input} to ${output}: ${error.message}`);
    }
  }

  async convertFormat(input: string, output: string, format: 'png' | 'jpg'): Promise<void> {
    try {
      const outputDir = path.dirname(output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const sharpInstance = sharp(input);
      
      if (format === 'png') {
        await sharpInstance.png().toFile(output);
      } else {
        await sharpInstance.jpeg({ quality: 90 }).toFile(output);
      }
    } catch (error: any) {
      throw new Error(`Failed to convert format for ${input} to ${output}: ${error.message}`);
    }
  }

  async processImages(config: ImageConfig, themeType: ThemeType, targetDir: string, templateType?: TemplateType): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: true,
      processedFiles: [],
      errors: []
    };

    try {
      const effectiveTemplateType = (config.templateType === 'dark-ui' ? TemplateType.DARK_UI : TemplateType.LIGHT_UI) || templateType || TemplateType.LIGHT_UI;
      const mappings = getImageMappings(themeType, effectiveTemplateType);
      
      const baseSourceDir = config.exportedImagesDir || path.dirname(config.loginBg || '');

      for (const mapping of mappings) {
        const configuredSourceFile = this.getConfiguredSourcePath(config, mapping.sourceFile);
        let sourceFile = configuredSourceFile;

        if (!sourceFile && baseSourceDir) {
          sourceFile = path.join(baseSourceDir, mapping.sourceFile);
        }

        if (!sourceFile) {
          continue;
        }

        if (!fs.existsSync(sourceFile)) {
          if (!configuredSourceFile) {
            continue;
          }
          result.errors.push(`Source file not found: ${sourceFile}`);
          result.success = false;
          continue;
        }

        const targetPath = path.join(targetDir, mapping.targetPath);
        const targetDirPath = path.dirname(targetPath);
        
        if (!fs.existsSync(targetDirPath)) {
          fs.mkdirSync(targetDirPath, { recursive: true });
        }

        let tempWorkingFile = sourceFile;
        
        if (mapping.targetSize) {
          const tempResizedPath = path.join(targetDirPath, `temp_resized_${path.basename(targetPath)}`);
          await this.resizeImage(sourceFile, tempResizedPath, mapping.targetSize);
          tempWorkingFile = tempResizedPath;
        }

        const sourceExt = path.extname(sourceFile).toLowerCase();
        let finalWorkingFile = tempWorkingFile;
        
        if ((sourceExt === '.png' && mapping.format === 'jpg') || 
            (sourceExt === '.jpg' && mapping.format === 'png')) {
          const tempConvertedPath = path.join(targetDirPath, `temp_converted_${path.basename(targetPath)}`);
          await this.convertFormat(tempWorkingFile, tempConvertedPath, mapping.format);
          finalWorkingFile = tempConvertedPath;
        }

        fs.copyFileSync(finalWorkingFile, targetPath);
        result.processedFiles.push(targetPath);

        if (finalWorkingFile !== sourceFile) {
          fs.unlinkSync(finalWorkingFile);
        }
        if (tempWorkingFile !== sourceFile && tempWorkingFile !== finalWorkingFile) {
          fs.unlinkSync(tempWorkingFile);
        }

        if (mapping.generate2x) {
          const targetSize2x = mapping.targetSize 
            ? { width: mapping.targetSize.width * 2, height: mapping.targetSize.height * 2 }
            : undefined;
          
          if (targetSize2x) {
            const targetPath2x = targetPath.replace(/\.(png|jpg)$/, '@2x.$1');
            await this.resizeImage(sourceFile, targetPath2x, targetSize2x);
            result.processedFiles.push(targetPath2x);
          }
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }
}
