import { Router } from 'express';
import { getCredits, getNextResetTime, getSecurityConfig } from '../db.js';

export const creditsRouter = Router();

creditsRouter.get('/', (req, res) => {
  const userId = (req as any).userId || 1;
  const { credits } = getCredits(userId);
  const config = getSecurityConfig();
  const maxCredits = config?.daily_credits_limit ?? 100;
  const quotaEnabled = config?.enabled_features?.quota !== false;

  res.json({
    credits,
    maxCredits,
    nextResetAt: getNextResetTime(),
    costPerChat: config?.credits_per_conversation ?? 25,
    costPerImage: config?.credits_per_image ?? 50,
    quotaEnabled,
  });
});
