const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1']);

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getConfiguredApiBase(): string | null {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? trimTrailingSlash(configured) : null;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveApiUrl(path: string): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBase = getConfiguredApiBase();
  if (configuredBase) {
    return `${configuredBase}${normalizedPath}`;
  }

  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  if (import.meta.env.DEV) {
    const { protocol, hostname, port } = window.location;
    if (port === '5173' || port === '4173') {
      return normalizedPath;
    }
    if (LOCALHOST_HOSTS.has(hostname) && port !== '3001') {
      return `${protocol}//${hostname}:3001${normalizedPath}`;
    }
  }

  return normalizedPath;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = options.headers ? { ...options.headers } : undefined;
  return fetch(resolveApiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  });
}
