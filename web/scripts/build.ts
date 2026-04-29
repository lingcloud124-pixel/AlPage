import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { buildExportRequestYaml } from '../src/export/build-config.js';
import { buildExportAssetSnapshot } from '../src/export/asset-snapshot.js';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');

interface BuildOptions {
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  subtitle?: string;
  buttonText?: string;
  themeColor: string;
  cssVariables?: Record<string, string>;
  themeImageUrl?: string;
  selectedProducts?: string[];
  exportDir?: string;
  onStatus?: (status: 'capturing' | 'packaging' | 'verifying' | 'completed' | 'failed') => void;
}

interface ResolveBuildDirectoriesOptions {
  nameEn: string;
  exportDir?: string;
}

interface BuildDirectories {
  baseDir: string;
  assetsDir: string;
  packagesDir: string;
  metadataDir: string;
}

const DEFAULT_SELECTED_PRODUCTS = ['mk', 'ekp_v14', 'ekp_v15', 'ekp_v16', 'ekp_v17'];

function getVerifySelectionArgs(selectedProducts?: string[]) {
  return selectedProducts && selectedProducts.length > 0
    ? ['--products', selectedProducts.join(',')]
    : [];
}

function resolveBuildDirectories(options: ResolveBuildDirectoriesOptions) {
  const baseDir = options.exportDir
    ? path.resolve(options.exportDir)
    : path.join(PROJECT_ROOT, 'output', `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${options.nameEn}`);

  return {
    baseDir,
    assetsDir: path.join(baseDir, '素材包'),
    packagesDir: path.join(baseDir, '输出包'),
    metadataDir: path.join(baseDir, '.build-meta'),
  };
}

async function buildAll(options: BuildOptions): Promise<void> {
  const { baseDir, assetsDir, packagesDir, metadataDir } = resolveBuildDirectories(options) as BuildDirectories;
  const cssVariables = options.cssVariables ?? {};

  console.log(`\n🏗️ Theme Studio Build`);
  console.log(`   主题: ${options.name}`);
  console.log(`   类型: ${options.templateType}`);
  console.log(`   目录: ${baseDir}\n`);

  try {
    // Step 1: Generate export config and asset snapshot
    console.log('📝 Step 1: 固定项目快照并生成构建配置...');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(packagesDir, { recursive: true });
    fs.mkdirSync(metadataDir, { recursive: true });
    const yaml = buildExportRequestYaml({
      name: options.name,
      nameEn: options.nameEn,
      subtitle: options.subtitle,
      buttonText: options.buttonText,
      themeColor: options.themeColor,
      templateType: options.templateType,
      colors: options.cssVariables,
      selectedProducts: options.selectedProducts ?? DEFAULT_SELECTED_PRODUCTS,
    });
    const yamlPath = path.join(metadataDir, 'theme-build-request.yaml');
    fs.writeFileSync(yamlPath, yaml, 'utf-8');
    const assetSnapshot = buildExportAssetSnapshot({
      project: {
        id: options.nameEn,
        name: options.name,
        themeName: options.name,
        templateType: options.templateType,
        colors: cssVariables,
        bgImageUrl: options.themeImageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      cssVariables,
      selectedProducts: options.selectedProducts ?? DEFAULT_SELECTED_PRODUCTS,
      nameEn: options.nameEn,
      exportDir: baseDir,
    });
    const snapshotPath = path.join(metadataDir, 'asset-snapshot.json');
    fs.writeFileSync(snapshotPath, `${JSON.stringify(assetSnapshot, null, 2)}\n`, 'utf-8');
    console.log(`   ✅ 配置已生成: ${yamlPath}`);
    console.log(`   ✅ 快照已生成: ${snapshotPath}\n`);

    // Critical invariant: this is the single export entrypoint for asset preparation.
    // Future refactors must preserve the build.ts -> prepare_export_assets.py ->
    // asset_pipeline.py / screenshot.ts -> theme_builder.py -> verify-build.py chain.
    // See docs/internal/IMPORTANT-EXPORT-INVARIANTS.md before changing this flow.
    // Step 2: Prepare assets via unified asset pipeline
    console.log('🖼️ Step 2: 按统一素材流水线准备背景图素材并执行预览截图...');
    options.onStatus?.('capturing');
    const assetPrepPath = path.join(PROJECT_ROOT, 'scripts', 'prepare_export_assets.py');
    execSync(`python3 "${assetPrepPath}" --snapshot "${snapshotPath}" --output "${assetsDir}" --metadata-dir "${metadataDir}"`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });
    console.log('   ✅ 素材准备完成\n');

    // Step 3: Build packages
    console.log('📦 Step 3: 执行打包...');
    options.onStatus?.('packaging');
    const builderPath = path.join(PROJECT_ROOT, 'theme_builder.py');
    try {
      execSync(`python3 "${builderPath}" --config "${yamlPath}" --output "${packagesDir}"`, {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
      });
      console.log('   ✅ 打包完成\n');
    } catch (e) {
      console.error('   ❌ 打包失败:', (e as Error).message);
      options.onStatus?.('failed');
      throw e;
    }

    // Step 4: Verify
    console.log('🔍 Step 4: 验证包...');
    options.onStatus?.('verifying');
    const verifyPath = path.join(PROJECT_ROOT, 'scripts', 'verify-build.py');
    try {
      const verifyArgs = getVerifySelectionArgs(options.selectedProducts)
        .map((value) => `"${value}"`)
        .join(' ');
      execSync(`python3 "${verifyPath}" "${packagesDir}" ${verifyArgs}`.trim(), {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
      });
      console.log('   ✅ 验证通过\n');
    } catch (e) {
      console.error('   ❌ 验证失败');
      options.onStatus?.('failed');
      throw e;
    }

    console.log('🎉 全部完成！');
    options.onStatus?.('completed');
    console.log(`   素材包: ${assetsDir}`);
    console.log(`   输出包: ${packagesDir}`);

    try {
      execSync(`open "${packagesDir}"`, { stdio: 'pipe' });
    } catch (error) {
      console.warn('   ℹ️ 无法自动打开输出目录，请手动查看:', (error as Error).message);
    }

  } finally {
    // no-op
  }
}

if (process.argv[1]?.endsWith('build.ts')) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('用法: npx tsx scripts/build.ts <主题名> <nameEn> <themeColor> [light-ui|dark-ui] [背景图URL] [productsCsv]');
    console.log('示例: npx tsx scripts/build.ts "申能企业" shenergy-enterprise #226F3B dark-ui /path/to/bg.jpg mk,ekp_v17');
    process.exit(1);
  }

  buildAll({
    name: args[0],
    nameEn: args[1],
    themeColor: args[2],
    templateType: (args[3] as 'light-ui' | 'dark-ui') ?? 'light-ui',
    themeImageUrl: args[4],
    selectedProducts: args[5]?.split(',').map(item => item.trim()).filter(Boolean),
  }).catch(err => {
    console.error('构建失败:', err);
    process.exit(1);
  });
}

export { buildAll, resolveBuildDirectories, getVerifySelectionArgs };
