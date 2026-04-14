/**
 * ⚠️ LEGACY / 历史工具链
 *
 * 此模块面向旧的 `.pen` 设计生成链路，
 * 当前 Web 产品主链路不再依赖它进行实时预览或导出。
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import type { DesktopAIColorScheme } from '../../types/DesktopAI.js';
import type { DesignAssets, DesignUpdate } from '../types/DesignAssets.js';
import { PencilMCPClient } from '../../core/PencilMCPClient.js';
import { LIGHT_UI_TEMPLATE_FRAMES } from '../../types/DesktopAI.js';
import { getPenNodes } from '../../utils/penNodeMappings.js';
import { TemplateType } from '../../types/ThemeType.js';

export class DesignGenerator {
  private pencilClient: PencilMCPClient;
  private templatePath: string;
  private currentWorkFilePath: string | null = null;

  constructor(pencilClient?: PencilMCPClient, templatePath?: string) {
    this.pencilClient = pencilClient || new PencilMCPClient();
    this.templatePath = templatePath || '/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/designs/Light-UI-模板.pen';
  }

  async generateNewPenFile(themeName: string): Promise<string> {
    const timestamp = Date.now();
    const safeThemeName = themeName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-');
    const newFileName = `Topic-${safeThemeName}-${timestamp}.pen`;
    const outputDir = path.dirname(this.templatePath);
    const newFilePath = path.join(outputDir, newFileName);

    await fs.copy(this.templatePath, newFilePath);

    this.currentWorkFilePath = newFilePath;

    return newFilePath;
  }

  async openDocument(filePath: string): Promise<void> {
    await this.pencilClient.openDocument(filePath);
    this.currentWorkFilePath = filePath;
  }

  getCurrentWorkFilePath(): string | null {
    return this.currentWorkFilePath;
  }

  async generateDesign(
    colorScheme: DesktopAIColorScheme,
    themeName: string
  ): Promise<DesignAssets> {
    const newFilePath = await this.generateNewPenFile(themeName);
    await this.openDocument(newFilePath);

    const applied = await this.applyColorVariables(colorScheme);
    if (!applied) {
      throw new Error('Failed to apply color variables');
    }

    const updated = await this.updateThemeText(themeName);
    if (!updated) {
      throw new Error('Failed to update theme text');
    }

    return {
      loginPageId: LIGHT_UI_TEMPLATE_FRAMES.LOGIN,
      generatedNodes: [],
      themeName,
      generatedAt: new Date(),
      penFilePath: newFilePath
    };
  }

  async applyColorVariables(colorScheme: DesktopAIColorScheme): Promise<boolean> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    try {
      const variables: Record<string, { type: string; value: string }> = {};

      for (const [name, value] of Object.entries(colorScheme)) {
        variables[`$${name}`] = {
          type: 'color',
          value
        };
      }

      await this.pencilClient.setVariables(this.currentWorkFilePath, variables);
      return true;
    } catch (error) {
      console.error('Error applying color variables:', error);
      return false;
    }
  }

  async updateThemeText(themeName: string): Promise<boolean> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    try {
      const operations = [
        `U("nXv3Y/title",{content:"${themeName} 登录"})`,
        `U("5puUK/headerTitle",{content:"${themeName}"})`
      ];

      await this.pencilClient.batchDesign(this.currentWorkFilePath, operations);
      return true;
    } catch (error) {
      console.error('Error updating theme text:', error);
      return false;
    }
  }

  async updateDesign(nodeId: string, updates: DesignUpdate): Promise<boolean> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    try {
      const operation = `U("${nodeId}",${JSON.stringify(updates.properties)})`;
      const result = await this.pencilClient.batchDesign(this.currentWorkFilePath, [operation]);
      return result.success;
    } catch (error) {
      console.error(`Error updating design for node ${nodeId}:`, error);
      return false;
    }
  }

  async getDesignState(nodeId: string): Promise<unknown | null> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    try {
      const result = await this.pencilClient.batchGet(this.currentWorkFilePath, [nodeId], { readDepth: 2 });
      return result[nodeId] || null;
    } catch (error) {
      console.error(`Error reading design state for node ${nodeId}:`, error);
      return null;
    }
  }

  async exportDesignNodes(
    nodeIds: string[],
    outputPath: string,
    format: 'png' | 'jpeg' | 'webp' = 'png'
  ): Promise<string[]> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    try {
      const exportedFiles = await this.pencilClient.exportNodes(
        this.currentWorkFilePath,
        nodeIds,
        outputPath,
        format
      );
      return exportedFiles;
    } catch (error) {
      console.error(`Error exporting nodes ${nodeIds.join(', ')}:`, error);
      return [];
    }
  }

  async exportHeaderAssets(
    outputPath: string,
    templateType: TemplateType = TemplateType.LIGHT_UI
  ): Promise<Record<string, string>> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }

    const nodes = getPenNodes(templateType);
    const nodeConfigs: { nodeId: string; outputFile: string; format: string }[] = [
      { nodeId: nodes.headerBg60.nodeId, outputFile: nodes.headerBg60.outputFile, format: nodes.headerBg60.format },
      { nodeId: nodes.headerBg90.nodeId, outputFile: nodes.headerBg90.outputFile, format: nodes.headerBg90.format },
      { nodeId: nodes.headerBg130.nodeId, outputFile: nodes.headerBg130.outputFile, format: nodes.headerBg130.format },
      { nodeId: nodes.banner.nodeId, outputFile: nodes.banner.outputFile, format: nodes.banner.format },
      { nodeId: nodes.sideHeader.nodeId, outputFile: nodes.sideHeader.outputFile, format: nodes.sideHeader.format },
      { nodeId: nodes.loginBg.nodeId, outputFile: nodes.loginBg.outputFile, format: nodes.loginBg.format },
      { nodeId: nodes.gradientRight.nodeId, outputFile: nodes.gradientRight.outputFile, format: nodes.gradientRight.format },
      { nodeId: nodes.gradientLeft.nodeId, outputFile: nodes.gradientLeft.outputFile, format: nodes.gradientLeft.format },
    ];

    const validConfigs = nodeConfigs.filter(c => !!c.nodeId);
    const nodeIds = validConfigs.map(c => c.nodeId);

    const result: Record<string, string> = {};

    try {
      const exportedFiles = await this.pencilClient.exportNodes(
        this.currentWorkFilePath,
        nodeIds,
        outputPath,
        'png'
      );

      for (let i = 0; i < validConfigs.length; i++) {
        const config = validConfigs[i];
        const exportedPath = exportedFiles[i];
        
        if (exportedPath) {
          const targetPath = path.join(outputPath, config.outputFile);
          await fs.move(exportedPath, targetPath, { overwrite: true });
          result[config.outputFile] = targetPath;
        }
      }

      return result;
    } catch (error) {
      console.error('Error exporting header assets:', error);
      return result;
    }
  }

  async getScreenshot(nodeId: string): Promise<string> {
    if (!this.currentWorkFilePath) {
      throw new Error('No document opened. Call generateDesign or openDocument first.');
    }
    return this.pencilClient.getScreenshot(this.currentWorkFilePath, nodeId);
  }

  async getCurrentFilePath(): Promise<string | null> {
    return this.pencilClient.getCurrentFilePath();
  }
}
