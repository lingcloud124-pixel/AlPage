import { Router } from 'express';
import { db, saveDb } from '../db.js';

const router = Router();

router.get('/users', async (_req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, display_name FROM users ORDER BY id');
    const users: Array<{ id: number; name: string; display_name: string }> = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject() as any);
    }
    stmt.free();
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName) {
      return res.status(400).json({ error: 'displayName is required' });
    }
    const name = displayName.toLowerCase().replace(/\s+/g, '-');
    const stmt = db.prepare('INSERT INTO users (name, display_name) VALUES (?, ?)');
    stmt.bind([name, displayName]);
    stmt.step();
    stmt.free();
    saveDb();

    const id = db.exec('SELECT last_insert_rowid() as id');
    res.status(201).json({ id: id[0]?.values?.[0]?.[0], name, display_name: displayName });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.bind([parseInt(id, 10)]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRouter };