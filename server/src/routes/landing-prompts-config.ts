import { Router, Request, Response } from 'express';
import { getLandingPromptsConfig, updateLandingPromptsConfig } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = getLandingPromptsConfig();
    if (!config) {
      return res.json({ enabled: true, entries: [] });
    }
    res.json({ enabled: config.enabled, entries: config.entries, updated_at: config.updated_at });
  } catch (error) {
    logger.error('Error fetching landing prompts config', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : undefined;
    const raw = req.body?.entries;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ error: 'entries must be an array' });
    }

    const entries = raw.map((item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        return { label: `主题 ${index + 1}`, prompt: '', primaryHint: '' };
      }
      return {
        label: typeof item.label === 'string' ? item.label.trim() : `主题 ${index + 1}`,
        prompt: typeof item.prompt === 'string' ? item.prompt.trim() : '',
        primaryHint: typeof item.primaryHint === 'string' ? item.primaryHint.trim() : '',
      };
    }).filter((entry: any) => entry.label && entry.prompt);

    if (entries.length === 0) {
      return res.status(400).json({ error: 'At least one entry with label and prompt is required' });
    }

    updateLandingPromptsConfig(entries, enabled);
    const updated = getLandingPromptsConfig();

    res.json({ success: true, enabled: updated.enabled, entries: updated.entries, updated_at: updated.updated_at });
  } catch (error) {
    logger.error('Error updating landing prompts config', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
