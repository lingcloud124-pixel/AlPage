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
