import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listQueuedExportJobs, updateExportJob } from './export-jobs-memory-store.js';
import { buildServerExportAssetSnapshot, buildServerExportYaml } from './export-build-shared.js';

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
      env: { ...process.env, SCREENSHOT_BASE_URL: 'http://localhost:5173' },
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
