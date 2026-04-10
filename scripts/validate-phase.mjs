#!/usr/bin/env node
/**
 * Phase Validation Script
 * 阶段验证脚本 - 每个阶段结束后运行，验证通过后才能进入下一阶段
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function findLatestOutputDir() {
  const outputDir = path.join(rootDir, 'output');
  const dateFolders = fs.readdirSync(outputDir)
    .filter(f => f.match(/^\d{8}-/))
    .sort()
    .reverse();
  
  if (dateFolders.length === 0) return null;
  return { outputDir, dateFolder: dateFolders[0] };
}

async function validatePhase(phaseNum, themeName) {
  const phaseLabels = { 1: 'colors', 2: 'images', 2.5: 'design', 3: 'assets', 4: 'packages' };
  const phase = phaseLabels[phaseNum];
  if (!phase) {
    console.error(`❌ 未知阶段: ${phaseNum}`);
    process.exit(1);
  }

  console.log(`🔍 验证阶段 ${phaseNum}: ${phase}\n`);

  const results = [];
  let allPassed = true;

  try {
    switch (phase) {
      case 'colors':
        const colorsPath = path.join(rootDir, 'colors', `${themeName}.json`);
        const colorsExists = await fs.pathExists(colorsPath);
        results.push({ name: '配色文件存在', pass: colorsExists, detail: colorsExists ? colorsPath : '文件不存在' });
        
        if (colorsExists) {
          const colors = await fs.readJson(colorsPath);
          const hasPrimary = !!colors.colors?.primary;
          const hasTemplateType = ['light-ui', 'dark-ui'].includes(colors.templateType);
          results.push({ name: '包含 primary 颜色', pass: hasPrimary, detail: hasPrimary ? colors.colors.primary : '缺失' });
          results.push({ name: 'templateType 有效', pass: hasTemplateType, detail: hasTemplateType ? colors.templateType : '缺失或无效' });
        }
        break;

      case 'images':
        const bgPath = path.join(rootDir, 'designs', `${themeName}-bg.png`);
        const bgExists = await fs.pathExists(bgPath);
        results.push({ name: '背景图存在', pass: bgExists, detail: bgExists ? bgPath : '文件不存在' });
        
        if (bgExists) {
          const stat = await fs.stat(bgPath);
          const sizeOk = stat.size > 100 * 1024;
          results.push({ name: '背景图尺寸合理', pass: sizeOk, detail: `${(stat.size/1024).toFixed(1)} KB` });
        }
        break;

      case 'design':
        const penDir = path.join(rootDir, 'designs');
        const penFiles = fs.readdirSync(penDir).filter(f => f.startsWith('Topic-') && f.endsWith('.pen'));
        const hasPen = penFiles.length > 0;
        results.push({ name: 'Pen 设计文件存在', pass: hasPen, detail: hasPen ? penFiles[0] : '未找到' });
        break;

      case 'assets': {
        const found = findLatestOutputDir();
        if (!found) {
          results.push({ name: '输出目录存在', pass: false, detail: '未找到日期格式的文件夹' });
        } else {
          const { outputDir, dateFolder } = found;
          const assetsDir = path.join(outputDir, dateFolder, '素材包');
          const assetsExists = await fs.pathExists(assetsDir);
          results.push({ name: '素材包目录存在', pass: assetsExists, detail: assetsDir });

          if (assetsExists) {
            const expectedSizes = {
              'bg-login.jpg': { w: 2215, h: 1080 },
              'header-banner.png': { w: 2560, h: 480 },
              'header_tlayout_frame_bg.png': { w: 1920, h: 60 },
              'login_thumb.jpg': { w: 960, h: 540 }
            };

            for (const [file, expected] of Object.entries(expectedSizes)) {
              const filePath = path.join(assetsDir, file);
              const fileExists = await fs.pathExists(filePath);
              if (!fileExists) {
                results.push({ name: `${file}`, pass: false, detail: '文件缺失' });
                continue;
              }
              const metadata = await sharp(filePath).metadata();
              const sizeOk = metadata.width === expected.w && metadata.height === expected.h;
              results.push({ 
                name: `${file} 尺寸`, 
                pass: sizeOk, 
                detail: `${metadata.width}×${metadata.height}（预期 ${expected.w}×${expected.h}）` 
              });
            }
          }
        }
        break;
      }

      case 'packages': {
        const found = findLatestOutputDir();
        if (!found) {
          results.push({ name: '输出目录存在', pass: false, detail: '未找到日期格式的文件夹' });
        } else {
          const { outputDir, dateFolder } = found;
          const packagesDir = path.join(outputDir, dateFolder, '输出包');
          const reportPath = path.join(packagesDir, 'report.json');
          const reportExists = await fs.pathExists(reportPath);
          results.push({ name: '打包报告存在', pass: reportExists, detail: reportPath });

          if (reportExists) {
            const report = await fs.readJson(reportPath);
            const successCount = report.successCount || 0;
            const allOk = successCount === 13;
            results.push({ name: '13个主题包全部成功', pass: allOk, detail: `${successCount}/13 成功` });
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error(`❌ 验证过程出错: ${error.message}`);
    process.exit(1);
  }

  // 输出结果
  console.log('📋 验证结果：');
  for (const result of results) {
    const icon = result.pass ? '✅' : '❌';
    console.log(`  ${icon} ${result.name}: ${result.detail}`);
    if (!result.pass) allPassed = false;
  }

  console.log('');
  if (allPassed) {
    console.log(`✅ 阶段 ${phaseNum} 验证通过！可以进入下一阶段。`);
    process.exit(0);
  } else {
    console.log(`❌ 阶段 ${phaseNum} 验证失败！请修复后重新验证。`);
    process.exit(1);
  }
}

// 主入口
const phaseNum = process.argv[2];
const themeName = process.argv[3];

if (!phaseNum || !themeName) {
  console.error('用法: node scripts/validate-phase.mjs {阶段号} {主题英文名}');
  console.error('示例: node scripts/validate-phase.mjs 1 cherry-blossom');
  process.exit(1);
}

validatePhase(phaseNum, themeName).catch(err => {
  console.error('❌ 验证失败:', err.message);
  process.exit(1);
});
