import { Router } from 'express';
import { createConfirmedVersionRecord, listConfirmedVersionsByProject } from '../confirmed-versions-store.js';
import { validateExportSnapshotSize } from '../export-job-validation.js';
import { logger } from '../logger.js';

const router = Router();

router.post('/projects/:projectId/confirmed-versions', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: '未授权，请重新登录' });
    }

    const { projectId } = req.params;
    const projectSnapshot = req.body?.projectSnapshot;
    if (!projectSnapshot || typeof projectSnapshot !== 'object') {
      return res.status(400).json({ error: 'projectSnapshot 必须是对象' });
    }
    if (typeof (projectSnapshot as { projectId?: unknown }).projectId === 'string'
      && (projectSnapshot as { projectId: string }).projectId !== projectId) {
      return res.status(400).json({ error: 'projectSnapshot.projectId 与路径中的 projectId 不一致' });
    }

    const snapshotValidation = validateExportSnapshotSize(projectSnapshot);
    if (!snapshotValidation.ok) {
      return res.status(413).json({ error: snapshotValidation.error });
    }

    const version = createConfirmedVersionRecord({
      projectId,
      userId,
      snapshot: projectSnapshot as any,
    });
    res.status(201).json(version);
  } catch (error) {
    logger.error('Create confirmed version error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/projects/:projectId/confirmed-versions', async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: '未授权，请重新登录' });
    }

    const { projectId } = req.params;
    res.json(listConfirmedVersionsByProject(projectId, userId));
  } catch (error) {
    logger.error('List confirmed versions error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as confirmedVersionsRouter };
