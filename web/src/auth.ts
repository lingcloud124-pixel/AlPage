import { apiFetch } from './api-base';

const USER_KEY = 'theme-studio-user';

export interface AuthUser {
  id: number;
  name: string;
  display_name: string;
}

export function getUser(): AuthUser | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch {
    return null;
  }
}

function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function exchangeToken(token: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/auth/sso/callback?token=${encodeURIComponent(token)}`);
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export async function consumeUrlToken(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || params.get('sso_token') || params.get('ticket');
  if (!token) return false;
  const ok = await exchangeToken(token);
  if (ok) {
    params.delete('token');
    params.delete('sso_token');
    params.delete('ticket');
    const clean = params.toString();
    const path = window.location.pathname + (clean ? '?' + clean : '') + window.location.hash;
    window.history.replaceState({}, '', path);
  }
  return ok;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return false;
    const user = await res.json() as AuthUser;
    setUser(user);
    return true;
  } catch {
    return false;
  }
}
