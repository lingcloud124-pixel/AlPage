import { Request, Response, NextFunction } from 'express';
import { getCredits, getNextResetTime, getSecurityConfig } from '../db.js';

export function creditsMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId || 1;

  if (req.path !== '/image') {
    return next();
  }

  const securityConfig = getSecurityConfig();
  if (securityConfig?.enabled_features?.quota === false) {
    return next();
  }

  const creditsPerImage = securityConfig?.credits_per_image ?? 50;
  const { credits } = getCredits(userId);

  if (credits < creditsPerImage) {
    return res.status(403).json({
      error: '积分不足，无法生成图片',
      code: 'CREDITS_EXHAUSTED',
      remainingCredits: credits,
      nextResetAt: getNextResetTime(),
    });
  }

  next();
}
