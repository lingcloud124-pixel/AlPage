import { randomBytes } from 'crypto';

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

interface AdminSession {
  token: string;
  createdAt: number;
}

const sessions = new Map<string, AdminSession>();

const ADMIN_SESSION_COOKIE = 'admin_session';

export { ADMIN_SESSION_COOKIE };

export function createSession(): string {
  purge();
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { token, createdAt: Date.now() });
  return token;
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

function purge() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token);
  }
}
