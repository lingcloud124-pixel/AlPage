import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path === '/api/health') return;
    logger.request(req.method, req.path, res.statusCode, ms);
  });
  next();
}
