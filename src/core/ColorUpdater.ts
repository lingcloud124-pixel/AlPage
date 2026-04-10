import { readFile, writeFile } from 'node:fs/promises';
import { ColorConfig, DarkUIColorConfig, UpdateResult } from '../types/ConfigTypes.js';
import { VariableMapper } from './VariableMapper.js';
import { EKPVersion, DesktopAIColorScheme } from '../types/DesktopAI.js';

/**
 * Utility class for updating color configurations in various theme formats.
 * Supports MK index.js, SCSS variables, and CSS hardcoded colors.
 */
export class ColorUpdater {
  private variableMapper: VariableMapper;

  constructor(variableMapper?: VariableMapper) {
    this.variableMapper = variableMapper || new VariableMapper();
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const clean = hex.startsWith('#') ? hex.substring(1) : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }
  /**
   * Calculates opacity variants (10%, 20%, 30%) from a hex color.
   * @param primaryColor - Hex color string (e.g., '#FF0000' or '#F00')
   * @returns Partial ColorConfig with opacity variants
   */
  calculateOpacityVariants(primaryColor: string): Partial<ColorConfig> {
    const hex = primaryColor.startsWith('#') ? primaryColor.substring(1) : primaryColor;
    
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return {};
    }
    
    return {
      primaryOpacity10: `rgba(${r}, ${g}, ${b}, 0.1)`,
      primaryOpacity20: `rgba(${r}, ${g}, ${b}, 0.2)`,
      primaryOpacity30: `rgba(${r}, ${g}, ${b}, 0.3)`
    };
  }

  /**
   * Updates color variables in MK index.js file.
   * @param filePath - Path to the MK index.js file
   * @param config - Color configuration to apply
   * @returns UpdateResult with status information
   */
  async updateMKIndexJs(filePath: string, config: ColorConfig): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      if (config.primary) {
        // MK index.js uses colon, not equals: themeColor:"#2C615C"
        const themeColorRegex = /themeColor:\s*"[^"]+"/;
        if (themeColorRegex.test(content)) {
          updatedContent = updatedContent.replace(themeColorRegex, `themeColor:"${config.primary}"`);
          hasChanges = true;
        }
      }

      if (config.sidebarBg) {
        const sidebarBgRegex = /sidebarBg:\s*"[^"]+"/;
        if (sidebarBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarBgRegex, `sidebarBg:"${config.sidebarBg}"`);
          hasChanges = true;
        }
      }

      if (config.linkText) {
        const linkTextColorRegex = /linkTextColor:\s*"[^"]+"/;
        if (linkTextColorRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextColorRegex, `linkTextColor:"${config.linkText}"`);
          hasChanges = true;
        }
      }

      // Handle alter colors (note: original has typo "secondray" and "thirdray" in the JS object)
      // MK secondrayColor maps to third (dark blue)
      if (config.third) {
        const secondrayRegex = /secondrayColor:\s*"[^"]+"/;
        if (secondrayRegex.test(content)) {
          updatedContent = updatedContent.replace(secondrayRegex, `secondrayColor:"${config.third}"`);
          hasChanges = true;
        }
      }

      // MK thirdrayColor maps to secondary (light blue)
      if (config.secondary) {
        const thirdrayRegex = /thirdrayColor:\s*"[^"]+"/;
        if (thirdrayRegex.test(content)) {
          updatedContent = updatedContent.replace(thirdrayRegex, `thirdrayColor:"${config.secondary}"`);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating MK index.js ${filePath}: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Updates SCSS variables in vars.scss file.
   * @param filePath - Path to the SCSS variables file
   * @param config - Color configuration to apply
   * @returns UpdateResult with status information
   */
  async updateScssVars(filePath: string, config: ColorConfig): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      if (config.primary) {
        const primaryRegex = /\$primary-color\s*:\s*[^;]+;/;
        if (primaryRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryRegex, `$primary-color: ${config.primary};`);
          hasChanges = true;
        }
      }

      if (config.primaryHover) {
        const primaryHoverRegex = /\$primary-color-hover\s*:\s*[^;]+;/;
        if (primaryHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryHoverRegex, `$primary-color-hover: ${config.primaryHover};`);
          hasChanges = true;
        }
      }

      if (config.alterColor) {
        const alterColorRegex = /\$alter-color\s*:\s*[^;]+;/;
        if (alterColorRegex.test(content)) {
          updatedContent = updatedContent.replace(alterColorRegex, `$alter-color: ${config.alterColor};`);
          hasChanges = true;
        }
      }

      if (config.alterColorHoverOn) {
        const alterHoverRegex = /\$alter-color-hover-on\s*:\s*[^;]+;/;
        if (alterHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(alterHoverRegex, `$alter-color-hover-on: ${config.alterColorHoverOn};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity10) {
        const opacity10Regex = /\$primary-color-opacity-10\s*:\s*[^;]+;/;
        if (opacity10Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity10Regex, `$primary-color-opacity-10: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity20) {
        const opacity20Regex = /\$primary-color-opacity-20\s*:\s*[^;]+;/;
        if (opacity20Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity20Regex, `$primary-color-opacity-20: ${config.primaryOpacity20};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity30) {
        const opacity30Regex = /\$primary-color-opacity-30\s*:\s*[^;]+;/;
        if (opacity30Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity30Regex, `$primary-color-opacity-30: ${config.primaryOpacity30};`);
          hasChanges = true;
        }
      }

      if (config.secondary) {
        const secondaryRegex = /\$secondary-color\s*:\s*[^;]+;/;
        if (secondaryRegex.test(content)) {
          updatedContent = updatedContent.replace(secondaryRegex, `$secondary-color: ${config.secondary};`);
          hasChanges = true;
        }
      }

      if (config.third) {
        const thirdRegex = /\$third-color\s*:\s*[^;]+;/;
        if (thirdRegex.test(content)) {
          updatedContent = updatedContent.replace(thirdRegex, `$third-color: ${config.third};`);
          hasChanges = true;
        }
      }

      if (config.sidebarPanelBg) {
        const sidebarPanelBgRegex = /\$sidebar-panel-bg\s*:\s*[^;]+;/;
        if (sidebarPanelBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarPanelBgRegex, `$sidebar-panel-bg: ${config.sidebarPanelBg};`);
          hasChanges = true;
        }
      }

      if (config.linkText) {
        const linkTextRegex = /\$link-text\s*:\s*[^;]+;/;
        if (linkTextRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextRegex, `$link-text: ${config.linkText};`);
          hasChanges = true;
        }
        const linkTextColorRegex = /\$link-text-color\s*:\s*[^;]+;/;
        if (linkTextColorRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextColorRegex, `$link-text-color: ${config.linkText};`);
          hasChanges = true;
        }
      }

      if (config.linkTextHover) {
        const linkTextHoverRegex = /\$link-text-hover\s*:\s*[^;]+;/;
        if (linkTextHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextHoverRegex, `$link-text-hover: ${config.linkTextHover};`);
          hasChanges = true;
        }
        const linkTextHoverColorRegex = /\$link-text-hover-color\s*:\s*[^;]+;/;
        if (linkTextHoverColorRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextHoverColorRegex, `$link-text-hover-color: ${config.linkTextHover};`);
          hasChanges = true;
        }
      }

      if (config.primary) {
        const accordionBgRegex = /\$sidebar-accordionpanel-header-bg\s*:\s*[^;]+;/;
        if (accordionBgRegex.test(content)) {
          updatedContent = updatedContent.replace(accordionBgRegex, `$sidebar-accordionpanel-header-bg: ${config.primary};`);
          hasChanges = true;
        }
      }

      if (config.alterColor) {
        const accordionBgonRegex = /\$sidebar-accordionpanel-header-bgon\s*:\s*[^;]+;/;
        if (accordionBgonRegex.test(content)) {
          updatedContent = updatedContent.replace(accordionBgonRegex, `$sidebar-accordionpanel-header-bgon: ${config.alterColor};`);
          hasChanges = true;
        }
        const itemHexRegex = /\$sidebar-item-current-hex\s*:\s*[^;]+;/;
        if (itemHexRegex.test(content)) {
          updatedContent = updatedContent.replace(itemHexRegex, `$sidebar-item-current-hex: ${config.alterColor};`);
          hasChanges = true;
        }
        const itemTxtBgRegex = /\$sidebar-item-txt-bg\s*:\s*[^;]+;/;
        if (itemTxtBgRegex.test(content)) {
          updatedContent = updatedContent.replace(itemTxtBgRegex, `$sidebar-item-txt-bg: ${config.alterColor};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity10) {
        const listNavRegex = /\$list-nav-selected\s*:\s*[^;]+;/;
        if (listNavRegex.test(content)) {
          updatedContent = updatedContent.replace(listNavRegex, `$list-nav-selected: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
        const mapBgRegex = /\$sidebar-map-bg\s*:\s*[^;]+;/;
        if (mapBgRegex.test(content)) {
          updatedContent = updatedContent.replace(mapBgRegex, `$sidebar-map-bg: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
        const cardBgRegex = /\$navtitle-card-bg\s*:\s*[^;]+;/;
        if (cardBgRegex.test(content)) {
          updatedContent = updatedContent.replace(cardBgRegex, `$navtitle-card-bg: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
        const sidebarNumBgRegex = /\$sidebar-num-bg-hover\s*:\s*[^;]+;/;
        if (sidebarNumBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarNumBgRegex, `$sidebar-num-bg-hover: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
        const tabpanelVbgRegex = /\$tabpanel_vertical_bg\s*:\s*[^;]+;/;
        if (tabpanelVbgRegex.test(content)) {
          updatedContent = updatedContent.replace(tabpanelVbgRegex, `$tabpanel_vertical_bg: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
        const navTipsBgRegex = /\$nav_tips-bg-color\s*:\s*[^;]+;/;
        if (navTipsBgRegex.test(content)) {
          updatedContent = updatedContent.replace(navTipsBgRegex, `$nav_tips-bg-color: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
      }

      if (config.alterColor) {
        const dataviewRegex = /\$dataview_picmenu_on\s*:\s*[^;]+;/;
        if (dataviewRegex.test(content)) {
          updatedContent = updatedContent.replace(dataviewRegex, `$dataview_picmenu_on: ${config.alterColor};`);
          hasChanges = true;
        }
      }

      if (config.primary) {
        const navTipsFontRegex = /\$nav_tips-font-color\s*:\s*[^;]+;/;
        if (navTipsFontRegex.test(content)) {
          updatedContent = updatedContent.replace(navTipsFontRegex, `$nav_tips-font-color: ${config.primary};`);
          hasChanges = true;
        }
      }

      if (config.alterColorHoverOn) {
        const tabpanelVbgOnRegex = /\$tabpanel_vertical_bg_on\s*:\s*[^;]+;/;
        if (tabpanelVbgOnRegex.test(content)) {
          updatedContent = updatedContent.replace(tabpanelVbgOnRegex, `$tabpanel_vertical_bg_on: ${config.alterColorHoverOn};`);
          hasChanges = true;
        }
        const tabpanelFromRegex = /\$tabpanel_vertical-linear-gradient-from\s*:\s*[^;]+;/;
        if (tabpanelFromRegex.test(content)) {
          updatedContent = updatedContent.replace(tabpanelFromRegex, `$tabpanel_vertical-linear-gradient-from: ${config.alterColorHoverOn};`);
          hasChanges = true;
        }
        const tabpanelToRegex = /\$tabpanel_vertical-linear-gradient-to\s*:\s*[^;]+;/;
        if (tabpanelToRegex.test(content)) {
          updatedContent = updatedContent.replace(tabpanelToRegex, `$tabpanel_vertical-linear-gradient-to: ${config.alterColorHoverOn};`);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating SCSS vars ${filePath}: ${(error as Error).message}`);
    }

    return result;
  }

  async updateCssHardcoded(filePath: string, config: ColorConfig): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      if (config.primary) {
        const primaryRegex = /#2[cC]615[cC]/g;
        if (primaryRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryRegex, config.primary);
          hasChanges = true;
        }
        const greenAltRegex = /#36706[aA]/g;
        if (greenAltRegex.test(content)) {
          updatedContent = updatedContent.replace(greenAltRegex, config.primary);
          hasChanges = true;
        }
        const springPrimaryRegex = /#a7160b/gi;
        if (springPrimaryRegex.test(content)) {
          updatedContent = updatedContent.replace(springPrimaryRegex, config.primary);
          hasChanges = true;
        }
        const springPrimary2Regex = /#b72217/gi;
        if (springPrimary2Regex.test(content)) {
          updatedContent = updatedContent.replace(springPrimary2Regex, config.primary);
          hasChanges = true;
        }
        const springPrimary3Regex = /#c92d24/gi;
        if (springPrimary3Regex.test(content)) {
          updatedContent = updatedContent.replace(springPrimary3Regex, config.primary);
          hasChanges = true;
        }
        const rgb2C615c = /44,\s*97,\s*92/g;
        if (rgb2C615c.test(content)) {
          const rgb = this.hexToRgb(config.primary);
          if (rgb) {
            updatedContent = updatedContent.replace(rgb2C615c, `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`);
            hasChanges = true;
          }
        }
      }

      if (config.primaryHover) {
        const primaryHoverRegex = /#228077/g;
        if (primaryHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryHoverRegex, config.primaryHover);
          hasChanges = true;
        }
        const springHoverRegex = /#fdd0a3/g;
        if (springHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(springHoverRegex, config.primaryHover);
          hasChanges = true;
        }
      }

      if (config.third) {
        const thirdRegex = /#144[eE]48/g;
        if (thirdRegex.test(content)) {
          updatedContent = updatedContent.replace(thirdRegex, config.third);
          hasChanges = true;
        }
      }

      if (config.alterColor) {
        const alterCssRegex = /#144[eE]48/g;
        if (alterCssRegex.test(content)) {
          updatedContent = updatedContent.replace(alterCssRegex, config.alterColor);
          hasChanges = true;
        }
        const rgb144E48Regex = /144,78,72/g;
        if (rgb144E48Regex.test(content)) {
          const rgb = this.hexToRgb(config.alterColor);
          if (rgb) {
            updatedContent = updatedContent.replace(rgb144E48Regex, `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`);
            hasChanges = true;
          }
        }
        const rgbWithSpace = /144,\s*78,\s*72/g;
        if (rgbWithSpace.test(content)) {
          const rgb = this.hexToRgb(config.alterColor);
          if (rgb) {
            updatedContent = updatedContent.replace(rgbWithSpace, `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`);
            hasChanges = true;
          }
        }
      }

      if (config.secondary) {
        const secondaryRegex = /#22b77d/g;
        if (secondaryRegex.test(content)) {
          updatedContent = updatedContent.replace(secondaryRegex, config.secondary);
          hasChanges = true;
        }
        const springPrimaryRegex = /#a7160b/g;
        if (springPrimaryRegex.test(content)) {
          updatedContent = updatedContent.replace(springPrimaryRegex, config.secondary);
          hasChanges = true;
        }
        const springAlterRegex = /#94170e/g;
        if (springAlterRegex.test(content)) {
          updatedContent = updatedContent.replace(springAlterRegex, config.secondary);
          hasChanges = true;
        }
        const springPortalRegex = /#C41B00/gi;
        if (springPortalRegex.test(content)) {
          updatedContent = updatedContent.replace(springPortalRegex, config.alterColor || config.secondary);
          hasChanges = true;
        }
      }

      if (config.alterColorHoverOn) {
        const alterHoverCssRegex = /#56817[dD]/g;
        if (alterHoverCssRegex.test(content)) {
          updatedContent = updatedContent.replace(alterHoverCssRegex, config.alterColorHoverOn);
          hasChanges = true;
        }
      }

      if (config.sidebarPanelBg) {
        const sidebarPanelBgRegex = /#fbf9eb/gi;
        if (sidebarPanelBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarPanelBgRegex, config.sidebarPanelBg);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity10) {
        const op10Regex = /#EAF0EF/gi;
        if (op10Regex.test(content)) {
          updatedContent = updatedContent.replace(op10Regex, config.primaryOpacity10);
          hasChanges = true;
        }
        const op20Regex = /#D5DFDE/gi;
        if (op20Regex.test(content)) {
          updatedContent = updatedContent.replace(op20Regex, config.primaryOpacity20 || config.primaryOpacity10);
          hasChanges = true;
        }
        const op30Regex = /#C0D0CF/gi;
        if (op30Regex.test(content)) {
          updatedContent = updatedContent.replace(op30Regex, config.primaryOpacity30 || config.primaryOpacity10);
          hasChanges = true;
        }
      }

      if (config.primaryHover) {
        const springPHoverRegex = /#b72217/g;
        if (springPHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(springPHoverRegex, config.primary);
          hasChanges = true;
        }
        const springAltRegex = /#c92d24/g;
        if (springAltRegex.test(content)) {
          updatedContent = updatedContent.replace(springAltRegex, config.primary);
          hasChanges = true;
        }
      }

      if (config.sidebarBg) {
        const sidebarBgRegex = /#fbfcf2/g;
        if (sidebarBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarBgRegex, config.sidebarBg);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating CSS ${filePath}: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Updates SCSS variables with version-specific variable names.
   * Uses VariableMapper to get the correct variable name for each EKP version.
   * @param filePath - Path to the SCSS variables file
   * @param config - Color configuration to apply
   * @param version - EKP version (v12, v13, v14-v16, v17)
   * @returns UpdateResult with status information
   */
  async updateScssVarsForVersion(
    filePath: string, 
    config: ColorConfig, 
    version: EKPVersion
  ): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      const versionKey = version === 'v14-v16' ? 'v14-v16' : version;
      const colorMappings: Array<{
        configKey: keyof ColorConfig;
        pencilVar: keyof DesktopAIColorScheme;
      }> = [
        { configKey: 'primary', pencilVar: 'primary-color' },
        { configKey: 'primaryHover', pencilVar: 'primary-color-hover' },
        { configKey: 'secondary', pencilVar: 'text-secondary' },
        { configKey: 'sidebarBg', pencilVar: 'sidebar-color' },
        { configKey: 'sidebarPanelBg', pencilVar: 'sidebar-panel-bg' },
        { configKey: 'linkText', pencilVar: 'link-text' },
        { configKey: 'linkTextHover', pencilVar: 'link-text-hover' },
      ];

      for (const mapping of colorMappings) {
        const value = config[mapping.configKey];
        if (value) {
          const ekpVarName = this.variableMapper.getEKPVar(mapping.pencilVar, versionKey as EKPVersion);
          if (ekpVarName) {
            const varRegex = new RegExp(`\\${ekpVarName}\\s*:\\s*[^;]+;`, 'g');
            if (varRegex.test(updatedContent)) {
              updatedContent = updatedContent.replace(varRegex, `${ekpVarName}: ${value};`);
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating SCSS vars for ${version}: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Updates Dark-UI SCSS variables in vars.scss file.
   * Dark-UI uses a different color naming convention than Light-UI.
   * @param filePath - Path to the SCSS variables file
   * @param config - Dark-UI Color configuration to apply
   * @returns UpdateResult with status information
   */
  async updateDarkUIScssVars(filePath: string, config: DarkUIColorConfig): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      // Primary color mappings
      if (config.primary) {
        const primaryRegex = /\$primary-color\s*:\s*[^;]+;/;
        if (primaryRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryRegex, `$primary-color: ${config.primary};`);
          hasChanges = true;
        }
      }

      if (config.primaryHover) {
        const primaryHoverRegex = /\$primary-color-hover\s*:\s*[^;]+;/;
        if (primaryHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(primaryHoverRegex, `$primary-color-hover: ${config.primaryHover};`);
          hasChanges = true;
        }
      }

      if (config.alterColor) {
        const alterColorRegex = /\$alter-color\s*:\s*[^;]+;/;
        if (alterColorRegex.test(content)) {
          updatedContent = updatedContent.replace(alterColorRegex, `$alter-color: ${config.alterColor};`);
          hasChanges = true;
        }
      }

      if (config.alterColorHoverOn) {
        const alterHoverRegex = /\$alter-color-hover-on\s*:\s*[^;]+;/;
        if (alterHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(alterHoverRegex, `$alter-color-hover-on: ${config.alterColorHoverOn};`);
          hasChanges = true;
        }
      }

      // Opacity variants
      if (config.primaryOpacity10) {
        const opacity10Regex = /\$primary-color-opacity-10\s*:\s*[^;]+;/;
        if (opacity10Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity10Regex, `$primary-color-opacity-10: ${config.primaryOpacity10};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity20) {
        const opacity20Regex = /\$primary-color-opacity-20\s*:\s*[^;]+;/;
        if (opacity20Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity20Regex, `$primary-color-opacity-20: ${config.primaryOpacity20};`);
          hasChanges = true;
        }
      }

      if (config.primaryOpacity30) {
        const opacity30Regex = /\$primary-color-opacity-30\s*:\s*[^;]+;/;
        if (opacity30Regex.test(content)) {
          updatedContent = updatedContent.replace(opacity30Regex, `$primary-color-opacity-30: ${config.primaryOpacity30};`);
          hasChanges = true;
        }
      }

      // Header colors
      if (config.headerFontColor) {
        const headerFontRegex = /\$header-font-color\s*:\s*[^;]+;/;
        if (headerFontRegex.test(content)) {
          updatedContent = updatedContent.replace(headerFontRegex, `$header-font-color: ${config.headerFontColor};`);
          hasChanges = true;
        }
      }

      if (config.headerFontColorHover) {
        const headerFontHoverRegex = /\$header-font-color-hover\s*:\s*[^;]+;/;
        if (headerFontHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(headerFontHoverRegex, `$header-font-color-hover: ${config.headerFontColorHover};`);
          hasChanges = true;
        }
      }

      if (config.portalHeaderBgExtendColor) {
        const portalHeaderBgRegex = /\$portal-header-bg-extend-color\s*:\s*[^;]+;/;
        if (portalHeaderBgRegex.test(content)) {
          updatedContent = updatedContent.replace(portalHeaderBgRegex, `$portal-header-bg-extend-color: ${config.portalHeaderBgExtendColor};`);
          hasChanges = true;
        }
      }

      if (config.portalHeaderPureExtendColor) {
        const portalPureRegex = /\$portal-header-pure-extend-color\s*:\s*[^;]+;/;
        if (portalPureRegex.test(content)) {
          updatedContent = updatedContent.replace(portalPureRegex, `$portal-header-pure-extend-color: ${config.portalHeaderPureExtendColor};`);
          hasChanges = true;
        }
      }

      // Sidebar colors
      if (config.sidebarColor) {
        const sidebarColorRegex = /\$sidebar-color\s*:\s*[^;]+;/;
        if (sidebarColorRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarColorRegex, `$sidebar-color: ${config.sidebarColor};`);
          hasChanges = true;
        }
      }

      if (config.sidebarIconColor) {
        const sidebarIconRegex = /\$sidebar-icon-color\s*:\s*[^;]+;/;
        if (sidebarIconRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarIconRegex, `$sidebar-icon-color: ${config.sidebarIconColor};`);
          hasChanges = true;
        }
      }

      if (config.sidebarIconColorHover) {
        const sidebarIconHoverRegex = /\$sidebar-icon-color-hover\s*:\s*[^;]+;/;
        if (sidebarIconHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarIconHoverRegex, `$sidebar-icon-color-hover: ${config.sidebarIconColorHover};`);
          hasChanges = true;
        }
      }

      if (config.sidebarPanelBg) {
        const sidebarPanelBgRegex = /\$sidebar-panel-bg\s*:\s*[^;]+;/;
        if (sidebarPanelBgRegex.test(content)) {
          updatedContent = updatedContent.replace(sidebarPanelBgRegex, `$sidebar-panel-bg: ${config.sidebarPanelBg};`);
          hasChanges = true;
        }
      }

      if (config.sidebarAccordionPanelFont) {
        const accordionFontRegex = /\$sidebar-accordionpanel-font\s*:\s*[^;]+;/;
        if (accordionFontRegex.test(content)) {
          updatedContent = updatedContent.replace(accordionFontRegex, `$sidebar-accordionpanel-font: ${config.sidebarAccordionPanelFont};`);
          hasChanges = true;
        }
      }

      if (config.sidebarAccordionPanelHeaderBg) {
        const accordionBgRegex = /\$sidebar-accordionpanel-header-bg\s*:\s*[^;]+;/;
        if (accordionBgRegex.test(content)) {
          updatedContent = updatedContent.replace(accordionBgRegex, `$sidebar-accordionpanel-header-bg: ${config.sidebarAccordionPanelHeaderBg};`);
          hasChanges = true;
        }
      }

      if (config.sidebarAccordionPanelHeaderBgOn) {
        const accordionBgOnRegex = /\$sidebar-accordionpanel-header-bgon\s*:\s*[^;]+;/;
        if (accordionBgOnRegex.test(content)) {
          updatedContent = updatedContent.replace(accordionBgOnRegex, `$sidebar-accordionpanel-header-bgon: ${config.sidebarAccordionPanelHeaderBgOn};`);
          hasChanges = true;
        }
      }

      // Search colors
      if (config.searchFontColor) {
        const searchFontRegex = /\$search-font-color\s*:\s*[^;]+;/;
        if (searchFontRegex.test(content)) {
          updatedContent = updatedContent.replace(searchFontRegex, `$search-font-color: ${config.searchFontColor};`);
          hasChanges = true;
        }
      }

      if (config.searchInputBorderColor) {
        const searchBorderRegex = /\$search-input-border-color\s*:\s*[^;]+;/;
        if (searchBorderRegex.test(content)) {
          updatedContent = updatedContent.replace(searchBorderRegex, `$search-input-border-color: ${config.searchInputBorderColor};`);
          hasChanges = true;
        }
      }

      if (config.searchPlaceholdFontColor) {
        const searchPlaceholderRegex = /\$search-placehold-font-color\s*:\s*[^;]+;/;
        if (searchPlaceholderRegex.test(content)) {
          updatedContent = updatedContent.replace(searchPlaceholderRegex, `$search-placehold-font-color: ${config.searchPlaceholdFontColor};`);
          hasChanges = true;
        }
      }

      // Auxiliary colors
      if (config.auxiliaryGray) {
        const auxGrayRegex = /\$auxiliary-gray\s*:\s*[^;]+;/;
        if (auxGrayRegex.test(content)) {
          updatedContent = updatedContent.replace(auxGrayRegex, `$auxiliary-gray: ${config.auxiliaryGray};`);
          hasChanges = true;
        }
      }

      if (config.auxiliaryGrayDark) {
        const auxGrayDarkRegex = /\$auxiliary-gray-dark\s*:\s*[^;]+;/;
        if (auxGrayDarkRegex.test(content)) {
          updatedContent = updatedContent.replace(auxGrayDarkRegex, `$auxiliary-gray-dark: ${config.auxiliaryGrayDark};`);
          hasChanges = true;
        }
      }

      // Body and hover background
      if (config.bodyBgColor) {
        const bodyBgRegex = /\$body-bg-color\s*:\s*[^;]+;/;
        if (bodyBgRegex.test(content)) {
          updatedContent = updatedContent.replace(bodyBgRegex, `$body-bg-color: ${config.bodyBgColor};`);
          hasChanges = true;
        }
      }

      if (config.hoverBgColor) {
        const hoverBgRegex = /\$hover-bg-color\s*:\s*[^;]+;/;
        if (hoverBgRegex.test(content)) {
          updatedContent = updatedContent.replace(hoverBgRegex, `$hover-bg-color: ${config.hoverBgColor};`);
          hasChanges = true;
        }
      }

      // Link colors
      if (config.linkText) {
        const linkTextRegex = /\$link-text\s*:\s*[^;]+;/;
        if (linkTextRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextRegex, `$link-text: ${config.linkText};`);
          hasChanges = true;
        }
      }

      if (config.linkTextOn) {
        const linkTextOnRegex = /\$link-text-on\s*:\s*[^;]+;/;
        if (linkTextOnRegex.test(content)) {
          updatedContent = updatedContent.replace(linkTextOnRegex, `$link-text-on: ${config.linkTextOn};`);
          hasChanges = true;
        }
      }

      // Login background
      if (config.loginBgColor) {
        const loginBgRegex = /\$login-bg-color\s*:\s*[^;]+;/;
        if (loginBgRegex.test(content)) {
          updatedContent = updatedContent.replace(loginBgRegex, `$login-bg-color: ${config.loginBgColor};`);
          hasChanges = true;
        }
      }

      // Border colors
      if (config.borderColor) {
        const borderColorRegex = /\$border-color\s*:\s*[^;]+;/;
        if (borderColorRegex.test(content)) {
          updatedContent = updatedContent.replace(borderColorRegex, `$border-color: ${config.borderColor};`);
          hasChanges = true;
        }
      }

      if (config.borderIconColor) {
        const borderIconRegex = /\$border-icon-color\s*:\s*[^;]+;/;
        if (borderIconRegex.test(content)) {
          updatedContent = updatedContent.replace(borderIconRegex, `$border-icon-color: ${config.borderIconColor};`);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating Dark-UI SCSS vars ${filePath}: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Updates Dark-UI login.css hardcoded colors.
   * Dark-UI login page uses hardcoded colors #f8c28c and #fdd0a3 that need to be replaced.
   * @param filePath - Path to the login.css file
   * @param config - Dark-UI Color configuration to apply
   * @returns UpdateResult with status information
   */
  async updateDarkUILoginCss(filePath: string, config: DarkUIColorConfig): Promise<UpdateResult> {
    const result: UpdateResult = {
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    try {
      const content = await readFile(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      // Dark-UI login primary color: #f8c28c
      if (config.loginPrimaryColor) {
        const loginPrimaryRegex = /#f8c28c/g;
        if (loginPrimaryRegex.test(content)) {
          updatedContent = updatedContent.replace(loginPrimaryRegex, config.loginPrimaryColor);
          hasChanges = true;
        }
      }

      // Dark-UI login primary hover: #fdd0a3
      if (config.loginPrimaryHover) {
        const loginHoverRegex = /#fdd0a3/g;
        if (loginHoverRegex.test(content)) {
          updatedContent = updatedContent.replace(loginHoverRegex, config.loginPrimaryHover);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await writeFile(filePath, updatedContent);
        result.updatedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (error) {
      result.errors.push(`Error updating Dark-UI login CSS ${filePath}: ${(error as Error).message}`);
    }

    return result;
  }
}