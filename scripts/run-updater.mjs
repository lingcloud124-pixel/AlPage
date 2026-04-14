/**
 * ⚠️ DEPRECATED / 历史工具链
 *
 * run-updater.mjs 属于旧的 manifest 驱动批处理流程，
 * 当前产品主链路已由 Theme Studio Web + theme_builder.py 替代。
 */
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { ThemeUpdater } from '../dist/core/ThemeUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const baseDir = path.join(__dirname, '..');
  const manifestPath = path.join(baseDir, 'manifest.json');
  const manifest = await fs.readJson(manifestPath);
  const updater = new ThemeUpdater();
  const outputBaseDir = path.isAbsolute(manifest.outputDir)
    ? path.dirname(manifest.outputDir)
    : path.join(baseDir, path.dirname(manifest.outputDir || 'output'));
  
  const zipOutputDir = manifest.outputDir;
  
  console.log('🚀 开始批量处理主题包...\n');
  console.log(`📋 共 ${manifest.themes.length} 个主题包待处理\n`);

  const report = await updater.processAll(manifestPath);

  for (const result of report.results) {
    console.log(`\n📝 处理: ${result.themeName}`);

    if (result.success) {
      console.log(`   ✅ 成功 - 更新了 ${result.updatedFiles.length} 个文件`);
    } else {
      console.log(`   ❌ 失败 - ${result.errors.length} 个错误`);
      result.errors.forEach(err => console.log(`      - ${err}`));
    }
  }
  
  const reportPath = path.join(zipOutputDir, 'report.json');
  await fs.ensureDir(zipOutputDir);
  await fs.writeJson(reportPath, {
    processedAt: new Date().toISOString(),
    totalThemes: manifest.themes.length,
    successCount: report.successful,
    failedCount: report.failed,
    results: report.results
  }, { spaces: 2 });
  
  console.log('\n\n📊 处理完成！');
  console.log(`✅ 成功: ${report.successful}`);
  console.log(`❌ 失败: ${report.failed}`);
  console.log(`\n📄 详细报告: ${reportPath}\n`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
