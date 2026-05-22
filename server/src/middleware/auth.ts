import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { ADMIN_SESSION_COOKIE, validateSession } from '../admin-session.js';

const EKP_BASE_URL = process.env.EKP_BASE_URL || '';
const EKP_SSO_USER = process.env.EKP_SSO_USER || '';
const EKP_SSO_PASS = process.env.EKP_SSO_PASS || '';
const EKP_TOKEN_RESOLVE_PATH = process.env.EKP_TOKEN_RESOLVE_PATH || '/sys/authentication/sso/loginService_rest/getTokenLoginName';
const SSO_COOKIE_NAME = 'LR_myekp';

const DEV_MODE = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH === 'true';
const DEV_LOGIN_NAME = process.env.DEV_LOGIN_NAME || 'dev_user';

interface EkpTokenResponse {
  result: boolean;
  errorMsg?: string;
  loginName?: string;
}

function buildTokenResolveUrl(token: string): string {
  const base = EKP_BASE_URL.replace(/\/+$/, '');
  const path = EKP_TOKEN_RESOLVE_PATH.startsWith('/') ? EKP_TOKEN_RESOLVE_PATH : `/${EKP_TOKEN_RESOLVE_PATH}`;
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export async function resolveLoginName(token: string): Promise<string | null> {
  if (!EKP_BASE_URL) {
    logger.error('EKP_BASE_URL not configured');
    return null;
  }

  try {
    const headers: Record<string, string> = {};
    if (EKP_SSO_USER && EKP_SSO_PASS) {
      headers.Authorization = `Basic ${Buffer.from(`${EKP_SSO_USER}:${EKP_SSO_PASS}`).toString('base64')}`;
    }

    const res = await fetch(buildTokenResolveUrl(token), {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      logger.error('EKP token validation HTTP error', { status: res.status });
      return null;
    }

    const data = (await res.json()) as EkpTokenResponse;
    if (!data.result || !data.loginName) {
      logger.warn('EKP token validation failed', { errorMsg: data.errorMsg });
      return null;
    }

    return data.loginName;
  } catch (err) {
    logger.error('EKP token validation request failed', err);
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SSO_COOKIE_NAME];

  if (!token) {
    if (DEV_MODE) {
      (req as any).loginName = DEV_LOGIN_NAME;
      return next();
    }
    res.status(401).json({ error: 'Not authenticated', code: 'NO_TOKEN' });
    return;
  }

  resolveLoginName(token)
    .then((loginName) => {
      if (!loginName) {
        res.status(401).json({ error: 'Token validation failed', code: 'INVALID_TOKEN' });
        return;
      }
      (req as any).loginName = loginName;
      next();
    })
    .catch(() => {
      res.status(502).json({ error: 'Authentication service unavailable', code: 'SSO_UNAVAILABLE' });
    });
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({ error: 'Admin authentication is not configured' });
    return;
  }

  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  if (validateSession(sessionToken)) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
}

export { EKP_BASE_URL, SSO_COOKIE_NAME };
