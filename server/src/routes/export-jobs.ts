import { Router } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { createExportJob, getExportJobByIdAndUser, updateExportJob } from '../export-jobs-memory-store.js';
import { getSecurityConfig } from '../db.js';
import { normalizeAndValidateSelectedProducts } from '../export-job-validation.js';
import { logger } from '../logger.js';
import { createUsageLog, finalizeUsageLog } from '../usage-logs.js';

const router = Router();

function formatDatePrefix(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function startExportUsageLog(req: any, input: { jobId: string; rawInput: string; finalPrompt: string }): string | null {
  try {
    const userId = Number(req.userId);
    const loginName = typeof req.loginName === 'string' ? req.loginName : '';
    if (!Number.isFinite(userId) || !loginName) {
      return null;
    }
    return createUsageLog({
      userId,
      loginName,
      scene: 'export',
      rawInput: input.rawInput,
      finalPrompt: input.finalPrompt,
      modelProvider: 'theme-download',
      modelName: 'zip',
      jobId: input.jobId,
    }).id;
  } catch (error) {
    logger.warn('Create export usage log failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function finalizeExportUsageLog(usageLogId: string | null, status: 'success' | 'failed', errorMessage?: string): void {
  if (!usageLogId) return;
  try {
    finalizeUsageLog(usageLogId, { status, errorMessage });
  } catch (error) {
    logger.warn('Finalize export usage log failed', { error: error instanceof Error ? error.message : String(error), usageLogId });
  }
}

router.post('/pick-directory', async (_req, res) => {
  try {
    const home = os.homedir();
    const desktop = path.join(home, 'Desktop', 'ThemeStudio-Exports');
    res.json({ path: desktop });
  } catch (error) {
    logger.error('Pick directory error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/export-jobs', async (req, res) => {
  try {
    const securityConfig = getSecurityConfig();
    if (securityConfig?.enabled_features?.export === false) {
      return res.status(403).json({ error: '主题导出功能已关闭' });
    }

    const userId = (req as any).userId as number;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: '未授权，请重新登录' });
    }

    const body = req.body ?? {};

    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const rawSelectedProducts = Array.isArray(body.selectedProducts)
      ? body.selectedProducts
      : Array.isArray(body.batch?.selectedProducts)
        ? body.batch.selectedProducts
        : Array.isArray(body.buildOptions?.selectedProducts)
          ? body.buildOptions.selectedProducts
          : [];

    const projectSnapshot = body.projectSnapshot;
    if (!projectId || !projectSnapshot || typeof projectSnapshot !== 'object' || rawSelectedProducts.length === 0) {
      return res.status(400).json({ error: 'projectId, projectSnapshot and selectedProducts are required' });
    }

    const selectedProductsResult = normalizeAndValidateSelectedProducts(rawSelectedProducts);
    if (selectedProductsResult.error) {
      return res.status(400).json({ error: selectedProductsResult.error });
    }

    const job = createExportJob({
      userId,
      selectedProducts: selectedProductsResult.products!,
      snapshot: projectSnapshot as any,
    });

    res.status(201).json({
      accepted: true,
      jobId: job.id,
      id: job.id,
      projectId: job.snapshot.projectId,
      status: job.status,
      selectedProducts: job.selectedProducts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    logger.error('Create export job error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-jobs/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    const job = getExportJobByIdAndUser(id, userId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json({
      id: job.id,
      projectId: job.snapshot.projectId,
      status: job.status,
      selectedProducts: job.selectedProducts,
      error: job.error,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    logger.error('Get export job error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-jobs/:id/download', async (req, res) => {
  let usageLogId: string | null = null;
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    const job = getExportJobByIdAndUser(id, userId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(409).json({ error: 'Export job is not ready for download' });
    }

    const result = job.result ?? {};
    const packagesDir = result?.packagesDir as string | undefined;
    const packagesReadmePath = result?.packagesReadmePath as string | undefined;
    if (!packagesDir || !fs.existsSync(packagesDir)) {
      return res.json({
        id,
        status: 'completed',
        result,
      });
    }

    const requestedFile = req.query.file as string | undefined;
    const downloadAll = req.query.all === 'true';

    if (downloadAll) {
      const files = fs.readdirSync(packagesDir).filter(f => f.toLowerCase().endsWith('.zip'));
      if (files.length === 0) {
        return res.status(404).json({ error: 'No packages found' });
      }

      if (files.length === 1) {
        const filePath = path.join(packagesDir, files[0]);
        usageLogId = startExportUsageLog(req, {
          jobId: id,
          rawInput: 'download-single-theme',
          finalPrompt: files[0],
        });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(files[0])}"`);
        finalizeExportUsageLog(usageLogId, 'success');
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      const snapshotName = String((result?.snapshotName as string) ?? id).trim() || id;
      const archiveName = `${formatDatePrefix()}-${snapshotName}.zip`;
      usageLogId = startExportUsageLog(req, {
        jobId: id,
        rawInput: 'download-all-themes',
        finalPrompt: archiveName,
      });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archiveName)}"`);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(res);
      if (packagesReadmePath && fs.existsSync(packagesReadmePath)) {
        archive.file(packagesReadmePath, { name: path.basename(packagesReadmePath) });
      }
      for (const file of files) {
        archive.file(path.join(packagesDir, file), { name: file });
      }
      archive.finalize();
      finalizeExportUsageLog(usageLogId, 'success');
      return;
    }

    if (!requestedFile) {
      const files = fs.readdirSync(packagesDir).filter(f => f.toLowerCase().endsWith('.zip'));
      return res.json({ id, status: 'completed', files, result });
    }

    const normalizedFile = path.basename(requestedFile);
    if (normalizedFile !== requestedFile || normalizedFile.includes('..') || normalizedFile.includes('/') || normalizedFile.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    const resolvedPackagesDir = path.resolve(packagesDir);
    const filePath = path.resolve(packagesDir, normalizedFile);
    if (!filePath.startsWith(resolvedPackagesDir + path.sep) && filePath !== resolvedPackagesDir) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    usageLogId = startExportUsageLog(req, {
      jobId: id,
      rawInput: 'download-selected-theme',
      finalPrompt: requestedFile,
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(requestedFile)}"`);
    finalizeExportUsageLog(usageLogId, 'success');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    finalizeExportUsageLog(usageLogId, 'failed', error instanceof Error ? error.message : String(error));
    logger.error('Download export job error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/export-jobs/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const { status, error, result } = req.body ?? {};

    const job = getExportJobByIdAndUser(id, userId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    const updated = updateExportJob(id, {
      status,
      error,
      result,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json({
      id: updated.id,
      projectId: updated.snapshot.projectId,
      status: updated.status,
      selectedProducts: updated.selectedProducts,
      error: updated.error,
      result: updated.result,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    logger.error('Update export job error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as exportJobsRouter };
