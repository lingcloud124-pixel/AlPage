import { Router } from 'express';
import { getUserUsageDetails, listUsageLogs } from '../usage-logs.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const scene = typeof _req.query.scene === 'string' ? _req.query.scene.trim() : '';
    const userKeyword = typeof _req.query.userKeyword === 'string' ? _req.query.userKeyword.trim() : '';
    const rawLimit = typeof _req.query.limit === 'string' ? Number(_req.query.limit) : undefined;
    const limit = Number.isFinite(rawLimit) ? rawLimit : 100;

    const logs = listUsageLogs({
      scene: scene || undefined,
      userKeyword: userKeyword || undefined,
      limit,
    });

    res.json({
      items: logs,
      filters: {
        scene: scene || '',
        userKeyword: userKeyword || '',
        limit,
      },
    });
  } catch (error) {
    logger.error('List usage logs error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId', (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
    const details = getUserUsageDetails(userId, limit);
    res.json(details);
  } catch (error) {
    logger.error('Get user usage details error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as usageLogsRouter };
