#!/usr/bin/env node

/**
 * ⚠️ LEGACY / 历史工具链
 *
 * generate-manifest.mjs
 * 
 * 从 colors/{name}.json 自动生成 manifest.json
 * 支持 Light-UI 和 Dark-UI 两种模板类型
 *
 * 当前 Theme Studio Web 主链路不再依赖该脚本作为主要入口，
 * 保留它仅用于历史工具链兼容和参考。
 * 
 * 用法：
 *   node scripts/generate-manifest.mjs {主题名}
 *   node scripts/generate-manifest.mjs national-day
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { REQUIRED_EXPORT_FILES, buildSourceImageFileMap } from './lib/export-asset-rules.mjs';
import { buildGlobalColors } from './lib/build-global-colors.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const THEMES_LIST = [
  { name: '主体-MK', suffix: '-zhuti-mk', zip: 'assets/references/samples/主题样例包/主题-MK-2026清明主题.zip' },
  { name: '主体-V12', suffix: '-zhuti-v12', zip: 'assets/references/samples/主题样例包/主题-V12-2026清明主题.zip', scssCompile: true },
  { name: '主体-V13~V13.5', suffix: '-zhuti-v13', zip: 'assets/references/samples/主题样例包/主题-V13〜V13.5-2026清明主题.zip', scssCompile: true },
  { name: '主体-V14~V16', suffix: '-zhuti-v14', zip: 'assets/references/samples/主题样例包/主题-V14〜V16-2026清明主题.zip', scssCompile: true },
  { name: '主体-V17', suffix: '-zhuti-v17', zip: 'assets/references/samples/主题样例包/主题-V17-2026清明主题.zip', scssCompile: true },
  { name: '登录-MK', suffix: '-denglu-mk', zip: 'assets/references/samples/主题样例包/登录-MK-2026清明.zip' },
  { name: '登录-V12', suffix: '-denglu-v12', zip: 'assets/references/samples/主题样例包/登录-V12-2026清明.zip' },
  { name: '登录-V13', suffix: '-denglu-v13', zip: 'assets/references/samples/主题样例包/登录-V13-2026清明.zip' },
  { name: '登录-V13.5', suffix: '-denglu-v13.5', zip: 'assets/references/samples/主题样例包/登录-V13.5-2026清明.zip' },
  { name: '登录-V14', suffix: '-denglu-v14', zip: 'assets/references/samples/主题样例包/登录-V14-2026清明.zip' },
  { name: '登录-V15', suffix: '-denglu-v15', zip: 'assets/references/samples/主题样例包/登录-V15-2026清明.zip' },
  { name: '登录-V16', suffix: '-denglu-v16', zip: 'assets/references/samples/主题样例包/登录-V16-2026清明.zip' },
  { name: '登录-V17', suffix: '-denglu-v17', zip: 'assets/references/samples/主题样例包/登录-V17-2026清明.zip' },
];

async function generateManifest(themeName) {
  const colorsPath = path.join(rootDir, 'colors', `${themeName}.json`);
  
  if (!await fs.pathExists(colorsPath)) {
    console.error(`❌ 配色文件不存在: ${colorsPath}`);
    console.error('可用配色方案:');
    const files = await fs.readdir(path.join(rootDir, 'colors'));
    files.filter(f => f.endsWith('.json')).forEach(f => {
      console.error(`  - ${f.replace('.json', '')}`);
    });
    process.exit(1);
  }

  const colors = await fs.readJson(colorsPath);
  const effectiveTemplateType = colors.templateType || 'light-ui';
  
  const globalColors = buildGlobalColors(colors.colors, effectiveTemplateType);

  // 查找图片目录
  // 优先使用实际存在的目录，而不是硬编码推断
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const candidateDirs = [
    path.join(rootDir, 'output', `${dateStr}-${colors.name}`, '素材包'),
    path.join(rootDir, 'output', `${dateStr}-${colors.nameEn || colors.name}`, '素材包'),
    path.join(rootDir, 'output', colors.name, '素材包'),
    path.join(rootDir, 'output', colors.nameEn || colors.name, '素材包'),
  ];

  let imageBaseDir = null;
  for (const dir of candidateDirs) {
    if (await fs.pathExists(dir)) {
      imageBaseDir = dir;
      break;
    }
  }
  if (!imageBaseDir) {
    console.error(`❌ 素材包目录不存在`);
    console.error('已搜索的路径:');
    candidateDirs.forEach(d => console.error(`  - ${d}`));
    process.exit(1);
  }

  console.log(`📂 素材包: ${imageBaseDir}`);
  // 验证关键素材是否存在
  const requiredFiles = REQUIRED_EXPORT_FILES;
  const missingFiles = [];
  for (const f of requiredFiles) {
    if (!await fs.pathExists(path.join(imageBaseDir, f))) {
      missingFiles.push(f);
    }
  }
  if (missingFiles.length > 0) {
    console.error(`❌ 素材包缺失 ${missingFiles.length} 个文件:`);
    missingFiles.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`✅ 素材包验证通过: ${requiredFiles.length}/${requiredFiles.length} 个文件存在`);

  // 构建 sourceImages
  const img = (name) => path.join(imageBaseDir, name);
  const sourceImageFiles = buildSourceImageFileMap();
  const sourceImages = {
    templateType: effectiveTemplateType,
    nameEn: colors.nameEn,
    penFile: '', // Will be set when pen file is created
    headerBanner: img(sourceImageFiles.headerBanner),
    headerComplex: img(sourceImageFiles.headerComplex),
    headerSimple: img(sourceImageFiles.headerSimple),
    headerSimpleFrame: img(sourceImageFiles.headerSimpleFrame),
    headerTabs: img(sourceImageFiles.headerTabs),
    headerSideheader: img(sourceImageFiles.headerSideheader),
    headerSingleMenuFrameBg: img(sourceImageFiles.headerSingleMenuFrameBg),
    headerMenu: img(sourceImageFiles.headerMenu),
    headerZoneFrameBg: img(sourceImageFiles.headerZoneFrameBg),
    headerZoneNavFrameBg: img(sourceImageFiles.headerZoneNavFrameBg),
    loginBg: img(sourceImageFiles.loginBg),
    loginThumb: img(sourceImageFiles.loginThumb),
    loginBgThumb1: img(sourceImageFiles.loginBgThumb1),
    loginBgThumb2: img(sourceImageFiles.loginBgThumb2),
    desktop: img(sourceImageFiles.desktop),
    layoutBanner: img(sourceImageFiles.layoutBanner),
    headerClassic: img(sourceImageFiles.headerClassic),
    headerSimplePng: img(sourceImageFiles.headerSimplePng),
    headerIcon: img(sourceImageFiles.headerIcon),
    headerTabsPng: img(sourceImageFiles.headerTabsPng),
  };

  // 构建 themes
  const themes = THEMES_LIST.map(t => ({
    name: `${colors.name}-${t.name}`,
    nameEn: `${colors.nameEn}${t.suffix}`,
    templateType: effectiveTemplateType,
    zip: t.zip,
    enabled: true,
    scssCompile: t.scssCompile || false,
  }));

  const themeFolderName = `${dateStr}-${colors.name}`;

  const manifest = {
    version: '1.0',
    name: colors.name,
    nameEn: colors.nameEn || themeName,
    description: colors.description || `${colors.name}主题`,
    templateType: effectiveTemplateType,
    globalColors,
    sourceImages,
    themes,
    outputDir: `output/${themeFolderName}/输出包`,
    options: {
      preserveOriginal: true,
      generateHighRes: true,
      verbose: true,
    },
  };

  const outputPath = path.join(rootDir, 'manifest.json');
  await fs.writeJson(outputPath, manifest, { spaces: 2 });
  
  console.log(`✅ manifest.json 已生成: ${outputPath}`);
  console.log(`   主题: ${colors.name}`);
  console.log(`   模板: ${effectiveTemplateType}`);
  console.log(`   主题包数量: ${themes.length}`);
}

const themeName = process.argv[2];

if (!themeName) {
  console.error('用法: node scripts/generate-manifest.mjs {主题名}');
  console.error('示例: node scripts/generate-manifest.mjs national-day');
  process.exit(1);
}

generateManifest(themeName).catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
