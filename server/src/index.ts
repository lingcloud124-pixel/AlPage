import { config } from 'dotenv';

const [
  { default: express },
  { initDb },
  { authRouter },
  { modelConfigRouter },
  { projectsRouter },
  { messagesRouter },
  { confirmedVersionsRouter },
  { exportJobsRouter },
  { startExportJobRunner },
  { aiProxyRouter },
  { authMiddleware, adminAuthMiddleware },
  { default: securityConfigRouter },
  { dynamicCors },
  { rateLimitMiddleware },
  { quotaMiddleware },
] = await Promise.all([
  import('express'),
  import('./db.js'),
  import('./routes/auth.js'),
  import('./routes/model-config.js'),
  import('./routes/projects.js'),
  import('./routes/messages.js'),
  import('./routes/confirmed-versions.js'),
  import('./routes/export-jobs.js'),
  import('./export-job-runner.js'),
  import('./routes/ai-proxy.js'),
  import('./middleware/auth.js'),
  import('./routes/security-config.js'),
  import('./middleware/cors.js'),
  import('./middleware/rate-limit.js'),
  import('./middleware/quota.js'),
]);

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: join(__dirname, '..', '..', '.env') });
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(dynamicCors);
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', adminAuthMiddleware, authRouter);
app.use('/api/model-config', adminAuthMiddleware, modelConfigRouter);
app.use('/api/security-config', adminAuthMiddleware, securityConfigRouter);
app.use('/api/theme', authMiddleware);
app.use('/api/theme', rateLimitMiddleware);
app.use('/api/theme', quotaMiddleware);
app.use('/api/theme/projects', projectsRouter);
app.use('/api/theme/projects', messagesRouter);
app.use('/api/theme/projects', confirmedVersionsRouter);
app.use('/api/theme', exportJobsRouter);
app.use('/api/theme', aiProxyRouter);

app.use('/admin', adminAuthMiddleware, express.static(join(__dirname, '..', 'admin')));
app.get('/admin/{*splat}', adminAuthMiddleware, (_req, res) => {
  res.sendFile(join(__dirname, '..', 'admin', 'index.html'));
});

async function start() {
  await initDb();
  startExportJobRunner();
  console.log(`Theme Studio API running on port ${PORT}`);
  app.listen(PORT);
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
