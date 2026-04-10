#!/usr/bin/env node

/**
 * generate-manifest.mjs
 * 
 * 从 colors/{name}.json 自动生成 manifest.json
 * 支持 Light-UI 和 Dark-UI 两种模板类型
 * 
 * 用法：
 *   node scripts/generate-manifest.mjs {主题名}
 *   node scripts/generate-manifest.mjs national-day
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

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
  
  const isDarkUI = effectiveTemplateType === 'dark-ui';

  // 构建 globalColors - 支持 Light-UI 和 Dark-UI
  const globalColors = {
    templateType: effectiveTemplateType,
    primary: colors.colors.primary,
    primaryHover: colors.colors.primaryHover,
    alterColor: colors.colors.alterColor,
    alterColorHoverOn: colors.colors.alterColorHoverOn,
    primaryOpacity10: colors.colors.primaryOpacity10 || (colors.colors.primary + '1A'),
    primaryOpacity20: colors.colors.primaryOpacity20 || (colors.colors.primary + '33'),
    primaryOpacity30: colors.colors.primaryOpacity30 || (colors.colors.primary + '4D'),
    headerFontColor: colors.colors.headerFont || (isDarkUI ? '#FFE4CF' : '#333333'),
    headerFontColorHover: '#ffffff',
    portalHeaderBgExtendColor: colors.colors.alterColor,
    portalHeaderPureExtendColor: colors.colors.alterColor,
    portalHeaderComplexBgExtendColor: colors.colors.alterColor,
    portalHeaderComplexPureExtendColor: isDarkUI ? colors.colors.primary : colors.colors.alterColor,
    portalHeaderFontColor: '$header-font-color',
    portalHeaderFontColorHover: '$primary-color',
    portalHeaderSimpleBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.colors.alterColor,
    portalHeaderSimpleFontColorHover: isDarkUI ? '$primary-color' : '#ffffff',
    portalHeaderSimpleFontColorTop: isDarkUI ? '#FFE4CF' : '#333333',
    portalHeaderSimplePureExtendColor: isDarkUI ? colors.colors.primary : colors.colors.alterColor,
    portalHeaderZoneBgExtendColor: colors.colors.alterColor,
    portalHeaderZoneFontColor: isDarkUI ? '$header-font-color' : '#333333',
    portalHeaderZoneFontColorHover: isDarkUI ? '$primary-color' : '#cccccc',
    loginBgColor: colors.colors.alterColor,
    sidebarColor: '#2A2045',
    sidebarIconColor: colors.colors.primaryHover,
    sidebarIconColorHover: '#ffffff',
    sidebarPanelBg: isDarkUI ? (colors.colors.headerFont || '#FFE4CF') : '#FFFFFF',
    sidebarAccordionPanelFont: isDarkUI ? (colors.colors.headerFont || '#FFE4CF') : '#333333',
    sidebarAccordionPanelHeaderBg: isDarkUI ? colors.colors.primary : 'transparent',
    sidebarAccordionPanelHeaderBgOn: colors.colors.primary,
    sidebarItemCurrentColor: isDarkUI ? '#fff' : '#333333',
    sidebarItemCurrentHex: colors.colors.alterColor,
    searchFontColor: isDarkUI ? (colors.colors.headerFont || '$header-font-color') : colors.colors.headerFont,
    searchInputBorderColor: colors.colors.headerFont || colors.colors.primary,
    searchPlaceholdFontColor: colors.colors.headerFont || colors.colors.primary,
    auxiliaryGray: '#999999',
    auxiliaryGrayDark: '#666666',
    bodyBgColor: '#F8F8F8',
    hoverBgColor: '#f8f8f8',
    linkText: colors.colors.primary,
    linkTextOn: colors.colors.alterColor,
    borderColor: '#eeeeee',
    borderIconColor: '#eeeeee',
    loginPrimaryColor: colors.colors.primaryHover,
    loginPrimaryHover: colors.colors.headerFont || '#ffffff',
    lightPrimaryColorHover: isDarkUI ? '$primary-color-hover' : '$primary-color',
    singleHeaderBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.colors.alterColor,
    singleHeaderFontColor: isDarkUI ? '$header-font-color' : '#333333',
    singleHeaderFontColorHover: isDarkUI ? '$primary-color' : '#ffffff',
    tlayoutHeaderBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.colors.alterColor,
    tlayoutHeaderFontColor: isDarkUI ? '$header-font-color' : '#333333',
    tlayoutHeaderFontColorHover: isDarkUI ? '$primary-color' : '#cccccc',
  };

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
  const requiredFiles = ['bg-login.jpg', 'header-banner.png', 'header_tlayout_frame_bg.png', 'header_complex_frame_bg.png', 'header_simple_frame_bg.png', 'header_menu_frame_bg.png', 'header-sideheader.png', 'header_single_menu_frame_bg.png', 'desktop.png', 'layout-banner.jpg', 'login_thumb.jpg', 'login_bg/thumb-1.jpg', 'login_bg/thumb-2.jpg'];
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
  const sourceImages = {
    templateType: effectiveTemplateType,
    nameEn: colors.nameEn,
    penFile: '', // Will be set when pen file is created
    headerBanner: img('header-banner.png'),
    headerComplex: img('header_complex_frame_bg.png'),
    headerSimple: img('header_tlayout_frame_bg.png'),
    headerSimpleFrame: img('header_simple_frame_bg.png'),
    headerTabs: img('header_tlayout_frame_bg.png'),
    headerSideheader: img('header-sideheader.png'),
    headerSingleMenuFrameBg: img('header_single_menu_frame_bg.png'),
    headerMenu: img('header_menu_frame_bg.png'),
    headerZoneFrameBg: img('header_zone_frame_bg.png'),
    headerZoneNavFrameBg: img('header_zone_nav_frame_bg.png'),
    loginBg: img('bg-login.jpg'),
    loginThumb: img('login_thumb.jpg'),
    loginBgThumb1: img('login_bg/thumb-1.jpg'),
    loginBgThumb2: img('login_bg/thumb-2.jpg'),
    desktop: img('desktop.png'),
    layoutBanner: img('layout-banner.jpg'),
    headerClassic: img('header_complex_frame_bg.png'),
    headerSimplePng: img('header_tlayout_frame_bg.png'),
    headerIcon: img('header_tlayout_frame_bg.png'),
    headerTabsPng: img('header_tlayout_frame_bg.png'),
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
