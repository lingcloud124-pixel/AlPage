import * as fs from 'fs-extra';
import * as fsSync from 'fs';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface MetadataUpdateResult {
  success: boolean;
  updatedFiles: string[];
  renamedFiles: string[];
  errors: string[];
}

export interface ThemeMetadataMapping {
  oldId: string;
  newId: string;
  oldName: string;
  newName: string;
  oldTitle: string;
  newTitle: string;
  oldDesc: string;
  newDesc: string;
  oldPath?: string;
  newPath?: string;
}

/**
 * Converts Chinese/English name to a URL-safe ID format
 * For V12+ themes (which use underscores): converts to underscore format
 * For MK/登录 themes (which use hyphens): converts to hyphen format
 */
function nameToId(name: string, useUnderscore: boolean): string {
  const sep = useUnderscore ? '_' : '-';
  
  // Split name into parts: 三亚旅游, 主体, V12  or 三亚旅游, 登录, MK
  const parts = name.split('-');
  
  // Convert Chinese parts to pinyin
  const convertedParts: string[] = [];
  const pinyinMap: Record<string, string> = {
    '三': 'san', '亚': 'ya', '旅': 'lu', '游': 'you',
    '清': 'qing', '明': 'ming', '主': 'zhu', '体': 'ti',
    '登': 'deng', '录': 'lu', 
    '泰': 'tai', '山': 'shan', '顶': 'ding', '年': 'nian', '轻': 'qing', '人': 'ren'
  };
  
  for (const part of parts) {
    // Check if it's a version like V12, V13, etc.
    if (/^V\d+/i.test(part)) {
      convertedParts.push(part.toLowerCase());
    } else if (/MK$/i.test(part)) {
      convertedParts.push('mk');
    } else {
      // Chinese or English text - convert Chinese to pinyin
      const converted = part
        .replace(/[\u4e00-\u9fa5]/g, (char: string) => pinyinMap[char] || char)
        .toLowerCase();
      convertedParts.push(converted);
    }
  }
  
  return convertedParts.join(sep);
}

/**
 * Generates metadata mapping from manifest theme name
 */
function generateMetadataMapping(themeName: string, manifestName: string, manifestDesc: string): ThemeMetadataMapping {
  // For the old ID pattern, we need to infer it from the theme name
  // MK主体 themes use "mk-festival-26-qingm" (hyphenated)
  // 登录 themes use "login26-festival-qingm" (hyphenated)
  // V12/V13/V14/V16/V17 themes use "festival_26_qingm" (underscored)
  let oldId: string;
  let oldPath: string;
  let useUnderscore: boolean;
  
  if (themeName.includes('登录')) {
    oldId = 'login26-festival-qingm';
    oldPath = '/ui-ext/login26-festival-qingm/';
    useUnderscore = false;
  } else if (themeName.includes('V12') || themeName.includes('V13') || themeName.includes('V14') || themeName.includes('V16') || themeName.includes('V17')) {
    oldId = 'festival_26_qingm';
    oldPath = '/ui-ext/festival_26_qingm/';
    useUnderscore = true;
  } else {
    // MK主体
    oldId = 'mk-festival-26-qingm';
    oldPath = undefined as any;
    useUnderscore = false;
  }
  
  // Generate new ID with proper format
  const newId = nameToId(manifestName, useUnderscore);
  const newPath = oldPath 
    ? oldPath.replace('festival_26_qingm', newId)
    : undefined;
  
  // Determine prefix based on theme type
  const isLogin = themeName.includes('登录');
  const oldPrefix = isLogin ? '@user-login/' : '@user-theme/';
  const newPrefix = isLogin ? '@user-login/' : '@user-theme/';
  
  return {
    oldId,
    newId,
    oldName: `${oldPrefix}${oldId}`,
    newName: `${newPrefix}${newId}`,
    oldTitle: '26清明',
    newTitle: manifestName.split('-')[0], // "三亚旅游"
    oldDesc: '26清明',
    newDesc: manifestDesc.split('-')[0],
    oldPath,
    newPath
  };
}

export class MetadataUpdater {
  
  /**
   * Update metadata in a theme zip file
   * @param zipPath - Path to the theme zip file
   * @param themeName - Theme name from manifest
   * @param manifestName - Full manifest theme name
   * @param manifestDesc - Theme description
   * @returns MetadataUpdateResult
   */
  async updateMetadata(
    zipPath: string,
    themeName: string,
    manifestName: string,
    manifestDesc: string
  ): Promise<MetadataUpdateResult> {
    const result: MetadataUpdateResult = {
      success: false,
      updatedFiles: [],
      renamedFiles: [],
      errors: []
    };
    
    const mapping = generateMetadataMapping(themeName, manifestName, manifestDesc);
    const tempDir = path.join(tmpdir(), `metadata-updater-${uuidv4()}`);
    
    try {
      if (!fsSync.existsSync(zipPath)) {
        throw new Error(`Theme zip file not found: ${zipPath}`);
      }
      
      await fs.ensureDir(tempDir);
      
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);
      
      // Find the theme directory inside
      const entries = zip.getEntries();
      let themeDirName = '';
      let themeDirPath = '';
      
      for (const entry of entries) {
        if (entry.isDirectory) {
          const name = path.basename(entry.entryName);
          // Check if this looks like a theme directory
          if (name.includes('festival') || name.includes('qingm') || 
              name.includes('login26') || name.includes('26-qingm')) {
            themeDirName = name;
            themeDirPath = path.join(tempDir, name);
            break;
          }
        }
      }
      
      if (!themeDirName) {
        // For V12+ themes with flat structure, check if design-xml/theme.xml exists directly in tempDir
        const v12StylePath = path.join(tempDir, 'design-xml', 'theme.xml');
        if (fsSync.existsSync(v12StylePath)) {
          // V12+ flat structure - use tempDir directly
          themeDirName = '';
          themeDirPath = tempDir;
        } else {
          // Try to find any directory that might be the theme dir
          const items = fsSync.readdirSync(tempDir);
          for (const item of items) {
            const fullPath = path.join(tempDir, item);
            if (fsSync.statSync(fullPath).isDirectory()) {
              themeDirName = item;
              themeDirPath = fullPath;
              break;
            }
          }
        }
      }
      
      // themeDirPath is only empty if nothing was found at all
      if (!themeDirPath) {
        throw new Error('Could not find theme directory in zip');
      }
      
      // Rename the directory if it contains old theme ID
      // Order matters: match longest patterns first!
      // Handle both hyphen and underscore formats, and qingm/qingming variants
      if (themeDirName.match(/festival|qingm|qingming|login26|26/)) {
        let newDirName = themeDirName;
        
        // Login themes: login_26_festival_qingming -> login-sanya_lu_you_deng_lu_v12 (underscore for V12)
        // Note: qingming must come before qingm in alternation to match longer first
        if (/login[_-]?26[-_]?festival[_-]?(qingming|qingm)/i.test(themeDirName)) {
          newDirName = themeDirName.replace(/login[_-]?26[-_]?festival[_-]?(qingming|qingm)/gi, `login-${mapping.newId}`);
        }
        // MK themes: mk-festival-26-qingm -> sanya-lu-you-zhuti-mk (hyphen for MK)
        else if (/mk-festival-26-qingm/i.test(themeDirName)) {
          newDirName = themeDirName.replace(/mk-festival-26-qingm/gi, mapping.newId);
        }
        // V12+ themes: festival_26_qingm -> sanya_lu_you_zhuti_v12 (underscore)
        else if (/festival[_-]?26[-_]?(qingm|qingming)/i.test(themeDirName)) {
          newDirName = themeDirName.replace(/festival[_-]?26[-_]?(qingm|qingming)/gi, mapping.newId);
        }
        // Fallback: just replace any remaining 26-qingm patterns
        else if (/26[-_]?(qingm|qingming)/i.test(themeDirName)) {
          newDirName = themeDirName.replace(/26[-_]?(qingm|qingming)/gi, mapping.newId);
        }
        
        if (newDirName !== themeDirName) {
          const newDirPath = path.join(tempDir, newDirName);
          await fs.move(themeDirPath, newDirPath);
          result.renamedFiles.push(`${themeDirName} -> ${newDirName}`);
          themeDirName = newDirName;
          themeDirPath = newDirPath;
        }
      }
      
      // Update meta.json
      const metaJsonPath = path.join(themeDirPath, 'meta.json');
      if (fsSync.existsSync(metaJsonPath)) {
        const metaResult = await this.updateMetaJson(metaJsonPath, mapping);
        result.updatedFiles.push(...metaResult);
      }
      
      // Update index.json
      const indexJsonPath = path.join(themeDirPath, 'index.json');
      if (fsSync.existsSync(indexJsonPath)) {
        const indexResult = await this.updateIndexJson(indexJsonPath, mapping);
        result.updatedFiles.push(...indexResult);
      }
      
      // Update config.json
      const configJsonPath = path.join(themeDirPath, 'config.json');
      if (fsSync.existsSync(configJsonPath)) {
        const configResult = await this.updateConfigJson(configJsonPath, mapping);
        result.updatedFiles.push(...configResult);
      }
      
      // Update config.ini (login themes V14+)
      const configIniPath = path.join(themeDirPath, 'config.ini');
      if (fsSync.existsSync(configIniPath)) {
        const iniResult = await this.updateConfigIni(configIniPath, mapping);
        result.updatedFiles.push(...iniResult);
      }
      
      // Update ui.ini (V12+ themes)
      const uiIniPath = path.join(themeDirPath, 'ui.ini');
      if (fsSync.existsSync(uiIniPath)) {
        const uiIniResult = await this.updateUiIni(uiIniPath, mapping);
        result.updatedFiles.push(...uiIniResult);
      }
      
      // Update login.jsp (login themes V12+)
      const loginJspPath = path.join(themeDirPath, 'login.jsp');
      if (fsSync.existsSync(loginJspPath)) {
        const jspResult = await this.updateLoginJsp(loginJspPath, mapping);
        result.updatedFiles.push(...jspResult);
      }
      
      // Handle login.jsp at root level (some V12+ extraction structures)
      const loginJspRootPath = path.join(tempDir, 'login.jsp');
      if (fsSync.existsSync(loginJspRootPath)) {
        const jspRootResult = await this.updateLoginJsp(loginJspRootPath, mapping);
        result.updatedFiles.push(...jspRootResult);
      }
      
      // Update login_single_random.jsp (V13/V13.5 login themes)
      const loginRandomJspPath = path.join(themeDirPath, 'login_single_random.jsp');
      if (fsSync.existsSync(loginRandomJspPath)) {
        const jspResult = await this.updateLoginJsp(loginRandomJspPath, mapping);
        result.updatedFiles.push(...jspResult);
      }
      
      // Update readme.txt
      const readmePath = path.join(themeDirPath, 'readme.txt');
      if (fsSync.existsSync(readmePath)) {
        const readmeResult = await this.updateReadmeTxt(readmePath, mapping);
        result.updatedFiles.push(...readmeResult);
      }
      
      // Handle readme.txt at root level
      const readmeRootPath = path.join(tempDir, 'readme.txt');
      if (fsSync.existsSync(readmeRootPath)) {
        const readmeRootResult = await this.updateReadmeTxt(readmeRootPath, mapping);
        result.updatedFiles.push(...readmeRootResult);
      }
      
      // Update index.js (MK themes - compiled JS with module names)
      const indexJsPath = path.join(themeDirPath, 'index.js');
      if (fsSync.existsSync(indexJsPath)) {
        const jsResult = await this.updateIndexJs(indexJsPath, mapping);
        result.updatedFiles.push(...jsResult);
      }
      
      // Update style.css (login themes - CSS class names)
      const styleCssPath = path.join(themeDirPath, 'style.css');
      if (fsSync.existsSync(styleCssPath)) {
        const cssResult = await this.updateStyleCss(styleCssPath, mapping);
        result.updatedFiles.push(...cssResult);
      }
      
      // Update data.json (contains module IDs)
      const dataJsonPath = path.join(themeDirPath, 'data.json');
      if (fsSync.existsSync(dataJsonPath)) {
        const dataResult = await this.updateDataJson(dataJsonPath, mapping);
        result.updatedFiles.push(...dataResult);
      }
      
      // Update sample.json
      const sampleJsonPath = path.join(themeDirPath, 'sample', 'sample.json');
      if (fsSync.existsSync(sampleJsonPath)) {
        const sampleResult = await this.updateSampleJson(sampleJsonPath, mapping);
        result.updatedFiles.push(...sampleResult);
      }
      
      // Rename thumbnail files
      const thumbnailDir = path.join(themeDirPath, 'sample', 'thumbnail');
      if (fsSync.existsSync(thumbnailDir)) {
        const renameResult = await this.renameThumbnails(thumbnailDir, mapping);
        result.renamedFiles.push(...renameResult);
      }
      
      // For V12+ themes, update theme.xml
      const themeXmlPath = path.join(themeDirPath, 'design-xml', 'theme.xml');
      if (fsSync.existsSync(themeXmlPath)) {
        const xmlResult = await this.updateThemeXml(themeXmlPath, mapping);
        result.updatedFiles.push(...xmlResult);
      }
      
      // Repackage the zip
      const outputZip = new AdmZip();
      const addFilesToZip = (dir: string, zipPathPrefix = '') => {
        const items = fsSync.readdirSync(dir);
        for (const item of items) {
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
      
      // Determine output path - same as input but with "-updated" suffix, or overwrite
      const dirName = path.dirname(zipPath);
      const baseName = path.basename(zipPath, '.zip');
      const updatedZipPath = path.join(dirName, `${baseName}-updated.zip`);
      outputZip.writeZip(updatedZipPath);
      
      // Replace original with updated
      await fs.remove(zipPath);
      await fs.move(updatedZipPath, zipPath);
      
      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Error updating metadata: ${(error as Error).message}`);
    } finally {
      try {
        if (fsSync.existsSync(tempDir)) {
          await fs.remove(tempDir);
        }
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp directory: ${(cleanupError as Error).message}`);
      }
    }
    
    return result;
  }
  
  private async updateMetaJson(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Update name field
      if (content.includes(mapping.oldName)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldName), 'g'), mapping.newName);
        modified = true;
      }
      
      // Update title zh-cn (more flexible to match "26清明" or "2026清明主题" etc.)
      // Handle both spaced and compact JSON: "zh-cn": "..." or "zh-cn":"..."
      if (content.includes('清明')) {
        content = content.replace(
          /"zh-cn"\s*:\s*"[^"]*清明[^"]*"/g,
          `"zh-cn": "${mapping.newTitle}"`
        );
        modified = true;
      }
      
      // Update desc zh-cn
      if (content.includes(`"zh-cn": "${mapping.oldDesc}"`)) {
        content = content.replace(
          new RegExp(`"zh-cn": "${this.escapeRegex(mapping.oldDesc)}"`, 'g'),
          `"zh-cn": "${mapping.newDesc}"`
        );
        modified = true;
      }
      
      // Update variants name
      const oldVariantName = mapping.oldName + '~simple';
      const newVariantName = mapping.newName + '~simple';
      if (content.includes(oldVariantName)) {
        content = content.replace(new RegExp(this.escapeRegex(oldVariantName), 'g'), newVariantName);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating meta.json: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateIndexJson(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Update name field
      if (content.includes(mapping.oldName)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldName), 'g'), mapping.newName);
        modified = true;
      }
      
      // Update title zh-cn (more flexible to match "26清明" or "2026清明主题" etc.)
      if (content.includes('清明')) {
        content = content.replace(
          /"zh-cn": "[^"]*清明[^"]*"/g,
          `"zh-cn": "${mapping.newTitle}"`
        );
        modified = true;
      }
      
      // Update skins array name
      if (content.includes(`"name": "${mapping.oldName}~simple"`)) {
        content = content.replace(
          new RegExp(`"name": "${this.escapeRegex(mapping.oldName)}~simple"`, 'g'),
          `"name": "${mapping.newName}~simple"`
        );
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating index.json: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateConfigJson(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Update name field
      if (content.includes(mapping.oldName)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldName), 'g'), mapping.newName);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating config.json: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateConfigIni(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes('清明')) {
        content = content.replace(/name=[^\n]*/g, (match) => {
          if (match.includes('清明')) {
            return `name=${mapping.newTitle}`;
          }
          return match;
        });
        modified = true;
      }
      
      if (content.includes('qingm') || content.includes('qingming')) {
        content = content.replace(/id=[^\n]*/g, (match) => {
          if (match.includes('qingm') || match.includes('qingming')) {
            return `id=${mapping.newId}`;
          }
          return match;
        });
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating config.ini: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateUiIni(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes('qingm') || content.includes('qingming')) {
        content = content.replace(/id=[^\n]*/g, (match) => {
          if (match.includes('qingm') || match.includes('qingming')) {
            return `id=${mapping.newId}`;
          }
          return match;
        });
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating ui.ini: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateLoginJsp(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes('清明')) {
        content = content.replace(/清明/g, mapping.newTitle);
        modified = true;
      }
      
      if (content.includes('login_26_festival_qingming')) {
        content = content.replace(/login_26_festival_qingming/g, mapping.newId);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating login.jsp: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateReadmeTxt(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes('清明')) {
        content = content.replace(/清明/g, mapping.newTitle);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating readme.txt: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateSampleJson(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Update thumbnail references in sample.json
      if (content.includes(mapping.oldId)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldId), 'g'), mapping.newId);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating sample.json: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateIndexJs(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes(mapping.oldName)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldName), 'g'), mapping.newName);
        modified = true;
      }
      
      if (content.includes('login26-festival-qingm')) {
        content = content.replace(/login26-festival-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (content.includes('mk-festival-26-qingm')) {
        content = content.replace(/mk-festival-26-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (content.includes('qingm')) {
        content = content.replace(/qingm/g, '');
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating index.js: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateStyleCss(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes('login26-festival-qingm')) {
        content = content.replace(/login26-festival-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (content.includes('mk-festival-26-qingm')) {
        content = content.replace(/mk-festival-26-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating style.css: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async updateDataJson(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      if (content.includes(mapping.oldName)) {
        content = content.replace(new RegExp(this.escapeRegex(mapping.oldName), 'g'), mapping.newName);
        modified = true;
      }
      
      if (content.includes('login26-festival-qingm')) {
        content = content.replace(/login26-festival-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (content.includes('mk-festival-26-qingm')) {
        content = content.replace(/mk-festival-26-qingm/g, mapping.newId);
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating data.json: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private async renameThumbnails(thumbnailDir: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const renamedFiles: string[] = [];
    
    try {
      const files = fsSync.readdirSync(thumbnailDir);
      
      for (const file of files) {
        if (file === '.DS_Store') continue;
        
        let newFileName = file;
        
        // Replace old theme ID with new in filenames
        if (file.includes(mapping.oldId)) {
          newFileName = file.replace(new RegExp(this.escapeRegex(mapping.oldId), 'g'), mapping.newId);
        } else if (file.includes('mk-festival-26-qingm')) {
          newFileName = file.replace(/mk-festival-26-qingm/g, mapping.newId);
        } else if (file.includes('login26-festival-qingm')) {
          newFileName = file.replace(/login26-festival-qingm/g, `login-${mapping.newId}`);
        }
        
        if (newFileName !== file) {
          const oldPath = path.join(thumbnailDir, file);
          const newPath = path.join(thumbnailDir, newFileName);
          await fs.move(oldPath, newPath);
          renamedFiles.push(`${file} -> ${newFileName}`);
        }
      }
    } catch (error) {
      throw new Error(`Error renaming thumbnails: ${(error as Error).message}`);
    }
    
    return renamedFiles;
  }
  
  private async updateThemeXml(filePath: string, mapping: ThemeMetadataMapping): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    try {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Update theme id (V12 uses underscores in IDs)
      const newXmlId = mapping.newId.includes('-') ? mapping.newId.replace(/-/g, '_') : mapping.newId;
      if (content.includes(`id="${mapping.oldId}"`)) {
        content = content.replace(
          new RegExp(`id="${this.escapeRegex(mapping.oldId)}"`, 'g'),
          `id="${newXmlId}"`
        );
        modified = true;
      }
      
      // Update theme name (more flexible pattern to match "2026清明主题" etc.)
      if (content.includes('清明')) {
        content = content.replace(
          /name="[^"]*清明[^"]*"/g,
          `name="${mapping.newTitle}"`
        );
        modified = true;
      }
      
      // Update theme path
      if (mapping.oldPath && mapping.newPath && content.includes(`path="${mapping.oldPath}"`)) {
        content = content.replace(
          new RegExp(`path="${this.escapeRegex(mapping.oldPath)}"`, 'g'),
          `path="${mapping.newPath}"`
        );
        modified = true;
      }
      
      // Update thumb path
      if (content.includes(`thumb="/ui-ext/${mapping.oldId}/thumb.jpg"`)) {
        content = content.replace(
          new RegExp(`thumb="/ui-ext/${this.escapeRegex(mapping.oldId)}/thumb.jpg"`, 'g'),
          `thumb="/ui-ext/${newXmlId}/thumb.jpg"`
        );
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        updatedFiles.push(filePath);
      }
    } catch (error) {
      throw new Error(`Error updating theme.xml: ${(error as Error).message}`);
    }
    
    return updatedFiles;
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}