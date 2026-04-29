import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

[
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
  { default: securityConfigRouter },
  { dynamicCors },
  { rateLimitMiddleware },
  { creditsMiddleware },
  { creditsRouter },
  { requestLogger },
  { conversationsRouter },
  { default: adminPasswordRouter },
  { default: adminAuthRouter },
] = await Promise.all([
  import('express'),
  import('./db.js'),
  import('./routes/auth.js'),
  import('./routes/model-config.js'),
  import('./routes/export-jobs.js'),
  import('./export-job-runner.js'),
  import('./routes/ai-proxy.js'),
  import('./middleware/auth.js'),
  import('./routes/security-config.js'),
  import('./middleware/cors.js'),
  import('./middleware/rate-limit.js'),
  import('./middleware/credits.js'),
  import('./routes/credits.js'),
  import('./middleware/request-logger.js'),
  import('./routes/conversations.js'),
  import('./routes/admin-password.js'),
  import('./routes/admin-auth.js'),
  import('cookie-parser'),
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const { default: cookieParser } = await import('cookie-parser');

const START_TIME = Date.now();

app.use(dynamicCors);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
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
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/theme', authMiddleware);
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
  await initDb();
  const { db, getSecurityConfig } = await import('./db.js');

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const loginName = (req as any).loginName;
    if (!loginName) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = ensureUserByLoginName(loginName);
    res.json({ id: userId, name: loginName, display_name: loginName });
  });

  app.get('/api/auth/users', async (_req, res) => {
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

  startExportJobRunner();

  server = app.listen(PORT, () => {
    logger.info(`Theme Studio API running on port ${PORT}`);
  });
  server.timeout = 5 * 60 * 1000;
  server.headersTimeout = 5 * 60 * 1000 + 1000;
  server.keepAliveTimeout = 65000;
}

start().catch(err => {
  logger.error('Failed to start server', { message: err.message, stack: err.stack });
  process.exit(1);
});
