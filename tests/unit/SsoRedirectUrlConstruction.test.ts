/**
 * SSO redirect URL construction — incident regression + URL construction contract
 *
 * Root cause of production incident:
 *   EKP_BASE_URL was configured as something like "https://login.jsp",
 *   which passes the startsWith('http') check but produces a redirect to
 *   https://login.jsp/... (no real hostname).
 *
 * Tests verify behavior through the ssoRouter (not private functions),
 * asserting response status codes and redirect Location URLs.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { resolveLoginNameMock, ensureUserMock, loggerMock } = vi.hoisted(() => ({
  resolveLoginNameMock: vi.fn(),
  ensureUserMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../server/src/middleware/auth.js', () => ({
  resolveLoginName: resolveLoginNameMock,
  get EKP_BASE_URL() { return process.env.EKP_BASE_URL || ''; },
}));

vi.mock('../../server/src/db.js', () => ({
  ensureUserByLoginName: ensureUserMock,
}));

vi.mock('../../server/src/logger.js', () => ({
  logger: loggerMock,
}));

function makeRes() {
  const res: any = {
    _statusCode: 200,
    _body: null,
    _redirectUrl: null,
    _cookies: [],
    redirect: vi.fn((url: string) => { res._redirectUrl = url; return res; }),
    status: vi.fn((code: number) => { res._statusCode = code; return res; }),
    json: vi.fn((body: any) => { res._body = body; return res; }),
    cookie: vi.fn((name: string, value: string, opts: any = {}) => {
      res._cookies.push({ name, value, opts });
      return res;
    }),
  };
  return res;
}

describe('SSO redirect URL construction — incident regression', async () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ['EKP_BASE_URL', 'PUBLIC_BASE_URL', 'EKP_SSO_LOGIN_PATH']) {
      savedEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    vi.resetModules();
  });

  async function importSso() {
    const mod = await import('../../server/src/routes/sso.js');
    return mod.ssoRouter;
  }

  function makeLoginReq(overrides: Record<string, any> = {}) {
    return {
      method: 'GET',
      url: '/login',
      headers: { host: 'cloud-theme.landray.com.cn' },
      secure: true,
      cookies: {},
      query: {},
      xhr: false,
      socket: { remoteAddress: '127.0.0.1' },
      path: '/login',
      ...overrides,
    };
  }

  // ─── Root cause: bad EKP_BASE_URL ──────────────────────────

  test('EKP_BASE_URL=https://login.jsp should NOT 302 to https://login.jsp/... — must return 503', async () => {
    process.env.EKP_BASE_URL = 'https://login.jsp';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq({ cookies: {} }) as any, res, () => {});

    await vi.waitFor(() => expect(res._statusCode !== 200 || res._redirectUrl !== null).toBeTruthy(), { timeout: 3000 });

    // The key assertion: must NOT redirect to https://login.jsp/
    if (res._redirectUrl) {
      expect(res._redirectUrl).not.toMatch(/^https:\/\/login\.jsp/);
    }
    // Should return 503 (config error) instead of a bad redirect
    expect(res._statusCode).toBe(503);
  });

  test('EKP_BASE_URL with path like https://ekp.landray.com.cn/login.jsp should be rejected (503)', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn/login.jsp';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq() as any, res, () => {});

    await vi.waitFor(() => expect(res._statusCode !== 200).toBeTruthy(), { timeout: 3000 });
    expect(res._statusCode).toBe(503);
  });

  test('EKP_BASE_URL with non-http protocol (ftp://) should be rejected', async () => {
    process.env.EKP_BASE_URL = 'ftp://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq() as any, res, () => {});

    await vi.waitFor(() => expect(res._statusCode !== 200).toBeTruthy(), { timeout: 3000 });
    expect(res._statusCode).toBe(503);
  });

  test('empty EKP_BASE_URL should return 503', async () => {
    delete process.env.EKP_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq() as any, res, () => {});

    await vi.waitFor(() => expect(res._statusCode).toBe(503), { timeout: 3000 });
  });

  // ─── Correct URL construction with valid config ────────────

  test('valid config: no cookies → redirect to EKP login.jsp with correct domain', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq({ cookies: {} }) as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // Should redirect to ekp.landray.com.cn (not login.jsp as hostname)
    expect(res._redirectUrl).toMatch(/^https:\/\/ekp\.landray\.com\.cn\/login\.jsp\?RedirectURL=/);
    // Callback URL must contain our domain
    expect(res._redirectUrl).toMatch(/RedirectURL=https%3A%2F%2Fcloud-theme\.landray\.com\.cn/);
  });

  test('invalid cookies → do not redirect to undocumented EKP login_auto.jsp RedirectURL flow', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';
    resolveLoginNameMock.mockResolvedValue(null);

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq({ cookies: { LRToken: 'bad-token' } }) as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // EKP docs describe login_auto.jsp for sessionId-based EKP login, not RedirectURL callbacks.
    // That undocumented flow redirects production browsers to https://login.jsp/.
    expect(res._redirectUrl).toMatch(/^https:\/\/ekp\.landray\.com\.cn\/login\.jsp\?RedirectURL=/);
    expect(res._redirectUrl).not.toContain('login_auto.jsp');
  });

  test('valid cookie → redirect to / without hitting EKP', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';
    resolveLoginNameMock.mockResolvedValue('zhangsan');

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq({ cookies: { LRToken: 'valid-token' } }) as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBe('/'), { timeout: 3000 });
  });

  // ─── PUBLIC_BASE_URL and callback URL ──────────────────────

  test('callback URL uses PUBLIC_BASE_URL (not request headers)', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    // Request comes from internal host but PUBLIC_BASE_URL overrides
    router.handle(makeLoginReq({
      headers: { host: '10.0.0.1:3001' },
    }) as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // RedirectURL should use PUBLIC_BASE_URL, not the internal host
    expect(res._redirectUrl).toContain('cloud-theme.landray.com.cn');
    expect(res._redirectUrl).not.toContain('10.0.0.1');
  });

  test('callback URL strips trailing slash from PUBLIC_BASE_URL', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn/';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq() as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // No double slash in the constructed callback
    expect(res._redirectUrl).not.toContain('cloud-theme.landray.com.cn//');
  });

  test('.landray.com.cn host forces https even when x-forwarded-proto is http', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn';
    delete process.env.PUBLIC_BASE_URL;

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq({
      headers: {
        host: 'cloud-theme.landray.com.cn',
        'x-forwarded-proto': 'http',
      },
      secure: false,
    }) as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // Must force https for .landray.com.cn
    expect(res._redirectUrl).toMatch(/RedirectURL=https%3A%2F%2F/);
  });

  // ─── EKP_BASE_URL with trailing slash ──────────────────────

  test('EKP_BASE_URL with trailing slash still produces correct redirect', async () => {
    process.env.EKP_BASE_URL = 'https://ekp.landray.com.cn/';
    process.env.PUBLIC_BASE_URL = 'https://cloud-theme.landray.com.cn';

    const router = await importSso();
    const res = makeRes();

    router.handle(makeLoginReq() as any, res, () => {});

    await vi.waitFor(() => expect(res._redirectUrl).toBeTruthy(), { timeout: 3000 });

    // Should not have double slash after hostname
    expect(res._redirectUrl).not.toContain('ekp.landray.com.cn//login.jsp');
    expect(res._redirectUrl).toMatch(/^https:\/\/ekp\.landray\.com\.cn\/login\.jsp/);
  });
});
