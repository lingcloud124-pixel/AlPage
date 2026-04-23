import { Router } from 'express';
import { db, saveDb } from '../db.js';

const router = Router();

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return '****' + key.slice(-4);
}

router.get('/', async (_req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM model_config WHERE id = 1');
    let row: Record<string, unknown> | null = null;
    if (stmt.step()) {
      row = stmt.getAsObject() as Record<string, unknown>;
    }
    stmt.free();

    if (!row) {
      return res.json({
        chatEndpoint: '', chatApiKey: '', chatModel: '',
        imageEndpoint: '', imageApiKey: '', imageModel: '',
      });
    }

    res.json({
      chatEndpoint: String(row.chat_endpoint ?? ''),
      chatApiKey: maskApiKey(String(row.chat_api_key ?? '')),
      chatModel: String(row.chat_model ?? ''),
      imageEndpoint: String(row.image_endpoint ?? ''),
      imageApiKey: maskApiKey(String(row.image_api_key ?? '')),
      imageModel: String(row.image_model ?? ''),
    });
  } catch (error) {
    console.error('Get model config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const {
      chatEndpoint, chatApiKey, chatModel,
      imageEndpoint, imageApiKey, imageModel,
    } = req.body;

    const existingStmt = db.prepare('SELECT chat_api_key, image_api_key FROM model_config WHERE id = 1');
    let existing: Record<string, unknown> | null = null;
    if (existingStmt.step()) {
      existing = existingStmt.getAsObject() as Record<string, unknown>;
    }
    existingStmt.free();

    const resolvedChatApiKey = (!chatApiKey || chatApiKey === '****')
      ? String(existing?.chat_api_key ?? '')
      : chatApiKey;
    const resolvedImageApiKey = (!imageApiKey || imageApiKey === '****')
      ? String(existing?.image_api_key ?? '')
      : imageApiKey;

    const stmt = db.prepare(`
      UPDATE model_config SET
        chat_endpoint = ?, chat_api_key = ?, chat_model = ?,
        image_endpoint = ?, image_api_key = ?, image_model = ?,
        updated_at = unixepoch()
      WHERE id = 1
    `);
    stmt.bind([
      chatEndpoint ?? '', resolvedChatApiKey, chatModel ?? '',
      imageEndpoint ?? '', resolvedImageApiKey, imageModel ?? '',
    ]);
    stmt.step();
    stmt.free();
    saveDb();

    res.json({ success: true });
  } catch (error) {
    console.error('Update model config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function getModelConfig(): {
  chatEndpoint: string; chatApiKey: string; chatModel: string;
  imageEndpoint: string; imageApiKey: string; imageModel: string;
} {
  const stmt = db.prepare('SELECT * FROM model_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  if (!row) {
    return { chatEndpoint: '', chatApiKey: '', chatModel: '', imageEndpoint: '', imageApiKey: '', imageModel: '' };
  }
  return {
    chatEndpoint: String(row.chat_endpoint ?? ''),
    chatApiKey: String(row.chat_api_key ?? ''),
    chatModel: String(row.chat_model ?? ''),
    imageEndpoint: String(row.image_endpoint ?? ''),
    imageApiKey: String(row.image_api_key ?? ''),
    imageModel: String(row.image_model ?? ''),
  };
}

export { router as modelConfigRouter };
