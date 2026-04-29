import { Router, Request, Response } from 'express';
import { createSession, destroySession, validateSession, ADMIN_SESSION_COOKIE } from '../admin-session.js';

const router = Router();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

router.post('/login', (req: Request, res: Response) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    const token = createSession();
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ success: true, noPassword: true });
    return;
  }

  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    const entry = loginAttempts.get(ip);
    res.status(429).json({ error: '登录失败次数过多，请 5 分钟后再试', retryAfterMs: entry ? entry.resetAt - Date.now() : WINDOW_MS });
    return;
  }

  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    res.status(401).json({ error: '密码不正确' });
    return;
  }

  clearRateLimit(ip);
  const token = createSession();
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ success: true });
});

router.post('/logout', (req: Request, res: Response) => {
  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  destroySession(sessionToken);
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
  res.json({ success: true });
});

router.get('/check', (req: Request, res: Response) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  const valid = validateSession(sessionToken);
  res.json({
    authenticated: !adminPassword || valid,
    noPassword: !adminPassword,
  });
});

export default router;
