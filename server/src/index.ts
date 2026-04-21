import { config } from 'dotenv';
config();

const [
  { default: express },
  { default: cors },
  { initDb },
  { authRouter },
  { projectsRouter },
  { messagesRouter },
  { aiProxyRouter },
  { authMiddleware },
] = await Promise.all([
  import('express'),
  import('cors'),
  import('./db.js'),
  import('./routes/auth.js'),
  import('./routes/projects.js'),
  import('./routes/messages.js'),
  import('./routes/ai-proxy.js'),
  import('./middleware/auth.js'),
]);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/theme', authMiddleware);
app.use('/api/theme/projects', projectsRouter);
app.use('/api/theme/projects', messagesRouter);
app.use('/api/theme', aiProxyRouter);

async function start() {
  await initDb();
  console.log(`Theme Studio API running on port ${PORT}`);
  app.listen(PORT);
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
