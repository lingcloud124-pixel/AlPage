import { Router, Request, Response } from 'express';
import { resolveLoginName, EKP_BASE_URL } from '../middleware/auth.js';
import { ensureUserByLoginName } from '../db.js';
import { logger } from '../logger.js';

const SSO_COOKIE_CANDIDATES = ['LRToken', 'LtpaToken', 'LR_myekp'];
const APP_COOKIE_NAME = 'LRToken';

const EKP_SSO_LOGIN_PATH = process.env.EKP_SSO_LOGIN_PATH || '/sys/authentication/sso/login_auto.jsp';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

const router = Router();

function parsePublicHost(req: Request): string {
  if (PUBLIC_BASE_URL) {
    return PUBLIC_BASE_URL.replace(/\/+$/, '');
  }

  const forwarded = req.headers['x-forwarded-host'];
  const host = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.headers.host || '';

  let proto = (req.headers['x-forwarded-proto'] as string) || '';
  if (!proto) {
    proto = req.secure ? 'https' : 'http';
  }
  if (proto !== 'https' && host.endsWith('.landray.com.cn')) {
    logger.warn('SSO: detected http protocol for landray domain, forcing https', {
      originalProto: req.headers['x-forwarded-proto'],
      secure: req.secure,
      host,
    });
    proto = 'https';
  }

  return `${proto}://${host}`;
}

router.get('/login', (req: Request, res: Response) => {
  if (!EKP_BASE_URL) {
    res.status(503).send('EKP SSO is not configured');
    return;
  }

  const allCookies = req.cookies ? Object.keys(req.cookies) : [];
  logger.info('SSO login initiated', {
    host: req.headers.host,
    allCookieNames: allCookies,
    ssoCookieCandidates: SSO_COOKIE_CANDIDATES.map(name => ({
      name,
      found: !!(req.cookies?.[name]),
    })),
  });

  let ssoCookie: string | undefined;
  for (const name of SSO_COOKIE_CANDIDATES) {
    const val = req.cookies?.[name];
    if (typeof val === 'string' && val.length > 0) {
      ssoCookie = val;
      break;
    }
  }
  if (ssoCookie) {
    logger.info('SSO login: found existing SSO cookie, attempting token validation');
    resolveLoginName(ssoCookie)
      .then((loginName) => {
        if (loginName) {
          logger.info('SSO login: token validation succeeded, redirecting to /', { loginName });
          res.redirect('/');
          return;
        }
        logger.warn('SSO login: SSO cookie found but token validation failed, redirecting to EKP SSO');
        redirectToEkpSso(req, res);
      })
      .catch((err) => {
        logger.error('SSO login: token validation error, redirecting to EKP SSO', err);
        redirectToEkpSso(req, res);
      });
    return;
  }

  logger.info('SSO login: no SSO cookie found, redirecting to EKP SSO');
  redirectToEkpSso(req, res);
});

function redirectToEkpSso(req: Request, res: Response) {
  const publicHost = parsePublicHost(req);
  const callbackUrl = `${publicHost}/api/auth/sso/callback`;
  const redirectParam = encodeURIComponent(callbackUrl);
  const base = EKP_BASE_URL.replace(/\/+$/, '');
  const ssoPath = EKP_SSO_LOGIN_PATH.startsWith('/') ? EKP_SSO_LOGIN_PATH : `/${EKP_SSO_LOGIN_PATH}`;
  const ekpLoginUrl = `${base}${ssoPath}?RedirectURL=${redirectParam}`;
  logger.info('SSO redirect to EKP', { callbackUrl, ekpLoginUrl: ekpLoginUrl.replace(/RedirectURL=([^&]+)/, 'RedirectURL=***') });
  res.redirect(ekpLoginUrl);
}

router.get('/callback', async (req: Request, res: Response) => {
  const token = (req.query.token || req.query.ticket || req.query.sso_token) as string | undefined;
  const queryKeys = Object.keys(req.query);
  logger.info('SSO callback received', {
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 8) + '...' : null,
    queryKeys,
  });

  if (!token) {
    logger.warn('SSO callback missing token', { queryKeys });
    res.status(400).json({ error: 'Missing token parameter' });
    return;
  }

  try {
    const loginName = await resolveLoginName(token);
    if (!loginName) {
      logger.warn('SSO callback token validation failed', { tokenPrefix: token.substring(0, 8) + '...' });
      res.status(401).json({ error: 'Token validation failed' });
      return;
    }

    ensureUserByLoginName(loginName);
    logger.info('SSO callback authenticated user', { loginName });

    const host = req.headers.host || '';
    const domainParts = host.split(':');
    const hostname = domainParts[0];
    const isLandrayDomain = hostname.endsWith('.landray.com.cn');

    const cookieOptions: Record<string, any> = {
      httpOnly: false,
      path: '/',
      secure: isLandrayDomain ? true : (req.secure || !!req.headers['x-forwarded-proto']),
      sameSite: 'lax',
    };

    if (isLandrayDomain) {
      cookieOptions.domain = '.landray.com.cn';
    }

    logger.info('SSO callback: setting cookie', {
      cookieName: APP_COOKIE_NAME,
      domain: cookieOptions.domain || '(default)',
      secure: cookieOptions.secure,
      hostname,
    });

    res.cookie(APP_COOKIE_NAME, token, cookieOptions);

    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (wantsJson) {
      res.json({ success: true, loginName });
    } else {
      res.redirect('/');
    }
  } catch (err) {
    logger.error('SSO callback error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as ssoRouter };
