const TOKEN_KEY = 'theme-studio-token';
const USER_KEY = 'theme-studio-user';

export interface AuthUser {
  id: number;
  name: string;
  display_name: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch (e) {
    console.warn('Failed to parse stored user:', e);
    return null;
  }
}

export async function login(name: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const { token, user } = data;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user as AuthUser;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login.html';
}

export async function checkAuth(): Promise<boolean> {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        ...authHeaders(),
      },
    });

    if (!response.ok) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    }

    const data = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return true;
  } catch (error) {
    console.warn('Auth check failed:', error);
    return true;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export function requireAuth(): void {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}