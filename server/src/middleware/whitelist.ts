import { Request, Response, NextFunction } from 'express';
import { getSecurityConfig } from '../db.js';
import { logger } from '../logger.js';

export function whitelistMiddleware(req: Request, res: Response, next: NextFunction) {
  const config = getSecurityConfig();
  if (!config?.whitelist_enabled) {
    return next();
  }

  const loginName = (req as any).loginName as string | undefined;
  if (!loginName) {
    return next();
  }

  try {
    const users: string[] = JSON.parse(config.whitelist_users as string || '[]');
    if (users.includes(loginName)) {
      return next();
    }

    logger.info('Whitelist blocked user', { loginName });
    res.status(403).json({
      error: 'WHITELIST_BLOCKED',
      message: '系统正在内测中，暂未对您开放，请联系管理员',
    });
  } catch {
    logger.error('Failed to parse whitelist_users');
    res.status(503).json({
      error: 'WHITELIST_CONFIG_ERROR',
      message: '白名单配置异常，请联系管理员',
    });
  }
}
