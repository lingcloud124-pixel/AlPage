const USER_KEY = 'theme-studio-user';

const EKP_LOGIN_URL = '/sys/authentication/sso/login_auto.jsp';

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
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const user = await res.json() as AuthUser;
    setUser(user);
    return true;
  } catch {
    return false;
  }
}

export function redirectToLogin(): void {
  const target = encodeURIComponent(window.location.href);
  window.location.href = `${EKP_LOGIN_URL}?target=${target}`;
}
