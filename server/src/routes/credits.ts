import { Router } from 'express';
import { getCredits, getNextResetTime, getSecurityConfig } from '../db.js';

export const creditsRouter = Router();

creditsRouter.get('/', (req, res) => {
  const userId = (req as any).userId || 1;
  const { credits } = getCredits(userId);
  const config = getSecurityConfig();
  const maxCredits = config?.daily_credits_limit ?? 100;

  res.json({
    credits,
    maxCredits,
    nextResetAt: getNextResetTime(),
  });
});
