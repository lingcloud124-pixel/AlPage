import { Request, Response, NextFunction } from 'express';
import { getSecurityConfig } from '../db.js';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60_000;

function resolveLimitKey(req: Request): string | null {
  if (req.path === '/chat') return 'chat';
  if (req.path === '/image') return 'image';
  if (req.path === '/proxy-image') return 'proxyImage';
  if (req.path === '/export-jobs') return 'export';
  return null;
}

function getRequesterKey(req: Request): string {
  const userId = (req as any).userId;
  if (userId) {
    return `user:${userId}`;
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  return `ip:${req.socket.remoteAddress ?? 'unknown'}`;
}

function getRateLimitValue(limitKey: string, config: any): number {
  const raw = config?.rate_limits?.[limitKey];
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return 0;
  }
  return Math.max(0, Math.floor(raw));
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const securityConfig = getSecurityConfig();

  if (securityConfig?.enabled_features?.rateLimiting === false) {
    return next();
  }

  const limitKey = resolveLimitKey(req);
  if (!limitKey) {
    return next();
  }

  const limit = getRateLimitValue(limitKey, securityConfig);
  if (limit <= 0) {
    return next();
  }

  const requesterKey = getRequesterKey(req);
  const bucketKey = `${limitKey}:${requesterKey}`;
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (existing.count >= limit) {
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      limitKey,
      retryAfterMs: existing.resetAt - now,
    });
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  next();
}
