import { Router } from 'express';
import { db, saveDb } from '../db.js';

const router = Router();

const DEFAULT_CHAT_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_CHAT_MODEL = 'qwen3.6-plus';
const DEFAULT_IMAGE_ENDPOINT = 'https://api.minimaxi.com/v1/image_generation';
const DEFAULT_IMAGE_MODEL = 'image-01';
const DEFAULT_VOLCENGINE_IMAGE_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DEFAULT_VOLCENGINE_IMAGE_MODEL = 'doubao-seedream-3-0-t2i-250415';

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getEnvModelConfig() {
  const chatApiKey = firstNonEmpty(
    process.env.CHAT_API_KEY,
    process.env.DASHSCOPE_API_KEY,
    process.env.VITE_DASHSCOPE_API_KEY,
  );
  const imageApiKey = firstNonEmpty(
    process.env.IMAGE_API_KEY,
    process.env.VITE_MINIMAX_API_KEY,
    process.env.MINIMAX_API_KEY,
  );
  const volcengineImageAk = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_AK,
    process.env.VOLCENGINE_ACCESS_KEY_ID,
    process.env.VOLC_ACCESSKEY,
  );
  const volcengineImageSk = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_SK,
    process.env.VOLCENGINE_SECRET_ACCESS_KEY,
    process.env.VOLC_SECRETKEY,
  );
  const hasVolcengineImageCredentials = Boolean(volcengineImageAk && volcengineImageSk);
  const jimengAccessKey = firstNonEmpty(
    process.env.JIMENG_ACCESS_KEY,
  );
  const jimengSecretKey = firstNonEmpty(
    process.env.JIMENG_SECRET_KEY,
  );
  const hasJimengCredentials = Boolean(jimengAccessKey && jimengSecretKey);

  return {
    chatEndpoint: chatApiKey
      ? firstNonEmpty(process.env.CHAT_API_ENDPOINT, process.env.DASHSCOPE_CHAT_ENDPOINT, DEFAULT_CHAT_ENDPOINT)
      : '',
    chatApiKey,
    chatModel: chatApiKey
      ? firstNonEmpty(process.env.CHAT_MODEL, process.env.DASHSCOPE_CHAT_MODEL, DEFAULT_CHAT_MODEL)
      : '',
    imageEndpoint: imageApiKey
      ? firstNonEmpty(process.env.IMAGE_API_ENDPOINT, process.env.MINIMAX_IMAGE_ENDPOINT, DEFAULT_IMAGE_ENDPOINT)
      : hasVolcengineImageCredentials
        ? firstNonEmpty(process.env.VOLCENGINE_IMAGE_API_ENDPOINT, process.env.VOLCENGINE_ARK_IMAGE_ENDPOINT, DEFAULT_VOLCENGINE_IMAGE_ENDPOINT)
        : '',
    imageApiKey,
    imageModel: imageApiKey
      ? firstNonEmpty(process.env.IMAGE_MODEL, process.env.MINIMAX_IMAGE_MODEL, DEFAULT_IMAGE_MODEL)
      : hasVolcengineImageCredentials
        ? firstNonEmpty(process.env.VOLCENGINE_IMAGE_MODEL, process.env.VOLCENGINE_ARK_IMAGE_MODEL, process.env.VOLCENGINE_ARK_IMAGE_RESOURCE_ID, DEFAULT_VOLCENGINE_IMAGE_MODEL)
        : hasJimengCredentials
          ? 'jimeng-4.0'
          : '',
    jimengAccessKey,
    jimengSecretKey,
  };
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return '****' + key.slice(-4);
}

function normalizeModelConfig(row?: Record<string, unknown> | null) {
  const envConfig = getEnvModelConfig();

  return {
    chatEndpoint: firstNonEmpty(String(row?.chat_endpoint ?? ''), envConfig.chatEndpoint),
    chatApiKey: firstNonEmpty(String(row?.chat_api_key ?? ''), envConfig.chatApiKey),
    chatModel: firstNonEmpty(String(row?.chat_model ?? ''), envConfig.chatModel),
    imageEndpoint: firstNonEmpty(String(row?.image_endpoint ?? ''), envConfig.imageEndpoint),
    imageApiKey: firstNonEmpty(String(row?.image_api_key ?? ''), envConfig.imageApiKey),
    imageModel: firstNonEmpty(String(row?.image_model ?? ''), envConfig.imageModel),
    jimengAccessKey: envConfig.jimengAccessKey,
    jimengSecretKey: envConfig.jimengSecretKey,
  };
}

router.get('/', async (_req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM model_config WHERE id = 1');
    let row: Record<string, unknown> | null = null;
    if (stmt.step()) {
      row = stmt.getAsObject() as Record<string, unknown>;
    }
    stmt.free();

    const config = normalizeModelConfig(row);
    res.json({
      chatEndpoint: config.chatEndpoint,
      chatApiKey: maskApiKey(config.chatApiKey),
      chatModel: config.chatModel,
      imageEndpoint: config.imageEndpoint,
      imageApiKey: maskApiKey(config.imageApiKey),
      imageModel: config.imageModel,
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
  jimengAccessKey: string; jimengSecretKey: string;
} {
  const stmt = db.prepare('SELECT * FROM model_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  return normalizeModelConfig(row);
}

export { router as modelConfigRouter };
