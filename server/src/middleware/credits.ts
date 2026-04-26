import { Request, Response, NextFunction } from 'express';
import { getCredits, getNextResetTime, getSecurityConfig } from '../db.js';

export function creditsMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId || 1;

  if (req.path !== '/chat') {
    return next();
  }

  const securityConfig = getSecurityConfig();
  const creditsPerConv = securityConfig?.credits_per_conversation ?? 50;
  const { credits } = getCredits(userId);

  if (credits < creditsPerConv) {
    return res.status(403).json({
      error: '积分不足，今日使用次数已用完',
      code: 'CREDITS_EXHAUSTED',
      remainingCredits: credits,
      nextResetAt: getNextResetTime(),
    });
  }

  next();
}
