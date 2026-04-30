import { Router } from 'express';
import { db } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/users', async (_req, res) => {
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

export { router as authRouter };