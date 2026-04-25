import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getConfirmedVersionSnapshot, listQueuedExportJobs, updateExportJob } from './export-jobs-store.js';
import { buildServerExportRequestYaml } from './export-request-yaml.js';

const STEP_DELAY_MS = 50;
const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const SERVICE_EXPORT_ROOT = path.join(PROJECT_ROOT, 'output', 'service-jobs');
let pollTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runJob(jobId: string): Promise<void> {
  const preparing = updateExportJob(jobId, { status: 'preparing', error: null });
  if (!preparing) return;

  const snapshot = getConfirmedVersionSnapshot(
    preparing.confirmedVersionId,
    preparing.projectId,
    preparing.userId,
  );

  if (!snapshot) {
    updateExportJob(jobId, {
      status: 'failed',
      error: 'Confirmed version snapshot is missing',
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

  const assetSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: {
      id: snapshot.projectId ?? preparing.projectId,
      name: snapshot.name ?? preparing.projectId,
      nameEn: snapshot.nameEn ?? preparing.projectId,
      templateType,
      selectedProducts: preparing.selectedProducts,
    },
    sourceImages: {
      background: snapshot.bgImageUrl,
      headerBackground: snapshot.headerBgImageUrl,
    },
    assetSources: {
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    },
    colors,
    paths: {
      exportDir: batchDir,
    },
    pipeline: {
      steps: [
        { id: 'project-snapshot', name: '固定当前项目快照', description: '服务端确认态快照' },
        { id: 'login-background', name: '处理登录页背景素材', description: '基于背景图生成登录素材' },
        { id: 'header-sidebar', name: '处理页眉和左侧导航素材', description: '基于背景图生成页眉与左导航切图' },
        { id: 'thumbnails', name: '处理封面图和缩略图素材', description: '后续阶段接入 HTML 预览截图' },
      ],
    },
  };
  fs.writeFileSync(assetSnapshotPath, `${JSON.stringify(assetSnapshot, null, 2)}\n`, 'utf8');

  await delay(STEP_DELAY_MS);
  updateExportJob(jobId, { status: 'capturing', error: null });

  try {
    const prepareScriptPath = path.join(PROJECT_ROOT, 'scripts', 'prepare_export_assets.py');
    await execFileAsync('python3', [
      prepareScriptPath,
      '--snapshot',
      assetSnapshotPath,
      '--output',
      assetsDir,
      '--metadata-dir',
      metadataDir,
    ], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, SCREENSHOT_BASE_URL: 'http://127.0.0.1:5173' },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
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

  const yamlPath = path.join(metadataDir, 'theme-build-request.yaml');
  const yaml = buildServerExportRequestYaml({
    name: String(snapshot.name ?? preparing.projectId),
    nameEn: typeof snapshot.nameEn === 'string' ? snapshot.nameEn : undefined,
    templateType,
    selectedProducts: preparing.selectedProducts,
    colors,
  });
  fs.writeFileSync(yamlPath, yaml, 'utf8');

  try {
    const builderScriptPath = path.join(PROJECT_ROOT, 'theme_builder.py');
    await execFileAsync('python3', [
      builderScriptPath,
      '--config',
      yamlPath,
      '--output',
      packagesDir,
    ], {
      cwd: PROJECT_ROOT,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
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

  try {
    const verifyScriptPath = path.join(PROJECT_ROOT, 'scripts', 'verify-build.py');
    await execFileAsync('python3', [
      verifyScriptPath,
      packagesDir,
      '--products',
      preparing.selectedProducts.join(','),
    ], {
      cwd: PROJECT_ROOT,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
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

  const snapshotName = snapshot.nameEn ?? snapshot.projectId ?? preparing.projectId;
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
      preparedAssetsManifestPath: path.join(metadataDir, 'prepared-assets-manifest.json'),
      yamlPath,
      mode: 'packaged',
    },
  });
}

async function processQueuedJobs(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queuedJobs = listQueuedExportJobs(5);
    for (const job of queuedJobs) {
      await runJob(job.id);
    }
  } finally {
    isProcessing = false;
  }
}

export function startExportJobRunner(intervalMs: number = 250): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void processQueuedJobs();
  }, intervalMs);
}

export function stopExportJobRunner(): void {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}
