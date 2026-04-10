#!/usr/bin/env node

/**
 * verify-theme.mjs
 * 
 * 验证主题完整性
 * 
 * 用法：
 *   node scripts/verify-theme.mjs {主题名}
 *   node scripts/verify-theme.mjs panda-night
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const REQUIRED_IMAGES = [
  'bg-login.jpg',
  'background.png',
  'header-banner.png',
  'header_tlayout_frame_bg.png',
  'header_complex_frame_bg.png',
  'header_menu_frame_bg.png',
  'header-sideheader.png',
];

const IMAGE_SIZES = {
  'bg-login.jpg': { width: 2215, height: 1080 },
  'background.png': { width: 1920, height: 1080 },
  'header-banner.png': { width: 2560, height: 480 },
  'header_tlayout_frame_bg.png': { width: 1920, height: 60 },
  'header_complex_frame_bg.png': { width: 1920, height: 90 },
  'header_menu_frame_bg.png': { width: 1920, height: 130 },
  'header-sideheader.png': { width: 200, height: 900 },
};

async function getImageSize(filePath) {
  try {
    const { execSync } = await import('child_process');
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}" 2>/dev/null`, { encoding: 'utf-8' });
    const widthMatch = output.match(/pixelWidth: (\d+)/);
    const heightMatch = output.match(/pixelHeight: (\d+)/);
    if (widthMatch && heightMatch) {
      return { width: parseInt(widthMatch[1]), height: parseInt(heightMatch[1]) };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function verifyTheme(themeName) {
  console.log(`\n🔍 验证主题: ${themeName}\n`);
  
  let hasErrors = false;
  const outputDir = path.join(rootDir, 'output', themeName);
  const colorsFile = path.join(rootDir, 'colors', `${themeName}.json`);
  
  // 1. 检查配色文件
  console.log('📋 1. 检查配色文件...');
  if (await fs.pathExists(colorsFile)) {
    console.log('   ✅ colors/*.json 存在');
    const colors = await fs.readJson(colorsFile);
    console.log(`   ✅ 模板类型: ${colors.templateType}`);
    
    // 检查必要字段
    const requiredFields = ['name', 'templateType', 'colors'];
    for (const field of requiredFields) {
      if (colors[field]) {
        console.log(`   ✅ ${field}: ${colors[field]}`);
      } else {
        console.log(`   ❌ 缺少字段: ${field}`);
        hasErrors = true;
      }
    }
  } else {
    console.log('   ❌ colors/*.json 不存在');
    hasErrors = true;
  }
  
  // 2. 检查输出目录
  console.log('\n📋 2. 检查输出目录...');
  if (await fs.pathExists(outputDir)) {
    console.log('   ✅ output/{主题名}/ 存在');
    
    // 3. 检查必要文件
    console.log('\n📋 3. 检查必要文件...');
    for (const image of REQUIRED_IMAGES) {
      const imagePath = path.join(outputDir, image);
      if (await fs.pathExists(imagePath)) {
        const size = await getImageSize(imagePath);
        if (size) {
          const expected = IMAGE_SIZES[image];
          if (expected && (size.width !== expected.width || size.height !== expected.height)) {
            console.log(`   ⚠️  ${image}: ${size.width}x${size.height} (期望 ${expected.width}x${expected.height})`);
          } else {
            console.log(`   ✅ ${image}: ${size.width}x${size.height}`);
          }
        } else {
          console.log(`   ✅ ${image}: 存在`);
        }
      } else {
        console.log(`   ❌ ${image}: 不存在`);
        hasErrors = true;
      }
    }
  } else {
    console.log('   ⚠️  output/{主题名}/ 不存在（可能尚未打包）');
  }
  
  // 4. 检查 themes 目录
  console.log('\n📋 4. 检查打包结果...');
  const themesDir = path.join(outputDir, 'themes');
  if (await fs.pathExists(themesDir)) {
    const files = await fs.readdir(themesDir);
    const zipFiles = files.filter(f => f.endsWith('.zip'));
    console.log(`   ✅ themes/ 存在，包含 ${zipFiles.length} 个 zip 文件`);
    
    if (zipFiles.length < 15) {
      console.log(`   ⚠️  期望 15 个 zip 文件，实际 ${zipFiles.length} 个`);
    }
  } else {
    console.log('   ⚠️  themes/ 不存在（可能尚未打包）');
  }
  
  // 总结
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ 验证失败：存在错误');
    process.exit(1);
  } else {
    console.log('✅ 验证通过');
  }
}

// 主入口
const themeName = process.argv[2];

if (!themeName) {
  console.error('用法: node scripts/verify-theme.mjs {主题名}');
  console.error('示例: node scripts/verify-theme.mjs panda-night');
  process.exit(1);
}

verifyTheme(themeName).catch(err => {
  console.error('❌ 验证失败:', err.message);
  process.exit(1);
});