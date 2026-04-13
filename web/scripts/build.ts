import { screenshotAll } from './screenshot.js';
import { execSync, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const WEB_ROOT = path.resolve(import.meta.dirname, '..');
const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}`;

interface BuildOptions {
  name: string;
  nameEn: string;
  templateType: 'light-ui' | 'dark-ui';
  subtitle?: string;
  buttonText?: string;
  themeColor: string;
  themeImageUrl?: string;
}

function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`服务器启动超时 (${timeoutMs / 1000}s)`));
        return;
      }
      http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else setTimeout(check, 500);
      }).on('error', () => setTimeout(check, 500));
    };
    check();
  });
}

async function ensureDevServer(): Promise<ChildProcess | null> {
  // Check if already running
  try {
    const response = await fetch(VITE_URL);
    if (response.ok) {
      console.log('   ✅ 开发服务器已运行\n');
      return null;
    }
  } catch {}

  // Start Vite dev server
  console.log('   🚀 启动 Vite 开发服务器...');
  const viteProcess = spawn('npx', ['vite', '--port', String(VITE_PORT)], {
    cwd: WEB_ROOT,
    stdio: 'pipe',
    shell: true,
    detached: false,
  });

  try {
    await waitForServer(VITE_URL);
    console.log('   ✅ 开发服务器已启动\n');
    return viteProcess;
  } catch (e) {
    viteProcess.kill();
    throw e;
  }
}

async function buildAll(options: BuildOptions): Promise<void> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseDir = path.join(PROJECT_ROOT, 'output', `${date}-${options.nameEn}`);
  const assetsDir = path.join(baseDir, '素材包');
  const packagesDir = path.join(baseDir, '输出包');

  console.log(`\n🏗️ Theme Studio Build`);
  console.log(`   主题: ${options.name}`);
  console.log(`   类型: ${options.templateType}`);
  console.log(`   目录: ${baseDir}\n`);

  let viteProcess: ChildProcess | null = null;

  try {
    // Step 1: Ensure dev server is running
    console.log('📋 Step 1: 开发服务器...');
    viteProcess = await ensureDevServer();

    // Step 2: Screenshot
    console.log('📸 Step 2: 截图导出...');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(packagesDir, { recursive: true });
    const screenshotResults = await screenshotAll(assetsDir, {
      themeImageUrl: options.themeImageUrl,
      templateType: options.templateType,
    });
    console.log(`   ✅ 截图完成: ${Object.keys(screenshotResults).length} 个文件\n`);

    // Step 3: Generate theme-build-request.yaml
    console.log('📝 Step 3: 生成构建配置...');
    const yaml = `title: "${options.name}"
subtitle: "${options.subtitle ?? options.name}"
buttonText: "${options.buttonText ?? '立即进入'}"
themeColor: "${options.themeColor}"
headerFont: ""
products:
  - mk
  - ekp_v12
  - ekp_v13_5
  - ekp_v14_16
  - ekp_v17
images:
  headerBanner: "header-banner.png"
  headerClassic: "header_complex_frame_bg.png"
  headerSimple: "header_tlayout_frame_bg.png"
  headerTabs: "header_tlayout_frame_bg.png"
  headerIcon: "header_tlayout_frame_bg.png"
  headerSideheader: "header-sideheader.png"
  loginBackground: "bg-login.jpg"
  loginLogo: ""
`;
    const yamlPath = path.join(assetsDir, 'theme-build-request.yaml');
    fs.writeFileSync(yamlPath, yaml, 'utf-8');
    console.log(`   ✅ 配置已生成: ${yamlPath}\n`);

    // Step 4: Build packages
    console.log('📦 Step 4: 执行打包...');
    const builderPath = path.join(PROJECT_ROOT, 'theme_builder.py');
    try {
      execSync(`python3 "${builderPath}" --config "${yamlPath}" --output "${packagesDir}"`, {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
      });
      console.log('   ✅ 打包完成\n');
    } catch (e) {
      console.error('   ❌ 打包失败:', (e as Error).message);
      process.exit(1);
    }

    // Step 5: Verify
    console.log('🔍 Step 5: 验证包...');
    const verifyPath = path.join(PROJECT_ROOT, 'scripts', 'verify-build.py');
    try {
      execSync(`python3 "${verifyPath}" "${packagesDir}"`, {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
      });
      console.log('   ✅ 验证通过\n');
    } catch (e) {
      console.error('   ❌ 验证失败');
      process.exit(1);
    }

    console.log('🎉 全部完成！');
    console.log(`   素材包: ${assetsDir}`);
    console.log(`   输出包: ${packagesDir}`);

    try {
      execSync(`open "${packagesDir}"`, { stdio: 'pipe' });
    } catch {}

  } finally {
    // Clean up Vite if we started it
    if (viteProcess) {
      console.log('\n🧹 关闭开发服务器...');
      viteProcess.kill();
    }
  }
}

if (process.argv[1]?.endsWith('build.ts')) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('用法: npx tsx scripts/build.ts <主题名> <nameEn> <themeColor> [light-ui|dark-ui] [背景图URL]');
    console.log('示例: npx tsx scripts/build.ts "申能企业" shenergy-enterprise #226F3B dark-ui /path/to/bg.jpg');
    process.exit(1);
  }

  buildAll({
    name: args[0],
    nameEn: args[1],
    themeColor: args[2],
    templateType: (args[3] as 'light-ui' | 'dark-ui') ?? 'light-ui',
    themeImageUrl: args[4],
  }).catch(err => {
    console.error('构建失败:', err);
    process.exit(1);
  });
}

export { buildAll };
