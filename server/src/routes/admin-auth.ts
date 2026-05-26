import { timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { createSession, destroySession, validateSession, ADMIN_SESSION_COOKIE } from '../admin-session.js';
import { getStoredAdminPassword } from '../db.js';
import { decryptIfNeeded } from '../crypto.js';

const router = Router();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const COOKIE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function resolveAdminPassword(): string | null {
  const stored = getStoredAdminPassword();
  if (stored) {
    return decryptIfNeeded(stored);
  }
  return process.env.ADMIN_PASSWORD || null;
}

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

function safeCompare(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function setAdminCookie(res: Response, token: string): void {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

router.post('/login', (req: Request, res: Response) => {
  const adminPassword = resolveAdminPassword();
  if (!adminPassword) {
    res.status(503).json({ error: 'Admin authentication is not configured' });
    return;
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    const entry = loginAttempts.get(ip);
    res.status(429).json({ error: '登录失败次数过多，请 5 分钟后再试', retryAfterMs: entry ? entry.resetAt - Date.now() : WINDOW_MS });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || !safeCompare(password, adminPassword)) {
    res.status(401).json({ error: '密码不正确' });
    return;
  }

  clearRateLimit(ip);
  const token = createSession();
  setAdminCookie(res, token);
  res.json({ success: true });
});

router.post('/logout', (req: Request, res: Response) => {
  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  destroySession(sessionToken);
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/', sameSite: 'lax', secure: COOKIE_SECURE });
  res.json({ success: true });
});

router.get('/check', (req: Request, res: Response) => {
  const adminPassword = resolveAdminPassword();
  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  const valid = validateSession(sessionToken);
  res.json({
    authenticated: Boolean(adminPassword) && valid,
    noPassword: !adminPassword,
  });
});

export default router;
