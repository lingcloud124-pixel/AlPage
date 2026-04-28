import { Router } from 'express';
import { db, saveDb } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

// GET / — List conversations
router.get('/', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const stmt = db.prepare(
      'SELECT id, title, has_generated_theme, is_starred, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
    );
    stmt.bind([userId]);
    const conversations: Array<{
      id: string;
      title: string;
      hasGeneratedTheme: number;
      isStarred: number;
      updatedAt: number;
    }> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      conversations.push({
        id: row.id,
        title: row.title,
        hasGeneratedTheme: row.has_generated_theme,
        isStarred: row.is_starred,
        updatedAt: row.updated_at,
      });
    }
    stmt.free();
    res.json(conversations);
  } catch (error) {
    logger.error('List conversations error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — Get conversation detail
router.get('/:id', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const stmt = db.prepare(
      'SELECT id, title, messages, project_snapshot, image_data, has_generated_theme, is_starred, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?'
    );
    stmt.bind([id, userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const row = stmt.getAsObject() as any;
    stmt.free();

    res.json({
      id: row.id,
      title: row.title,
      messages: JSON.parse(row.messages),
      projectSnapshot: JSON.parse(row.project_snapshot),
      imageData: row.image_data ? JSON.parse(row.image_data) : null,
      hasGeneratedTheme: row.has_generated_theme,
      isStarred: row.is_starred,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error('Get conversation detail error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — Create conversation
router.post('/', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id, title, messages, projectSnapshot, imageData, hasGeneratedTheme } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const finalTitle = title || '未命名项目';
    const finalMessages = messages ? JSON.stringify(messages) : '[]';
    const finalProjectSnapshot = projectSnapshot ? JSON.stringify(projectSnapshot) : '{}';
    const finalImageData = imageData ? JSON.stringify(imageData) : null;
    const finalHasGeneratedTheme = hasGeneratedTheme ?? 0;

    const stmt = db.prepare(
      'INSERT INTO conversations (id, user_id, title, messages, project_snapshot, image_data, has_generated_theme, is_starred, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'
    );
    stmt.bind([id, userId, finalTitle, finalMessages, finalProjectSnapshot, finalImageData, finalHasGeneratedTheme, now, now]);
    stmt.step();
    stmt.free();

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?');
    countStmt.bind([userId]);
    let count = 0;
    if (countStmt.step()) {
      count = (countStmt.getAsObject() as any).count as number;
    }
    countStmt.free();

    if (count > 30) {
      const deleteStmt = db.prepare(
        'DELETE FROM conversations WHERE user_id = ? AND is_starred = 0 AND id NOT IN (' +
        '  SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30' +
        ')'
      );
      deleteStmt.bind([userId, userId]);
      deleteStmt.step();
      deleteStmt.free();
    }

    saveDb();
    res.status(201).json({ id });
  } catch (error) {
    logger.error('Create conversation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id — Update conversation
router.put('/:id', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const { messages, projectSnapshot, title, imageData, hasGeneratedTheme } = req.body;
    const now = Math.floor(Date.now() / 1000);

    const updateFields: Record<string, any> = {};
    if (messages !== undefined) updateFields.messages = JSON.stringify(messages);
    if (projectSnapshot !== undefined) updateFields.project_snapshot = JSON.stringify(projectSnapshot);
    if (title !== undefined) updateFields.title = title;
    if (imageData !== undefined) updateFields.image_data = imageData ? JSON.stringify(imageData) : null;
    if (hasGeneratedTheme !== undefined) updateFields.has_generated_theme = hasGeneratedTheme;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const checkStmt = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?');
    checkStmt.bind([id, userId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Conversation not found' });
    }
    checkStmt.free();

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE conversations SET ${setClause}, updated_at = ? WHERE id = ? AND user_id = ?`;

    const stmt = db.prepare(sql);
    stmt.bind([...values, now, id, userId]);
    stmt.step();
    stmt.free();

    saveDb();
    res.json({ id });
  } catch (error) {
    logger.error('Update conversation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/star — Toggle star
router.put('/:id/star', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(
      'UPDATE conversations SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ? AND user_id = ?'
    );
    stmt.bind([now, id, userId]);
    stmt.step();
    stmt.free();

    saveDb();
    res.json({ id });
  } catch (error) {
    logger.error('Toggle star error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — Delete conversation
router.delete('/:id', (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?');
    stmt.bind([id, userId]);
    stmt.step();
    stmt.free();

    saveDb();
    res.json({ id });
  } catch (error) {
    logger.error('Delete conversation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as conversationsRouter };
