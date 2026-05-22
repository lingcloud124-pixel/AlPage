import { Router, Request, Response } from 'express';
import { resolveLoginName, EKP_BASE_URL, SSO_COOKIE_NAME } from '../middleware/auth.js';
import { ensureUserByLoginName } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

function parsePublicHost(req: Request): string {
  const forwarded = req.headers['x-forwarded-host'];
  const host = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

router.get('/login', (req: Request, res: Response) => {
  if (!EKP_BASE_URL) {
    res.status(503).send('EKP SSO is not configured');
    return;
  }

  const ssoCookie = req.cookies?.[SSO_COOKIE_NAME];
  if (ssoCookie) {
    resolveLoginName(ssoCookie)
      .then((loginName) => {
        if (loginName) {
          res.redirect('/');
          return;
        }
        redirectToEkpSso(req, res);
      })
      .catch(() => redirectToEkpSso(req, res));
    return;
  }

  redirectToEkpSso(req, res);
});

function redirectToEkpSso(req: Request, res: Response) {
  const callbackUrl = `${parsePublicHost(req)}/api/auth/sso/callback`;
  const redirectParam = encodeURIComponent(callbackUrl);
  const ekpLoginUrl = `${EKP_BASE_URL}/sys/authentication/sso/login_auto.jsp?RedirectURL=${redirectParam}`;
  logger.info('SSO redirect to EKP', { callbackUrl });
  res.redirect(ekpLoginUrl);
}

router.get('/callback', async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    logger.warn('SSO callback missing token');
    res.status(400).send('Missing token parameter');
    return;
  }

  try {
    const loginName = await resolveLoginName(token);
    if (!loginName) {
      logger.warn('SSO callback token validation failed');
      res.status(401).send('Token validation failed');
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
      secure: req.secure || !!req.headers['x-forwarded-proto'],
      sameSite: 'lax',
    };

    if (isLandrayDomain) {
      cookieOptions.domain = '.landray.com.cn';
    }

    res.cookie(SSO_COOKIE_NAME, token, cookieOptions);
    res.redirect('/');
  } catch (err) {
    logger.error('SSO callback error', err);
    res.status(500).send('Internal server error');
  }
});

export { router as ssoRouter };
