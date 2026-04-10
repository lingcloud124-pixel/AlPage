import * as fs from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { ThemeType, ThemeDetectionResult, TemplateType } from '../types/ThemeType.js';

export class ThemeDetector {
  public static async detectThemeType(zipPath: string): Promise<ThemeDetectionResult> {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`File not found: ${zipPath}`);
    }

    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      
      const structure = ThemeDetector.extractStructureInfo(zipEntries);
      const templateType = ThemeDetector.detectTemplateType(zipEntries);
      
      if (ThemeDetector.hasMetaJsonWithMkworksProject(zipEntries) && !ThemeDetector.hasMetaJsonWithLoginType(zipEntries)) {
        return {
          type: ThemeType.MK_GREEN,
          templateType,
          hasScssSource: false,
          structure
        };
      }
      
      if (ThemeDetector.hasLoginJspAndLoginBgDir(zipEntries)) {
        return {
          type: ThemeType.LOGIN_PACKAGE,
          templateType,
          hasScssSource: false,
          structure
        };
      }

      if (ThemeDetector.hasIndexJsAndStaticDirWithLoginType(zipEntries)) {
        return {
          type: ThemeType.LOGIN_PACKAGE,
          templateType,
          hasScssSource: false,
          structure
        };
      }
      
      if (ThemeDetector.hasAndroidAndIosThemeDirs(zipEntries)) {
        return {
          type: ThemeType.KK_PACKAGE,
          templateType,
          hasScssSource: false,
          structure
        };
      }
      
      if (ThemeDetector.hasScssLibVarsScss(zipEntries)) {
        const scssType = ThemeDetector.determineScssVersion(zipEntries);
        return {
          type: scssType,
          templateType,
          hasScssSource: true,
          structure
        };
      }
      
      if (ThemeDetector.hasStyleCssWithoutScss(zipEntries)) {
        return {
          type: ThemeType.V17_CSS_ONLY,
          templateType,
          hasScssSource: false,
          structure
        };
      }
      
      if (ThemeDetector.hasIndexJsAndStaticDir(zipEntries)) {
        return {
          type: ThemeType.MK_GREEN,
          templateType,
          hasScssSource: false,
          structure
        };
      }
      
      throw new Error('Unable to determine theme type');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw new Error(`Invalid zip file: ${zipPath}`);
      }
      throw error;
    }
  }
  
  private static extractStructureInfo(entries: AdmZip.IZipEntry[]): {
    rootFiles: string[];
    directories: string[];
    keyFiles: string[];
  } {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    
    const filePaths: string[] = [];
    const dirPaths: string[] = [];
    
    for (const name of entryNames) {
      if (!name.endsWith('/')) {
        filePaths.push(name);
      } else {
        dirPaths.push(name.slice(0, -1));
      }
    }
    
    const allPaths = [...filePaths, ...dirPaths].filter(p => p !== '');
    if (allPaths.length === 0) {
      return { rootFiles: [], directories: [], keyFiles: [] };
    }
    
    let commonPrefix = allPaths[0];
    for (const p of allPaths) {
      while (!p.startsWith(commonPrefix) && commonPrefix.length > 0) {
        const lastSlash = commonPrefix.lastIndexOf('/');
        commonPrefix = lastSlash > 0 ? commonPrefix.substring(0, lastSlash) : '';
      }
      if (commonPrefix === '') break;
    }
    
    if (commonPrefix && !commonPrefix.endsWith('/')) {
      commonPrefix += '/';
    }
    
    const normalizedFiles = new Set<string>();
    const normalizedDirs = new Set<string>();
    
    for (const filePath of filePaths) {
      let normalized = filePath;
      if (commonPrefix && normalized.startsWith(commonPrefix)) {
        normalized = normalized.substring(commonPrefix.length);
      }
      if (normalized) {
        normalizedFiles.add(normalized);
      }
    }
    
    for (const dirPath of dirPaths) {
      let normalized = dirPath;
      if (commonPrefix && normalized.startsWith(commonPrefix)) {
        normalized = normalized.substring(commonPrefix.length);
      }
      if (normalized) {
        normalizedDirs.add(normalized);
      }
    }
    
    for (const filePath of normalizedFiles) {
      const parts = filePath.split('/');
      if (parts.length > 1) {
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          normalizedDirs.add(currentPath);
        }
      }
    }
    
    const keyFiles: string[] = [];
    
    for (const filePath of normalizedFiles) {
      if (filePath.includes('meta.json') || 
          filePath.includes('login.jsp') || 
          filePath.includes('scss/lib/vars.scss') ||
          filePath.includes('style/') ||
          filePath.includes('android_theme/') ||
          filePath.includes('ios_theme/') ||
          filePath === 'index.js') {
        keyFiles.push(filePath);
      }
    }
    
    for (const dirPath of normalizedDirs) {
      if (dirPath.includes('meta.json') || 
          dirPath.includes('login.jsp') || 
          dirPath.includes('scss/lib/vars.scss') ||
          dirPath.includes('style/') ||
          dirPath.includes('android_theme/') ||
          dirPath.includes('ios_theme/') ||
          dirPath === 'index.js') {
        keyFiles.push(dirPath);
      }
    }
    
    return {
      rootFiles: Array.from(normalizedFiles),
      directories: Array.from(normalizedDirs),
      keyFiles: [...new Set(keyFiles)]
    };
  }
  
  private static hasMetaJsonWithMkworksProject(entries: AdmZip.IZipEntry[]): boolean {
    const metaJsonEntries = entries.filter(entry => {
      const name = entry.entryName.replace(/\\/g, '/');
      return name.endsWith('meta.json');
    });
    
    for (const entry of metaJsonEntries) {
      try {
        const content = entry.getData().toString('utf8');
        const meta = JSON.parse(content);
        if (meta.project === 'mkworks') {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  private static hasMetaJsonWithLoginType(entries: AdmZip.IZipEntry[]): boolean {
    const metaJsonEntries = entries.filter(entry => {
      const name = entry.entryName.replace(/\\/g, '/');
      return name.endsWith('meta.json');
    });

    for (const entry of metaJsonEntries) {
      try {
        const content = entry.getData().toString('utf8');
        const meta = JSON.parse(content);
        if (meta.type === 'login') {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  private static hasIndexJsAndStaticDirWithLoginType(entries: AdmZip.IZipEntry[]): boolean {
    if (!ThemeDetector.hasIndexJsAndStaticDir(entries)) {
      return false;
    }
    return ThemeDetector.hasMetaJsonWithLoginType(entries);
  }
  
  private static hasLoginJspAndLoginBgDir(entries: AdmZip.IZipEntry[]): boolean {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    const hasLoginJsp = entryNames.some(name => name.endsWith('login.jsp'));
    const hasLoginBgDir = entryNames.some(name => name.includes('login_bg/'));
    // V12 and earlier: has both login.jsp and login_bg/
    if (hasLoginJsp && hasLoginBgDir) {
      return true;
    }
    // V13 and later: may have form.jsp instead of login.jsp, no login_bg/
    const hasFormJsp = entryNames.some(name => name.endsWith('form.jsp'));
    const hasCssDir = entryNames.some(name => name.includes('css/') && name.endsWith('.css'));
    if (hasFormJsp && hasCssDir) {
      return true;
    }
    return false;
  }
  
  private static hasAndroidAndIosThemeDirs(entries: AdmZip.IZipEntry[]): boolean {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    const hasAndroid = entryNames.some(name => name.includes('android_theme/'));
    const hasIos = entryNames.some(name => name.includes('ios_theme/'));
    return hasAndroid && hasIos;
  }
  
  private static hasScssLibVarsScss(entries: AdmZip.IZipEntry[]): boolean {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    return entryNames.some(name => name.includes('scss/lib/vars.scss'));
  }
  
  private static determineScssVersion(entries: AdmZip.IZipEntry[]): ThemeType {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    
    const hasV12Patterns = entryNames.some(name => 
      name.includes('icon/l/') || 
      name.includes('images/hr/icon/')
    );
    
    if (hasV12Patterns) {
      return ThemeType.V12_SCSS;
    }
    
    return ThemeType.V17_SCSS;
  }
  
  private static hasStyleCssWithoutScss(entries: AdmZip.IZipEntry[]): boolean {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    const hasStyleCss = entryNames.some(name => name.includes('style/') && name.endsWith('.css'));
    const hasScssDir = entryNames.some(name => name.includes('scss/'));
    return hasStyleCss && !hasScssDir;
  }
  
  private static hasIndexJsAndStaticDir(entries: AdmZip.IZipEntry[]): boolean {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    const hasIndexJs = entryNames.some(name => name.endsWith('index.js'));
    const hasStaticDir = entryNames.some(name => name.includes('static/'));
    return hasIndexJs && hasStaticDir;
  }

  private static detectTemplateType(entries: AdmZip.IZipEntry[]): TemplateType {
    const entryNames = entries.map(entry => entry.entryName.replace(/\\/g, '/'));
    
    const hasDeepUiPattern = entryNames.some(name => 
      name.includes('Deep-UI/') || 
      name.includes('dark-ui/') ||
      name.includes('Dark-UI/')
    );
    
    if (hasDeepUiPattern) {
      return TemplateType.DARK_UI;
    }
    
    return TemplateType.LIGHT_UI;
  }

  public static async detectThemeTypeFromDir(dirPath: string): Promise<ThemeDetectionResult> {
    const structure = ThemeDetector.extractStructureInfoFromDir(dirPath);
    const templateType = ThemeDetector.detectTemplateTypeFromDir(dirPath);

    if (structure.keyFiles.some(f => f.includes('meta.json') && f.includes('login'))) {
      return {
        type: ThemeType.LOGIN_PACKAGE,
        templateType,
        hasScssSource: false,
        structure
      };
    }

    if (structure.keyFiles.some(f => f.includes('scss/lib/vars.scss'))) {
      const hasV12Patterns = structure.keyFiles.some(f => 
        f.includes('icon/l/') || f.includes('images/hr/icon/')
      );
      return {
        type: hasV12Patterns ? ThemeType.V12_SCSS : ThemeType.V17_SCSS,
        templateType,
        hasScssSource: true,
        structure
      };
    }

    if (structure.keyFiles.some(f => f.includes('android_theme/') && f.includes('ios_theme/'))) {
      return {
        type: ThemeType.KK_PACKAGE,
        templateType,
        hasScssSource: false,
        structure
      };
    }

    if (structure.keyFiles.some(f => f.endsWith('index.js') && f.includes('static'))) {
      return {
        type: ThemeType.MK_GREEN,
        templateType,
        hasScssSource: false,
        structure
      };
    }

    return {
      type: ThemeType.LOGIN_PACKAGE,
      templateType,
      hasScssSource: false,
      structure
    };
  }

  private static extractStructureInfoFromDir(dirPath: string): {
    rootFiles: string[];
    directories: string[];
    keyFiles: string[];
  } {
    const items = fsSync.readdirSync(dirPath);
    const filePaths: string[] = [];
    const dirPaths: string[] = [];

    for (const item of items) {
      if (item.startsWith('.')) continue;
      const fullPath = path.join(dirPath, item);
      const stat = fsSync.statSync(fullPath);
      if (stat.isDirectory()) {
        dirPaths.push(item);
        const subItems = fsSync.readdirSync(fullPath);
        for (const subItem of subItems) {
          if (subItem.startsWith('.')) continue;
          const subPath = path.join(fullPath, subItem);
          const subStat = fsSync.statSync(subPath);
          if (subStat.isDirectory()) {
            dirPaths.push(`${item}/${subItem}`);
          } else {
            filePaths.push(`${item}/${subItem}`);
          }
        }
      } else {
        filePaths.push(item);
      }
    }

    const keyFiles = filePaths.filter(f => 
      f.includes('meta.json') || 
      f.includes('login.jsp') || 
      f.includes('scss/lib/vars.scss') ||
      f.includes('style/') ||
      f.includes('android_theme/') ||
      f.includes('ios_theme/') ||
      f === 'index.js'
    );

    return {
      rootFiles: filePaths,
      directories: dirPaths,
      keyFiles: [...new Set(keyFiles)]
    };
  }

  private static detectTemplateTypeFromDir(dirPath: string): TemplateType {
    const items = fsSync.readdirSync(dirPath, { withFileTypes: true });
    const dirNames = items.filter(i => i.isDirectory()).map(i => i.name);
    
    const hasDarkUiPattern = dirNames.some(name => 
      name.includes('Deep-UI') || 
      name.includes('dark-ui') ||
      name.includes('Dark-UI')
    );
    
    if (hasDarkUiPattern) {
      return TemplateType.DARK_UI;
    }
    
    return TemplateType.LIGHT_UI;
  }
}

export const detectThemeType = ThemeDetector.detectThemeType;
export const detectThemeTypeFromDir = ThemeDetector.detectThemeTypeFromDir;