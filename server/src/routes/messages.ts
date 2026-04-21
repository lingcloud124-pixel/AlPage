import { Router } from 'express';
import { db, saveDb } from '../db.js';

const router = Router();

router.get('/:id/messages', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const projectStmt = db.prepare(
      'SELECT 1 FROM theme_projects WHERE id = ? AND user_id = ?'
    );
    projectStmt.bind([id, userId]);
    let projectExists = false;
    if (projectStmt.step()) {
      projectExists = true;
    }
    projectStmt.free();
    
    if (!projectExists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const stmt = db.prepare(
      'SELECT * FROM theme_chat_messages WHERE project_id = ? ORDER BY timestamp ASC'
    );
    stmt.bind([id]);
    const messages = [];
    while (stmt.step()) {
      messages.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/messages', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }
    
    const projectStmt = db.prepare(
      'SELECT 1 FROM theme_projects WHERE id = ? AND user_id = ?'
    );
    projectStmt.bind([id, userId]);
    let projectExists = false;
    if (projectStmt.step()) {
      projectExists = true;
    }
    projectStmt.free();
    
    if (!projectExists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    db.run('BEGIN TRANSACTION');
    
    try {
      const deleteStmt = db.prepare('DELETE FROM theme_chat_messages WHERE project_id = ?');
      deleteStmt.bind([id]);
      deleteStmt.step();
      deleteStmt.free();
      
      if (messages.length > 0) {
        const insertStmt = db.prepare(
          'INSERT INTO theme_chat_messages (project_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
        );
        
        for (const message of messages) {
          if (!message.role || !message.content || !message.timestamp) {
            throw new Error('Invalid message format');
          }
          insertStmt.bind([id, message.role, message.content, message.timestamp]);
          insertStmt.step();
        }
        insertStmt.free();
      }
      
      db.run('COMMIT');
      saveDb();
      res.json({ success: true });
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Save messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as messagesRouter };