import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

[
  resolve(process.cwd(), 'server', '.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
  resolve(process.cwd(), '..', 'web', '.env'),
].forEach((envPath) => {
  loadEnv({ path: envPath, override: false });
});

const { logger } = await import('./logger.js');

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting for safety', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const detail = reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason);
  logger.error('Unhandled rejection — exiting for safety', detail);
  process.exit(1);
});

const [
  { default: express },
  { initDb, closeDb, ensureUserByLoginName },
  { authRouter },
  { modelConfigRouter },
  { exportJobsRouter },
  { startExportJobRunner },
  { aiProxyRouter },
  { authMiddleware, adminAuthMiddleware },
  { whitelistMiddleware },
  { default: securityConfigRouter },
  { dynamicCors },
  { rateLimitMiddleware },
  { creditsMiddleware },
  { creditsRouter },
  { requestLogger },
  { conversationsRouter },
  { default: adminPasswordRouter },
  { default: adminAuthRouter },
  { usageLogsRouter },
  { ssoRouter },
] = await Promise.all([
  import('express'),
  import('./db.js'),
  import('./routes/auth.js'),
  import('./routes/model-config.js'),
  import('./routes/export-jobs.js'),
  import('./export-job-runner.js'),
  import('./routes/ai-proxy.js'),
  import('./middleware/auth.js'),
  import('./middleware/whitelist.js'),
  import('./routes/security-config.js'),
  import('./middleware/cors.js'),
  import('./middleware/rate-limit.js'),
  import('./middleware/credits.js'),
  import('./routes/credits.js'),
  import('./middleware/request-logger.js'),
  import('./routes/conversations.js'),
  import('./routes/admin-password.js'),
  import('./routes/admin-auth.js'),
  import('./routes/usage-logs.js'),
  import('./routes/sso.js'),
]);

const { migratePlaintextKeys } = await import('./routes/model-config.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const { default: cookieParser } = await import('cookie-parser');

const START_TIME = Date.now();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function validateStartupConfig(): void {
  requireEnv('ADMIN_PASSWORD');

  const enableDevAuth = process.env.ENABLE_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production';
  if (enableDevAuth) {
    return;
  }

  requireEnv('EKP_BASE_URL');
  requireEnv('EKP_SSO_USER');
  requireEnv('EKP_SSO_PASS');
}

app.use(dynamicCors);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  res.removeHeader('X-Powered-By');
  next();
});

app.get('/api/health', async (_req, res) => {
  try {
    const { db } = await import('./db.js');
    const ok = db != null;
    res.json({
      status: ok ? 'ok' : 'degraded',
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      db: ok ? 'connected' : 'disconnected',
      version: '1.0.0',
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/model-config', adminAuthMiddleware, modelConfigRouter);
app.use('/api/security-config', adminAuthMiddleware, securityConfigRouter);
app.use('/api/admin-password', adminAuthMiddleware, adminPasswordRouter);
app.use('/api/admin/usage-logs', adminAuthMiddleware, usageLogsRouter);
app.get('/api/landing-prompts-config', async (_req, res) => {
  try {
    const { getLandingPromptsConfig } = await import('./db.js');
    const config = getLandingPromptsConfig();
    res.json({ enabled: config?.enabled ?? true, entries: config?.entries ?? [], updated_at: config?.updated_at });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.put('/api/landing-prompts-config', adminAuthMiddleware, async (req, res) => {
  try {
    const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : undefined;
    const raw = req.body?.entries;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ error: 'entries must be an array' });
    }
    const entries = raw.map((item: any, index: number) => {
      if (!item || typeof item !== 'object') return { label: `主题 ${index + 1}`, prompt: '', primaryHint: '' };
      return {
        label: typeof item.label === 'string' ? item.label.trim() : `主题 ${index + 1}`,
        prompt: typeof item.prompt === 'string' ? item.prompt.trim() : '',
        primaryHint: typeof item.primaryHint === 'string' ? item.primaryHint.trim() : '',
      };
    }).filter((entry: any) => entry.label && entry.prompt);
    if (entries.length === 0) {
      return res.status(400).json({ error: 'At least one entry with label and prompt is required' });
    }
    const { updateLandingPromptsConfig, getLandingPromptsConfig } = await import('./db.js');
    updateLandingPromptsConfig(entries, enabled);
    const updated = getLandingPromptsConfig();
    res.json({ success: true, enabled: updated.enabled, entries: updated.entries, updated_at: updated.updated_at });
  } catch (error) {
    logger.error('Error updating landing prompts config', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/auth/sso', ssoRouter);
app.use('/api/theme', authMiddleware);
app.use('/api/theme', whitelistMiddleware);
app.use('/api/theme', (req: any, _res: any, next: any) => {
  const loginName = req.loginName as string | undefined;
  if (loginName) {
    req.userId = ensureUserByLoginName(loginName);
  }
  next();
});
app.use('/api/theme', rateLimitMiddleware);
app.use('/api/theme', creditsMiddleware);
app.use('/api/theme', exportJobsRouter);
app.use('/api/theme', aiProxyRouter);
app.use('/api/theme/credits', creditsRouter);
app.use('/api/theme/conversations', conversationsRouter);

app.use('/admin', express.static(join(__dirname, '..', 'admin')));
app.get('/admin/{*splat}', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'admin', 'index.html'));
});

const webDist = join(__dirname, '..', '..', 'web', 'dist');
app.use('/assets', express.static(join(webDist, 'assets'), {
  maxAge: '365d',
  immutable: true,
}));
app.use(express.static(webDist));
app.get('/{*splat}', (_req, res) => {
  const indexPath = join(webDist, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run: npm run build');
  }
});

let server: ReturnType<typeof app.listen> | null = null;

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      closeDb();
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    closeDb();
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  validateStartupConfig();
  await initDb();
  const { db } = await import('./db.js');

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const loginName = (req as any).loginName;
    if (!loginName) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = ensureUserByLoginName(loginName);
    res.json({ id: userId, name: loginName, display_name: loginName });
  });

  app.get('/api/auth/diagnose', (req, res) => {
    const allCookies = req.cookies ? Object.keys(req.cookies) : [];
    const ssoCookies: Record<string, { found: boolean; length?: number; prefix?: string }> = {};
    for (const name of ['LRToken', 'LtpaToken', 'LR_myekp']) {
      const val = req.cookies?.[name];
      ssoCookies[name] = val
        ? { found: true, length: val.length, prefix: val.substring(0, 8) + '...' }
        : { found: false };
    }
    const ekpConfigured = !!(process.env.EKP_BASE_URL);
    const tokenPath = process.env.EKP_TOKEN_RESOLVE_PATH || '/sys/authentication/sso/loginService_rest/getTokenLoginName';
    const isDevMode = process.env.ENABLE_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production';
    const xForwardedProto = req.headers['x-forwarded-proto'] || null;
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || '';

    const warnings: string[] = [];
    if (isDevMode) warnings.push('ENABLE_DEV_AUTH=true in production — all auth bypassed');
    if (xForwardedProto === 'http' && req.headers.host?.endsWith('.landray.com.cn')) {
      warnings.push('x-forwarded-proto is http but host is landray.com.cn — should be https');
    }
    if (!ssoCookies.LRToken.found && !ssoCookies.LtpaToken.found && !ssoCookies.LR_myekp.found) {
      warnings.push('No EKP SSO cookies received — EKP cookies may not be scoped to .landray.com.cn');
    }
    if (!publicBaseUrl && xForwardedProto !== 'https') {
      warnings.push('Set PUBLIC_BASE_URL=https://cloud-theme.landray.com.cn to fix callback URL');
    }

    res.json({
      host: req.headers.host,
      origin: req.headers.origin || null,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      xForwardedProto,
      allCookieNames: allCookies,
      ssoCookies,
      ekpConfigured,
      tokenResolvePath: tokenPath,
      publicBaseUrl,
      devMode: isDevMode,
      warnings,
    });
  });

  app.get('/api/auth/test-sso', async (req, res) => {
    const result: Record<string, any> = { step1_cookies: {}, step2_api: {}, conclusion: '' };

    // Step 1: Check cookies
    const ssoCookieNames = ['LRToken', 'LtpaToken', 'LR_myekp'];
    let foundToken: string | undefined;
    let foundTokenName: string | undefined;
    for (const name of ssoCookieNames) {
      const val = req.cookies?.[name];
      result.step1_cookies[name] = val ? { found: true, length: val.length, prefix: val.substring(0, 8) + '...' } : { found: false };
      if (val && !foundToken) { foundToken = val; foundTokenName = name; }
    }
    result.step1_allCookies = req.cookies ? Object.keys(req.cookies) : [];

    if (!foundToken) {
      result.conclusion = 'FAIL: 浏览器没有发送任何 EKP Cookie，请确认已登录 EKP 且 Cookie 域名为 .landray.com.cn';
      res.json(result);
      return;
    }

    // Step 2: Call EKP API directly with full diagnostics
    const EKP_BASE_URL = process.env.EKP_BASE_URL || '';
    const EKP_SSO_USER = process.env.EKP_SSO_USER || '';
    const EKP_SSO_PASS = process.env.EKP_SSO_PASS || '';
    const tokenPath = process.env.EKP_TOKEN_RESOLVE_PATH || '/sys/authentication/sso/loginService_rest/getTokenLoginName';
    const resolveUrl = `${EKP_BASE_URL.replace(/\/+$/, '')}${tokenPath}?token=${encodeURIComponent(foundToken)}`;

    result.step2_api = {
      url: resolveUrl.replace(/token=[^&]+/, 'token=***'),
      tokenName: foundTokenName,
      hasCredentials: !!(EKP_SSO_USER && EKP_SSO_PASS),
      user: EKP_SSO_USER || '(none)',
    };

    try {
      const headers: Record<string, string> = {};
      if (EKP_SSO_USER && EKP_SSO_PASS) {
        headers.Authorization = `Basic ${Buffer.from(`${EKP_SSO_USER}:${EKP_SSO_PASS}`).toString('base64')}`;
      }

      const apiRes = await fetch(resolveUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      });

      result.step2_api.httpStatus = apiRes.status;
      result.step2_api.location = apiRes.headers.get('location');

      const body = await apiRes.text();
      result.step2_api.bodyPreview = body.substring(0, 500);

      if (apiRes.status >= 300 && apiRes.status < 400) {
        result.conclusion = `FAIL: API 返回 ${apiRes.status} 重定向到 ${apiRes.headers.get('location')}（认证被拒绝或路径错误）`;
      } else {
        try {
          const data = JSON.parse(body);
          result.step2_api.parsedJson = data;
          if (data.result && data.loginName) {
            result.conclusion = `SUCCESS: 用户 ${data.loginName} 认证成功`;
          } else {
            result.conclusion = `FAIL: API 返回 JSON 但验证失败 — result=${data.result}, errorMsg=${data.errorMsg || '(none)'}`;
          }
        } catch {
          result.conclusion = `FAIL: API 返回非 JSON 内容（HTTP ${apiRes.status}），可能是路径错误或需要登录`;
        }
      }
    } catch (err: any) {
      result.step2_api.error = err.message;
      result.conclusion = `FAIL: API 调用异常 — ${err.message}`;
    }

    res.json(result);
  });

  app.get('/api/auth/users', adminAuthMiddleware, async (_req, res) => {
    try {
      const stmt = db.prepare('SELECT id, name, display_name, last_login_at FROM users ORDER BY last_login_at DESC, id ASC');
      const users: Array<{ id: number; name: string; display_name: string; last_login_at: number | null }> = [];
      while (stmt.step()) {
        users.push(stmt.getAsObject() as any);
      }
      stmt.free();
      res.json(users);
    } catch (error) {
      logger.error('List users error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use('/api/auth', adminAuthMiddleware, authRouter);

  app.get('/api/admin/users/:userId/conversations', adminAuthMiddleware, (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user id' });
      }
      const stmt = db.prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC');
      stmt.bind([userId]);
      const convos: any[] = [];
      while (stmt.step()) {
        convos.push(stmt.getAsObject());
      }
      stmt.free();
      res.json(convos);
    } catch (error) {
      logger.error('Get user conversations error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/conversations/:id/messages', adminAuthMiddleware, (req, res) => {
    try {
      const stmt = db.prepare('SELECT id, messages, title FROM conversations WHERE id = ?');
      stmt.bind([req.params.id]);
      let row: any = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      if (!row) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      let messages: any[] = [];
      try {
        messages = JSON.parse(String(row.messages || '[]'));
      } catch {}
      res.json({ id: row.id, title: row.title, messages });
    } catch (error) {
      logger.error('Get conversation messages error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  startExportJobRunner();

  migratePlaintextKeys();

  const HOST = process.env.HOST || '0.0.0.0';
  server = app.listen(PORT, HOST, () => {
    logger.info(`Theme Studio API running on ${HOST}:${PORT}`);
  });
  server.timeout = 5 * 60 * 1000;
  server.headersTimeout = 5 * 60 * 1000 + 1000;
  server.keepAliveTimeout = 65000;
}

start().catch(err => {
  logger.error('Failed to start server', { message: err.message, stack: err.stack });
  process.exit(1);
});
