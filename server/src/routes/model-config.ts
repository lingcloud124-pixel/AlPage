import { Router } from 'express';
import { db, saveDb } from '../db.js';
import { logger } from '../logger.js';
import { decryptIfNeeded, encryptIfNeeded, hasEncryptionKey, isEncrypted } from '../crypto.js';

const router = Router();

const DEFAULT_CHAT_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_CHAT_MODEL = 'qwen3.6-plus';
const DEFAULT_IMAGE_ENDPOINT = 'https://api.minimaxi.com/v1/image_generation';
const DEFAULT_IMAGE_MODEL = 'image-01';
const DEFAULT_VOLCENGINE_IMAGE_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DEFAULT_VOLCENGINE_IMAGE_MODEL = 'doubao-seedream-3-0-t2i-250415';
const DEFAULT_JIMENG_IMAGE_ENDPOINT = 'https://visual.volcengineapi.com';
const DEFAULT_JIMENG_IMAGE_MODEL = 'jimeng_t2i_v40';

type ImageProvider = 'minimax' | 'jimeng' | 'ark';

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getEnvModelConfig(): {
  chatEndpoint: string;
  chatApiKey: string;
  chatModel: string;
  imageProvider: ImageProvider;
  imageEndpoint: string;
  imageApiKey: string;
  imageAccessKeyId: string;
  imageSecretAccessKey: string;
  imageModel: string;
  jimengAccessKey: string;
  jimengSecretKey: string;
} {
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
  const imageProvider = imageApiKey
    ? 'minimax'
    : hasJimengCredentials
      ? 'jimeng'
      : hasVolcengineImageCredentials
        ? 'ark'
        : 'minimax';

  return {
    chatEndpoint: chatApiKey
      ? firstNonEmpty(process.env.CHAT_API_ENDPOINT, process.env.DASHSCOPE_CHAT_ENDPOINT, DEFAULT_CHAT_ENDPOINT)
      : '',
    chatApiKey,
    chatModel: chatApiKey
      ? firstNonEmpty(process.env.CHAT_MODEL, process.env.DASHSCOPE_CHAT_MODEL, DEFAULT_CHAT_MODEL)
      : '',
    imageProvider,
    imageEndpoint: imageApiKey
      ? firstNonEmpty(process.env.IMAGE_API_ENDPOINT, process.env.MINIMAX_IMAGE_ENDPOINT, DEFAULT_IMAGE_ENDPOINT)
      : hasJimengCredentials
        ? firstNonEmpty(process.env.JIMENG_IMAGE_API_ENDPOINT, DEFAULT_JIMENG_IMAGE_ENDPOINT)
        : hasVolcengineImageCredentials
          ? firstNonEmpty(process.env.VOLCENGINE_IMAGE_API_ENDPOINT, process.env.VOLCENGINE_ARK_IMAGE_ENDPOINT, DEFAULT_VOLCENGINE_IMAGE_ENDPOINT)
          : '',
    imageApiKey,
    imageAccessKeyId: jimengAccessKey || volcengineImageAk,
    imageSecretAccessKey: jimengSecretKey || volcengineImageSk,
    imageModel: imageApiKey
      ? firstNonEmpty(process.env.IMAGE_MODEL, process.env.MINIMAX_IMAGE_MODEL, DEFAULT_IMAGE_MODEL)
      : hasJimengCredentials
        ? firstNonEmpty(process.env.JIMENG_IMAGE_MODEL, DEFAULT_JIMENG_IMAGE_MODEL)
        : hasVolcengineImageCredentials
          ? firstNonEmpty(process.env.VOLCENGINE_IMAGE_MODEL, process.env.VOLCENGINE_ARK_IMAGE_MODEL, process.env.VOLCENGINE_ARK_IMAGE_RESOURCE_ID, DEFAULT_VOLCENGINE_IMAGE_MODEL)
          : '',
    jimengAccessKey,
    jimengSecretKey,
  };
}

type EnvModelConfig = ReturnType<typeof getEnvModelConfig>;

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return '****' + key.slice(-4);
}

function isMaskedApiKeyCandidate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^\*{4,}/.test(trimmed);
}

function inferImageProvider(
  provider: string,
  imageEndpoint: string,
  imageModel: string,
  envProvider: ImageProvider,
): ImageProvider {
  if (provider === 'minimax' || provider === 'jimeng' || provider === 'ark') {
    return provider;
  }

  const endpoint = imageEndpoint.toLowerCase();
  const model = imageModel.toLowerCase();

  if (endpoint.includes('visual.volcengineapi.com') || model.includes('jimeng')) {
    return 'jimeng';
  }
  if (endpoint.includes('volces.com') || endpoint.includes('/api/v3/images/generations') || model.startsWith('ep-') || model.includes('doubao')) {
    return 'ark';
  }
  if (imageEndpoint || imageModel) {
    return 'minimax';
  }
  return envProvider;
}

function normalizeModelConfig(row?: Record<string, unknown> | null) {
  const envConfig: EnvModelConfig = getEnvModelConfig();
  const rawImageEndpoint = String(row?.image_endpoint ?? '');
  const rawImageModel = String(row?.image_model ?? '');
  const storedImageProvider = inferImageProvider(
    String(row?.image_provider ?? '').trim(),
    rawImageEndpoint,
    rawImageModel,
    envConfig.imageProvider,
  );
  const storedChatApiKey = decryptIfNeeded(String(row?.chat_api_key ?? ''));
  const storedImageApiKey = decryptIfNeeded(String(row?.image_api_key ?? ''));
  const storedImageAccessKeyId = decryptIfNeeded(String(row?.image_access_key_id ?? ''));
  const storedImageSecretAccessKey = decryptIfNeeded(String(row?.image_secret_access_key ?? ''));
  const normalizedStoredChatApiKey = isMaskedApiKeyCandidate(storedChatApiKey) ? '' : storedChatApiKey;
  const normalizedStoredImageApiKey = isMaskedApiKeyCandidate(storedImageApiKey) ? '' : storedImageApiKey;
  const normalizedStoredImageAccessKeyId = isMaskedApiKeyCandidate(storedImageAccessKeyId) ? '' : storedImageAccessKeyId;
  const normalizedStoredImageSecretAccessKey = isMaskedApiKeyCandidate(storedImageSecretAccessKey) ? '' : storedImageSecretAccessKey;

  return {
    chatEndpoint: firstNonEmpty(String(row?.chat_endpoint ?? ''), envConfig.chatEndpoint),
    chatApiKey: firstNonEmpty(normalizedStoredChatApiKey, envConfig.chatApiKey),
    chatModel: firstNonEmpty(String(row?.chat_model ?? ''), envConfig.chatModel),
    imageProvider: storedImageProvider,
    imageEndpoint: firstNonEmpty(rawImageEndpoint, envConfig.imageEndpoint),
    imageApiKey: firstNonEmpty(normalizedStoredImageApiKey, envConfig.imageApiKey),
    imageAccessKeyId: firstNonEmpty(normalizedStoredImageAccessKeyId, envConfig.imageAccessKeyId),
    imageSecretAccessKey: firstNonEmpty(normalizedStoredImageSecretAccessKey, envConfig.imageSecretAccessKey),
    imageModel: firstNonEmpty(rawImageModel, envConfig.imageModel),
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
      imageProvider: config.imageProvider,
      imageEndpoint: config.imageEndpoint,
      imageApiKey: maskApiKey(config.imageApiKey),
      imageAccessKeyId: maskApiKey(config.imageAccessKeyId),
      imageSecretAccessKey: maskApiKey(config.imageSecretAccessKey),
      imageModel: config.imageModel,
    });
  } catch (error) {
    logger.error('Get model config error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const {
      chatEndpoint, chatApiKey, chatModel,
      imageProvider, imageEndpoint, imageApiKey, imageAccessKeyId, imageSecretAccessKey, imageModel,
    } = req.body;

    const existingStmt = db.prepare('SELECT chat_api_key, image_api_key, image_access_key_id, image_secret_access_key FROM model_config WHERE id = 1');
    let existing: Record<string, unknown> | null = null;
    if (existingStmt.step()) {
      existing = existingStmt.getAsObject() as Record<string, unknown>;
    }
    existingStmt.free();
    const normalizedExistingConfig = normalizeModelConfig(existing);

    const resolvedChatApiKey = (!chatApiKey || isMaskedApiKeyCandidate(chatApiKey))
      ? normalizedExistingConfig.chatApiKey
      : chatApiKey;
    const resolvedImageApiKey = (!imageApiKey || isMaskedApiKeyCandidate(imageApiKey))
      ? normalizedExistingConfig.imageApiKey
      : imageApiKey;
    const resolvedImageAccessKeyId = (!imageAccessKeyId || isMaskedApiKeyCandidate(imageAccessKeyId))
      ? normalizedExistingConfig.imageAccessKeyId
      : imageAccessKeyId;
    const resolvedImageSecretAccessKey = (!imageSecretAccessKey || isMaskedApiKeyCandidate(imageSecretAccessKey))
      ? normalizedExistingConfig.imageSecretAccessKey
      : imageSecretAccessKey;

    const stmt = db.prepare(`
      UPDATE model_config SET
        chat_endpoint = ?, chat_api_key = ?, chat_model = ?,
        image_provider = ?, image_endpoint = ?, image_api_key = ?, image_access_key_id = ?, image_secret_access_key = ?, image_model = ?,
        updated_at = unixepoch()
      WHERE id = 1
    `);
    stmt.bind([
      chatEndpoint ?? '', encryptIfNeeded(resolvedChatApiKey), chatModel ?? '',
      imageProvider ?? 'minimax', imageEndpoint ?? '', encryptIfNeeded(resolvedImageApiKey), encryptIfNeeded(resolvedImageAccessKeyId), encryptIfNeeded(resolvedImageSecretAccessKey), imageModel ?? '',
    ]);
    stmt.step();
    stmt.free();
    saveDb();

    res.json({ success: true });
  } catch (error) {
    logger.error('Update model config error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function migratePlaintextKeys(): void {
  if (!hasEncryptionKey()) return;
  const stmt = db.prepare('SELECT chat_api_key, image_api_key, image_access_key_id, image_secret_access_key FROM model_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  if (!row) return;

  const fields: Array<{ col: string; val: string }> = [];
  for (const [col, val] of Object.entries(row)) {
    const str = String(val ?? '');
    if (str && !isEncrypted(str) && str.length > 4 && !/^\*{4,}/.test(str)) {
      fields.push({ col, val: encryptIfNeeded(str) });
    }
  }
  if (fields.length === 0) return;

  const setClauses = fields.map(f => `${f.col} = ?`).join(', ');
  const updateStmt = db.prepare(`UPDATE model_config SET ${setClauses} WHERE id = 1`);
  updateStmt.bind(fields.map(f => f.val));
  updateStmt.step();
  updateStmt.free();
  saveDb();
  logger.info('Migrated plaintext API keys to encrypted storage', { count: fields.length });
}

export function getModelConfig(): {
  chatEndpoint: string; chatApiKey: string; chatModel: string;
  imageProvider: ImageProvider;
  imageEndpoint: string; imageApiKey: string; imageAccessKeyId: string; imageSecretAccessKey: string; imageModel: string;
  jimengAccessKey: string; jimengSecretKey: string;
} {
  const stmt = db.prepare('SELECT * FROM model_config WHERE id = 1');
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) {
    row = stmt.getAsObject() as Record<string, unknown>;
  }
  stmt.free();
  const result = normalizeModelConfig(row);
  return result;
}

export { router as modelConfigRouter };
