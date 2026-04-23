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

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function switchUser(user: AuthUser): void {
  setUser(user);
  window.location.reload();
}

export function authHeaders(): Record<string, string> {
  const user = getUser();
  if (user) {
    return { 'X-User-Id': String(user.id) };
  }
  return {};
}

export async function fetchUsers(): Promise<AuthUser[]> {
  const response = await fetch('/api/auth/users');
  if (!response.ok) return [];
  return response.json();
}

export async function checkAuth(): Promise<boolean> {
  const user = getUser();
  if (!user) {
    const users = await fetchUsers();
    if (users.length > 0) {
      setUser(users[0]);
      return true;
    }
    return false;
  }
  return true;
}
