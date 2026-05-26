import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listQueuedExportJobs, requeueInFlightExportJobs, updateExportJob } from './export-jobs-memory-store.js';
import { buildServerExportAssetSnapshot, buildServerExportYaml } from './export-build-shared.js';
import { logger } from './logger.js';

const STEP_DELAY_MS = 50;
const execFileAsync = promisify(execFile);
const SERVICE_EXPORT_ROOT = path.join(process.cwd(), 'data', 'output', 'service-jobs');
const EXPORT_DIRECTORY_README_NAME = '使用说明.txt';
const EXPORT_DIRECTORY_README_CONTENT = `主题包使用说明
1. 本目录下每个 zip 对应一个产品版本的主题包或登录包，请按实际环境选择导入。
2. 单个产品 zip 内附带 readme.txt，可在导入前提供给实施或运维同事参考。
3. 导入前建议备份现网主题、登录页与相关静态资源。
4. 如需重新调整文案、配色或图片，请基于本次导出素材重新生成，不建议直接修改 zip 内文件。
⚠ 注意事项：
● 请勿解压 zip 文件

● 建议先在测试环境验证

● 当前仅支持蓝凌标准产品主题结构
上传主题包
进入标准产品后台：
【门户管理】→【素材库/页面组件/自定义组件】→【主题】
点击右上角「导入」，选择当前下载的 ZIP 压缩包进行上传。
上传成功后：
1. 在门户配置列表中找到对应门户
2. 点击「编辑」→设置→主题→选择上传的主题包，点击「保存」
3. 刷新前台门户页面即可查看效果
`;
let pollTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeExportDirectoryReadme(packagesDir: string): string {
  const readmePath = path.join(packagesDir, EXPORT_DIRECTORY_README_NAME);
  fs.writeFileSync(readmePath, EXPORT_DIRECTORY_README_CONTENT, 'utf8');
  return readmePath;
}

async function runJob(jobId: string): Promise<void> {
  logger.info('Starting export job', { jobId });
  const preparing = updateExportJob(jobId, { status: 'preparing', error: null });
  if (!preparing) return;

  const snapshot = preparing.snapshot;

  if (!snapshot) {
    updateExportJob(jobId, {
      status: 'failed',
      error: 'Snapshot data is missing',
      result: null,
    });
    return;
  }

  const batchDir = path.join(SERVICE_EXPORT_ROOT, jobId);
  const assetsDir = path.join(batchDir, '素材包');
  const metadataDir = path.join(batchDir, '.build-meta');
  const packagesDir = path.join(batchDir, '输出包');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });
  fs.mkdirSync(packagesDir, { recursive: true });

  const assetSnapshotPath = path.join(metadataDir, 'asset-snapshot.json');
  const templateType = (snapshot.templateType === 'dark-ui' ? 'dark-ui' : 'light-ui');
  const colors = typeof snapshot.colors === 'object' && snapshot.colors ? snapshot.colors as Record<string, string> : {};

  const projectId = String(snapshot.projectId ?? snapshot.nameEn ?? jobId);
  const assetSnapshot = buildServerExportAssetSnapshot({
    project: {
      id: projectId,
      name: String(snapshot.name ?? projectId),
      themeName: String(snapshot.name ?? projectId),
      nameEn: typeof snapshot.nameEn === 'string' ? snapshot.nameEn : undefined,
      templateType,
      colors,
      bgImageUrl: typeof snapshot.bgImageUrl === 'string' ? snapshot.bgImageUrl : undefined,
      headerBgImageUrl: typeof snapshot.headerBgImageUrl === 'string' ? snapshot.headerBgImageUrl : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    cssVariables: colors,
    selectedProducts: preparing.selectedProducts,
    nameEn: typeof snapshot.nameEn === 'string' ? snapshot.nameEn : projectId,
    exportDir: batchDir,
  });
  fs.writeFileSync(assetSnapshotPath, `${JSON.stringify(assetSnapshot, null, 2)}\n`, 'utf8');

  await delay(STEP_DELAY_MS);
  updateExportJob(jobId, { status: 'capturing', error: null });
  logger.info('Export job entered stage', { jobId, stage: 'capturing' });

  try {
    const prepareScriptPath = path.join(process.cwd(), 'scripts', 'prepare_export_assets.py');
    const prepareEnv = process.env.SCREENSHOT_BASE_URL
      ? { ...process.env, SCREENSHOT_BASE_URL: process.env.SCREENSHOT_BASE_URL }
      : process.env;
    await execFileAsync('python3', [
      prepareScriptPath,
      '--snapshot',
      assetSnapshotPath,
      '--output',
      assetsDir,
      '--metadata-dir',
      metadataDir,
    ], {
      cwd: process.cwd(),
      env: prepareEnv,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Export job asset preparation failed', { jobId, reason });
    updateExportJob(jobId, {
      status: 'failed',
      error: `Asset preparation failed: ${reason}`,
      result: {
        artifactPath: batchDir,
        metadataDir,
      },
    });
    return;
  }

  await delay(STEP_DELAY_MS);
  updateExportJob(jobId, { status: 'packaging', error: null });
  logger.info('Export job entered stage', { jobId, stage: 'packaging' });

  const yamlPath = path.join(metadataDir, 'theme-build-request.yaml');
  const primaryColor = colors['primary-color']
    || colors['--primary-color']
    || '#2C615C';
  const headerFont = colors['header-font-color']
    || colors['--header-font-color']
    || '';
  const yaml = buildServerExportYaml({
    name: String(snapshot.name ?? projectId),
    nameEn: typeof snapshot.nameEn === 'string' ? snapshot.nameEn : undefined,
    subtitle: String(snapshot.name ?? projectId),
    buttonText: '立即进入',
    themeColor: primaryColor,
    templateType,
    headerFont,
    selectedProducts: preparing.selectedProducts,
    colors,
  });
  fs.writeFileSync(yamlPath, yaml, 'utf8');

  try {
    const builderScriptPath = path.join(process.cwd(), 'theme_builder.py');
    await execFileAsync('python3', [
      builderScriptPath,
      '--config',
      yamlPath,
      '--output',
      packagesDir,
    ], {
      cwd: process.cwd(),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Export job packaging failed', { jobId, reason });
    updateExportJob(jobId, {
      status: 'failed',
      error: `Packaging failed: ${reason}`,
      result: {
        artifactPath: batchDir,
        assetsDir,
        metadataDir,
        packagesDir,
        preparedAssetsManifestPath: path.join(metadataDir, 'prepared-assets-manifest.json'),
        yamlPath,
      },
    });
    return;
  }

  await delay(STEP_DELAY_MS);
  updateExportJob(jobId, { status: 'verifying', error: null });
  logger.info('Export job entered stage', { jobId, stage: 'verifying' });

  try {
    const verifyScriptPath = path.join(process.cwd(), 'scripts', 'verify-build.py');
    await execFileAsync('python3', [
      verifyScriptPath,
      packagesDir,
      '--products',
      preparing.selectedProducts.join(','),
    ], {
      cwd: process.cwd(),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Export job verification failed', { jobId, reason });
    updateExportJob(jobId, {
      status: 'failed',
      error: `Verification failed: ${reason}`,
      result: {
        artifactPath: batchDir,
        assetsDir,
        metadataDir,
        packagesDir,
        preparedAssetsManifestPath: path.join(metadataDir, 'prepared-assets-manifest.json'),
        yamlPath,
      },
    });
    return;
  }

  await delay(STEP_DELAY_MS);
  const packageCount = fs.existsSync(packagesDir)
    ? fs.readdirSync(packagesDir).filter((entry) => entry.toLowerCase().endsWith('.zip')).length
    : 0;
  const packagesReadmePath = writeExportDirectoryReadme(packagesDir);

  const snapshotName = snapshot.nameEn ?? snapshot.name ?? projectId;
  updateExportJob(jobId, {
    status: 'completed',
    error: null,
    result: {
      packageCount,
      downloadUrl: `/api/theme/export-jobs/${jobId}/download`,
      snapshotName,
      artifactPath: batchDir,
      assetsDir,
      metadataDir,
      packagesDir,
      packagesReadmePath,
      preparedAssetsManifestPath: path.join(metadataDir, 'prepared-assets-manifest.json'),
      yamlPath,
      mode: 'packaged',
    },
  });
  logger.info('Export job completed', { jobId, packageCount, snapshotName });
}

async function processQueuedJobs(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queuedJobs = listQueuedExportJobs(5);
    for (const job of queuedJobs) {
      try {
        await runJob(job.id);
      } catch (error) {
        logger.error('Export job threw unexpected error', { jobId: job.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } catch (error) {
    logger.error('Export job queue processing failed', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    isProcessing = false;
  }
}

export function startExportJobRunner(intervalMs: number = 250): void {
  if (pollTimer) return;
  const recoveredCount = requeueInFlightExportJobs();
  if (recoveredCount > 0) {
    logger.warn('Recovered interrupted export jobs on startup', { count: recoveredCount });
  }
  logger.info('Export job runner started', { intervalMs });
  void processQueuedJobs();
  pollTimer = setInterval(() => {
    void processQueuedJobs();
  }, intervalMs);
}

export function stopExportJobRunner(): void {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}
