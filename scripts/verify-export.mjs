#!/usr/bin/env node

/**
 * verify-export.mjs
 * 
 * 验证导出的图片素材尺寸是否正确
 * 
 * 用法：
 *   node scripts/verify-export.mjs {主题名}
 *   node scripts/verify-export.mjs panda-night
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const REQUIRED_IMAGES = {
  'bg-login.jpg': { width: 2215, height: 1080 },
  'header-banner.png': { width: 2560, height: 480 },
  'header_tlayout_frame_bg.png': { width: 1920, height: 60 },
  'header_complex_frame_bg.png': { width: 1920, height: 90 },
  'header_menu_frame_bg.png': { width: 1920, height: 130 },
  'header-sideheader.png': { width: 200, height: 488 },
};

async function getImageSize(filePath) {
  try {
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, { encoding: 'utf-8' });
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

async function verifyExport(themeName) {
  console.log(`\n🔍 验证导出结果: ${themeName}\n`);
  
  const outputDir = path.join(rootDir, 'output', themeName);
  let hasErrors = false;

  for (const [image, expected] of Object.entries(REQUIRED_IMAGES)) {
    const imagePath = path.join(outputDir, image);
    
    if (!await fs.pathExists(imagePath)) {
      console.log(`❌ ${image}: 不存在`);
      hasErrors = true;
      continue;
    }

    const size = await getImageSize(imagePath);
    if (!size) {
      console.log(`❌ ${image}: 无法获取尺寸`);
      hasErrors = true;
      continue;
    }

    if (size.width === expected.width && size.height === expected.height) {
      console.log(`✅ ${image}: ${size.width}×${size.height}`);
    } else {
      console.log(`❌ ${image}: ${size.width}×${size.height} (期望 ${expected.width}×${expected.height})`);
      hasErrors = true;
    }
  }

  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ 验证失败：存在错误');
    process.exit(1);
  } else {
    console.log('✅ 验证通过：所有图片尺寸正确');
  }
}

// 主入口
const themeName = process.argv[2];

if (!themeName) {
  console.error('用法: node scripts/verify-export.mjs {主题名}');
  console.error('示例: node scripts/verify-export.mjs panda-night');
  process.exit(1);
}

verifyExport(themeName).catch(err => {
  console.error('❌ 验证失败:', err.message);
  process.exit(1);
});
