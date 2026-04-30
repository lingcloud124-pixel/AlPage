import { Router } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { createExportJob, getExportJobByIdAndUser, updateExportJob } from '../export-jobs-memory-store.js';
import { getSecurityConfig } from '../db.js';
import { normalizeAndValidateSelectedProducts } from '../export-job-validation.js';
import { logger } from '../logger.js';

const router = Router();

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
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(files[0])}"`);
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      const snapshotName = (result?.snapshotName as string) ?? id;
      const archiveName = `${snapshotName}-all.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archiveName)}"`);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(res);
      for (const file of files) {
        archive.file(path.join(packagesDir, file), { name: file });
      }
      archive.finalize();
      return;
    }

    if (!requestedFile) {
      const files = fs.readdirSync(packagesDir).filter(f => f.toLowerCase().endsWith('.zip'));
      return res.json({ id, status: 'completed', files, result });
    }

    const filePath = path.join(packagesDir, requestedFile);
    if (!filePath.startsWith(packagesDir) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(requestedFile)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
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
