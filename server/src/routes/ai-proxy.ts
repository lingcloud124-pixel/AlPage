import { Router } from 'express';
import http from 'http';
import https from 'https';
import { createHash, createHmac } from 'crypto';
import { getModelConfig } from './model-config.js';
import { getSecurityConfig, deductCredits } from '../db.js';
import { buildSignedRequest, VolcAuth } from '../services/jimeng-client.js';

const router = Router();
const VOLCENGINE_ARK_IMAGE_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const VOLCENGINE_ARK_GET_API_KEY_ENDPOINT = 'https://ark.cn-beijing.volcengineapi.com/?Action=GetApiKey&Version=2024-01-01';
const VOLCENGINE_ARK_IMAGE_MODEL = 'doubao-seedream-3-0-t2i-250415';
const VOLCENGINE_SERVICE = 'ark';
const tempApiKeyCache = new Map<string, { apiKey: string; expiresAt: number }>();

type ImageProvider = 'minimax' | 'ark';

function detectImageProvider(endpoint: string): ImageProvider {
  const normalized = endpoint.toLowerCase();
  if (normalized.includes('volces.com') || normalized.includes('/api/v3/images/generations')) {
    return 'ark';
  }
  return 'minimax';
}

function buildImageRequestBody(
  provider: ImageProvider,
  requestBody: Record<string, unknown>,
  configuredModel: string,
): Record<string, unknown> {
  const prompt = typeof requestBody.prompt === 'string' ? requestBody.prompt : '';
  const requestedModel = typeof requestBody.model === 'string' && requestBody.model.trim()
    ? requestBody.model
    : configuredModel;

  if (provider === 'ark') {
    const width = typeof requestBody.width === 'number' ? requestBody.width : 1920;
    const height = typeof requestBody.height === 'number' ? requestBody.height : 1080;
    return {
      model: requestedModel,
      prompt,
      size: `${width}x${height}`,
      response_format: requestBody.response_format ?? 'url',
      watermark: requestBody.watermark ?? false,
    };
  }

  return {
    ...requestBody,
    model: requestedModel,
    prompt,
    response_format: requestBody.response_format ?? 'url',
  };
}

function resolveTarget(endpoint: string): { client: typeof http | typeof https; options: http.RequestOptions } {
  const parsed = new URL(endpoint);
  const client = parsed.protocol === 'https:' ? https : http;
  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: 'POST',
    timeout: 300000,
  };
  return { client, options };
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmacSha256(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function formatVolcengineDate(date: Date): { xDate: string; shortDate: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    xDate: iso,
    shortDate: iso.slice(0, 8),
  };
}

function parseVolcengineRegion(endpoint: string): string {
  try {
    const hostname = new URL(endpoint).hostname;
    const match = hostname.match(/^ark\.([^.]+)\./);
    return match?.[1] || 'cn-beijing';
  } catch {
    return 'cn-beijing';
  }
}

function requestBuffer(client: typeof http | typeof https, options: http.RequestOptions, body?: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

type VolcengineArkImageConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  apiKeyEndpoint: string;
  imageEndpoint: string;
  resourceId: string;
  model: string;
  region: string;
  durationSeconds: number;
};

function extractVolcengineApiKey(response: Record<string, unknown>): string {
  if (typeof response.ApiKey === 'string') {
    return response.ApiKey;
  }
  const apiKeyObject = response.ApiKey as Record<string, unknown> | undefined;
  if (typeof apiKeyObject?.Key === 'string') {
    return apiKeyObject.Key;
  }
  return '';
}

function getVolcengineArkImageConfig(imageEndpoint: string, imageModel: string): VolcengineArkImageConfig | null {
  const accessKeyId = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_AK,
    process.env.VOLCENGINE_ACCESS_KEY_ID,
    process.env.VOLC_ACCESSKEY,
  );
  const secretAccessKey = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_SK,
    process.env.VOLCENGINE_SECRET_ACCESS_KEY,
    process.env.VOLC_SECRETKEY,
  );

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  const resolvedImageEndpoint = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_API_ENDPOINT,
    process.env.VOLCENGINE_ARK_IMAGE_ENDPOINT,
    imageEndpoint,
    VOLCENGINE_ARK_IMAGE_ENDPOINT,
  );
  const resolvedModel = firstNonEmpty(
    process.env.VOLCENGINE_IMAGE_MODEL,
    process.env.VOLCENGINE_ARK_IMAGE_MODEL,
    imageModel,
    VOLCENGINE_ARK_IMAGE_MODEL,
  );
  const explicitResourceId = firstNonEmpty(
    process.env.VOLCENGINE_ARK_IMAGE_RESOURCE_ID,
    process.env.VOLCENGINE_IMAGE_RESOURCE_ID,
  );
  const resourceId = explicitResourceId || (/^ep-/.test(resolvedModel) ? resolvedModel : '');

  return {
    accessKeyId,
    secretAccessKey,
    apiKeyEndpoint: firstNonEmpty(
      process.env.VOLCENGINE_ARK_GET_API_KEY_ENDPOINT,
      VOLCENGINE_ARK_GET_API_KEY_ENDPOINT,
    ),
    imageEndpoint: resolvedImageEndpoint,
    resourceId,
    model: resolvedModel,
    region: firstNonEmpty(process.env.VOLCENGINE_ARK_REGION, parseVolcengineRegion(resolvedImageEndpoint)),
    durationSeconds: Number.parseInt(process.env.VOLCENGINE_ARK_TEMP_API_KEY_SECONDS || '3600', 10) || 3600,
  };
}

async function getVolcengineTemporaryApiKey(config: VolcengineArkImageConfig): Promise<string> {
  const resourceId = await resolveVolcengineResourceId(config);
  const cacheKey = `${config.accessKeyId}:${resourceId}:${config.imageEndpoint}`;
  const cached = tempApiKeyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.apiKey;
  }

  const endpoint = new URL(config.apiKeyEndpoint);
  const payload = JSON.stringify({
    DurationSeconds: config.durationSeconds,
    ResourceType: 'endpoint',
    ResourceIds: [resourceId],
  });
  const result = await callVolcengineManagementApi(config, endpoint, payload);

  const raw = result.body.toString('utf8');
  const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`Volcengine GetApiKey failed (${result.statusCode}): ${raw}`);
  }

  const apiKey = extractVolcengineApiKey(parsed);
  if (!apiKey) {
    throw new Error(`Volcengine GetApiKey returned no ApiKey: ${raw}`);
  }

  const expiresAt = typeof parsed.ExpiredTime === 'string'
    ? Date.parse(parsed.ExpiredTime)
    : typeof parsed.ExpiredTime === 'number'
      ? Number(parsed.ExpiredTime)
      : Date.now() + config.durationSeconds * 1000;
  tempApiKeyCache.set(cacheKey, {
    apiKey,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + config.durationSeconds * 1000,
  });

  return apiKey;
}

async function callVolcengineManagementApi(
  config: VolcengineArkImageConfig,
  endpoint: URL,
  payload: string,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const payloadHash = sha256Hex(payload);
  const { xDate, shortDate } = formatVolcengineDate(new Date());
  const canonicalHeaders = [
    `host:${endpoint.host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`,
  ].join('\n');
  const signedHeaders = 'host;x-content-sha256;x-date';
  const canonicalRequest = [
    'POST',
    endpoint.pathname || '/',
    endpoint.searchParams.toString(),
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${shortDate}/${config.region}/${VOLCENGINE_SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const kDate = hmacSha256(config.secretAccessKey, shortDate);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, VOLCENGINE_SERVICE);
  const signingKey = hmacSha256(kService, 'request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorization = `HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return requestBuffer(https, {
    hostname: endpoint.hostname,
    port: endpoint.port || 443,
    path: `${endpoint.pathname}${endpoint.search}`,
    method: 'POST',
    timeout: 30_000,
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json',
      'Host': endpoint.host,
      'X-Content-Sha256': payloadHash,
      'X-Date': xDate,
    },
  }, payload);
}

function extractEndpointItems(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  const result = payload.Result as Record<string, unknown> | undefined;
  const items = result?.Items;
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
}

function chooseVolcengineEndpointId(items: Array<Record<string, unknown>>, desiredModel: string): string {
  const desired = desiredModel.toLowerCase();
  const ranked = items
    .map((item) => {
      const id = String(item.Id ?? '');
      const name = String(item.Name ?? '');
      const foundationModel = item.ModelReference as Record<string, unknown> | undefined;
      const foundationInfo = foundationModel?.FoundationModel as Record<string, unknown> | undefined;
      const foundationName = String(foundationInfo?.Name ?? '');
      const haystack = [id, name, foundationName].join(' ').toLowerCase();
      let score = 0;
      if (id === desiredModel) score += 100;
      if (name === desiredModel) score += 80;
      if (foundationName === desiredModel) score += 60;
      if (desired && haystack.includes(desired)) score += 20;
      return { id, score };
    })
    .filter(item => item.id)
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.score) {
    return ranked[0].id;
  }
  if (ranked.length === 1) {
    return ranked[0].id;
  }
  return '';
}

async function resolveVolcengineResourceId(config: VolcengineArkImageConfig): Promise<string> {
  if (config.resourceId && /^ep-/.test(config.resourceId)) {
    return config.resourceId;
  }

  const endpoint = new URL(config.apiKeyEndpoint.replace('Action=GetApiKey', 'Action=ListEndpoints'));
  const body = JSON.stringify({
    PageNumber: 1,
    PageSize: 100,
    Filter: {
      ModelOrServiceName: config.model,
      FoundationModelName: config.model,
    },
  });
  const result = await callVolcengineManagementApi(config, endpoint, body);
  const raw = result.body.toString('utf8');
  const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`Volcengine ListEndpoints failed (${result.statusCode}): ${raw}`);
  }

  const items = extractEndpointItems(parsed);
  const discovered = chooseVolcengineEndpointId(items, config.model);
  if (discovered) {
    return discovered;
  }

  throw new Error('No usable Volcengine Endpoint ID found. Please set VOLCENGINE_ARK_IMAGE_RESOURCE_ID to your image Endpoint ID.');
}

function normalizeArkImageSize(width: unknown, height: unknown): string {
  const parsedWidth = Number(width);
  const parsedHeight = Number(height);
  if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight) && parsedWidth > 0 && parsedHeight > 0) {
    return `${Math.round(parsedWidth)}x${Math.round(parsedHeight)}`;
  }
  return '1024x1024';
}

function buildVolcengineArkImageBody(body: any, fallbackModel: string) {
  return {
    model: body?.model || fallbackModel,
    prompt: String(body?.prompt || ''),
    response_format: body?.response_format || 'url',
    size: body?.size || normalizeArkImageSize(body?.width, body?.height),
    n: Number.isFinite(Number(body?.n)) ? Number(body.n) : 1,
    seed: Number.isFinite(Number(body?.seed)) ? Number(body.seed) : undefined,
    watermark: typeof body?.watermark === 'boolean' ? body.watermark : false,
  };
}

async function handleJimengImageRequest(
  auth: VolcAuth,
  reqBody: Record<string, unknown>,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const prompt = typeof reqBody.prompt === 'string' ? reqBody.prompt : '';
  const width = typeof reqBody.width === 'number' ? reqBody.width : 1920;
  const height = typeof reqBody.height === 'number' ? reqBody.height : 1080;

  const submitBody = {
    req_key: 'jimeng_t2i_v40',
    prompt,
    width,
    height,
    force_single: true,
  };

  const submitReq = buildSignedRequest(auth, 'CVSync2AsyncSubmitTask', '2022-08-31', submitBody);
  const submitResult = await requestBuffer(
    https,
    {
      hostname: 'visual.volcengineapi.com',
      port: 443,
      path: new URL(submitReq.url).search ? `/${new URL(submitReq.url).search}` : '/',
      method: 'POST',
      timeout: 30_000,
      headers: submitReq.headers as Record<string, string>,
    },
    submitReq.body,
  );

  const submitRaw = submitResult.body.toString('utf8');
  let submitParsed: Record<string, unknown>;
  try {
    submitParsed = JSON.parse(submitRaw);
  } catch {
    return { statusCode: 502, body: { error: `Jimeng submit parse error: ${submitRaw.slice(0, 200)}` } };
  }

  if (submitResult.statusCode < 200 || submitResult.statusCode >= 300) {
    return { statusCode: submitResult.statusCode, body: submitParsed };
  }

  const jimengCode = typeof submitParsed.code === 'number' ? submitParsed.code : 0;
  if (jimengCode !== 10000) {
    return {
      statusCode: typeof submitParsed.status === 'number' ? submitParsed.status as number : 502,
      body: { ...submitParsed, base_resp: { status_code: jimengCode, status_msg: submitParsed.message } },
    };
  }

  const taskId = String((submitParsed.data as Record<string, unknown>)?.task_id ?? '');
  if (!taskId) {
    return { statusCode: 502, body: { error: 'Jimeng returned no task_id', raw: submitRaw.slice(0, 300) } };
  }

  const POLL_INTERVAL_MS = 2000;
  const MAX_POLL_MS = 180_000;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const pollBody = {
      req_key: 'jimeng_t2i_v40',
      task_id: taskId,
      req_json: JSON.stringify({ return_url: true }),
    };

    const pollReq = buildSignedRequest(auth, 'CVSync2AsyncGetResult', '2022-08-31', pollBody);
    const pollResult = await requestBuffer(
      https,
      {
        hostname: 'visual.volcengineapi.com',
        port: 443,
        path: new URL(pollReq.url).search ? `/${new URL(pollReq.url).search}` : '/',
        method: 'POST',
        timeout: 30_000,
        headers: pollReq.headers as Record<string, string>,
      },
      pollReq.body,
    );

    const pollRaw = pollResult.body.toString('utf8');
    let pollParsed: Record<string, unknown>;
    try {
      pollParsed = JSON.parse(pollRaw);
    } catch {
      continue;
    }

    const pollCode = typeof pollParsed.code === 'number' ? pollParsed.code : 0;
    if (pollCode !== 10000) {
      return {
        statusCode: typeof pollParsed.status === 'number' ? pollParsed.status as number : 502,
        body: { ...pollParsed, base_resp: { status_code: pollCode, status_msg: pollParsed.message } },
      };
    }

    const pollData = pollParsed.data as Record<string, unknown> | undefined;
    const status = String(pollData?.status ?? '');

    if (status === 'done') {
      const imageUrls = pollData?.image_urls as string[] | undefined;
      if (imageUrls && imageUrls.length > 0) {
        return {
          statusCode: 200,
          body: {
            data: { image_urls: imageUrls },
            code: 10000,
            message: 'Success',
          },
        };
      }
      const binaryBase64 = pollData?.binary_data_base64 as string[] | undefined;
      if (binaryBase64 && binaryBase64.length > 0) {
        return {
          statusCode: 200,
          body: {
            data: { image_base64: binaryBase64 },
            code: 10000,
            message: 'Success',
          },
        };
      }
      return { statusCode: 502, body: { error: 'Jimeng done but no image data', raw: pollRaw.slice(0, 300) } };
    }

    if (status === 'not_found' || status === 'expired') {
      return {
        statusCode: 502,
        body: { error: `Jimeng task ${status}`, base_resp: { status_code: 50500, status_msg: `Task ${status}` } },
      };
    }
  }

  return { statusCode: 504, body: { error: 'Jimeng generation timeout (180s)', base_resp: { status_code: 50500, status_msg: 'Generation timeout' } } };
}

function validateProxyImageHost(url: string): boolean {
  try {
    const securityConfig = getSecurityConfig();
    
    if (securityConfig?.enabled_features?.proxyImage === false) {
      return false;
    }
    
    const allowedHosts = securityConfig?.proxy_image_hosts || [];
    if (allowedHosts.length === 0) {
      return true;
    }
    
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname;
    
    return allowedHosts.some((allowedHost: string) => {
      if (allowedHost === '*') return true;
      if (allowedHost === host) return true;
      
      if (allowedHost.startsWith('*.') && allowedHost.length > 2) {
        const domain = allowedHost.slice(2);
        return host.endsWith('.' + domain) || host === domain;
      }
      
      return false;
    });
  } catch (error) {
    console.error('Error validating proxy image host:', error);
    return false;
  }
}

router.post('/chat', async (req, res) => {
  const chatUserId = (req as any).userId || 1;
  const chatSecurityConfig = getSecurityConfig();
  const chatCreditsPerConv = chatSecurityConfig?.credits_per_conversation ?? 50;
  res.on('finish', () => {
    if (
      chatSecurityConfig?.enabled_features?.quota !== false &&
      res.statusCode &&
      res.statusCode >= 200 &&
      res.statusCode < 300
    ) {
      deductCredits(chatUserId, chatCreditsPerConv);
    }
  });
  try {
    const config = getModelConfig();
    const securityConfig = getSecurityConfig();
    if (securityConfig?.enabled_features?.chat === false) {
      return res.status(403).json({ error: '对话功能已关闭' });
    }

    if (!config.chatEndpoint || !config.chatApiKey) {
      return res.status(500).json({ error: 'Chat model not configured. Please configure it in /admin or provide VITE_DASHSCOPE_API_KEY / CHAT_API_KEY in your env files.' });
    }

    const { client, options } = resolveTarget(config.chatEndpoint);
    options.headers = {
      'Authorization': `Bearer ${config.chatApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    const requestBody = {
      ...req.body,
      model: req.body?.model || config.chatModel || 'MiniMax-M2.7',
      extra_body: {
        ...(req.body?.extra_body || {}),
        reasoning_split: true,
      },
    };

    const proxyReq = client.request(options);

    proxyReq.on('response', (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || 'application/json';
      res.writeHead(proxyRes.statusCode!, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });

      if (!String(contentType).includes('text/event-stream')) {
        proxyRes.pipe(res);
        return;
      }

      let buffer = '';
      proxyRes.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            res.write(`${line}\n`);
            continue;
          }

          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') {
            res.write(`data: ${payload || '[DONE]'}\n\n`);
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta;
            const reasoningDetails = delta?.reasoning_details;

            if (Array.isArray(reasoningDetails) && reasoningDetails.length > 0) {
              const reasoningText = reasoningDetails
                .map((detail: { text?: string }) => detail?.text || '')
                .join('');

              if (reasoningText) {
                parsed.choices[0].delta.reasoning_content = reasoningText;
              }
            }

            res.write(`data: ${JSON.stringify(parsed)}\n\n`);
          } catch {
            res.write(`data: ${payload}\n\n`);
          }
        }
      });

      proxyRes.on('end', () => {
        if (buffer.trim()) {
          const trailing = buffer.trim();
          if (trailing.startsWith('data: ')) {
            res.write(`${trailing}\n\n`);
          } else {
            res.write(`data: ${trailing}\n\n`);
          }
        }
        res.end();
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Chat proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to proxy request' });
      }
    });

    proxyReq.on('timeout', () => {
      console.error('Chat proxy timeout');
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });

    const body = JSON.stringify(requestBody);
    proxyReq.write(body);
    proxyReq.end();
  } catch (error) {
    console.error('Chat proxy setup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/image', async (req, res) => {
  try {
    const config = getModelConfig();
    const securityConfig = getSecurityConfig();
    const selectedProvider = config.imageProvider || 'minimax';
    if (securityConfig?.enabled_features?.image === false) {
      return res.status(403).json({ error: '生图功能已关闭' });
    }
    if (selectedProvider === 'jimeng' && config.imageAccessKeyId && config.imageSecretAccessKey) {
      try {
        const result = await handleJimengImageRequest(
          { accessKey: config.imageAccessKeyId, secretKey: config.imageSecretAccessKey },
          (req.body ?? {}) as Record<string, unknown>,
        );
        if (result.statusCode >= 200 && result.statusCode < 300) {
          return res.status(result.statusCode).json(result.body);
        }
        console.warn(`[image] Jimeng failed (${result.statusCode}), falling back to next provider`);
      } catch (error) {
        console.warn('[image] Jimeng error, falling back to next provider:', error instanceof Error ? error.message : error);
      }
    }
    const volcengineArkConfig = selectedProvider === 'ark'
      ? getVolcengineArkImageConfig(config.imageEndpoint, config.imageModel)
      : null;
    if (selectedProvider === 'ark' && volcengineArkConfig) {
      const tempApiKey = await getVolcengineTemporaryApiKey(volcengineArkConfig);
      const requestBody = JSON.stringify(buildVolcengineArkImageBody(req.body, config.imageModel || volcengineArkConfig.model));
      const { client, options } = resolveTarget(volcengineArkConfig.imageEndpoint);
      options.headers = {
        'Authorization': `Bearer ${tempApiKey}`,
        'Content-Type': 'application/json',
      };
      options.timeout = 180000;

      const proxyReq = client.request(options);

      proxyReq.on('response', (proxyRes) => {
        res.writeHead(proxyRes.statusCode!, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        });

        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('Volcengine image proxy error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to proxy Volcengine image request' });
        }
      });

      proxyReq.on('timeout', () => {
        console.error('Volcengine image proxy timeout');
        proxyReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: 'Request timeout' });
        }
      });

      proxyReq.write(requestBody);
      proxyReq.end();
      return;
    }
    if (selectedProvider === 'jimeng' && (!config.imageAccessKeyId || !config.imageSecretAccessKey)) {
      return res.status(500).json({ error: 'Jimeng model not configured. Please provide imageAccessKeyId and imageSecretAccessKey in /admin or JIMENG_ACCESS_KEY / JIMENG_SECRET_KEY in your env files.' });
    }
    if (selectedProvider === 'ark' && !volcengineArkConfig) {
      return res.status(500).json({ error: 'Volcengine Ark image model not configured. Please provide Ark credentials in env files.' });
    }
    if (!config.imageEndpoint || !config.imageApiKey) {
      return res.status(500).json({ error: 'Image model not configured. Please configure it in /admin or provide VITE_MINIMAX_API_KEY / MINIMAX_API_KEY in your env files.' });
    }

    const { client, options } = resolveTarget(config.imageEndpoint);
    const provider = detectImageProvider(config.imageEndpoint);
    options.headers = {
      'Authorization': `Bearer ${config.imageApiKey}`,
      'Content-Type': 'application/json',
    };
    options.timeout = 180000;

    const proxyReq = client.request(options);

    proxyReq.on('response', (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Image proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to proxy request' });
      }
    });

    proxyReq.on('timeout', () => {
      console.error('Image proxy timeout');
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });

    const body = JSON.stringify(buildImageRequestBody(
      provider,
      (req.body ?? {}) as Record<string, unknown>,
      config.imageModel || 'image-01',
    ));
    proxyReq.write(body);
    proxyReq.end();
  } catch (error) {
    console.error('Image proxy setup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }
});

router.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    if (!validateProxyImageHost(url)) {
      return res.status(403).json({ error: 'Proxy image host not allowed' });
    }

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': 'Theme-Studio-Server/0.1.0',
      },
    });

    proxyReq.on('response', (proxyRes) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Image proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch image' });
      }
    });

    proxyReq.on('timeout', () => {
      console.error('Image proxy timeout');
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });

    proxyReq.end();
  } catch (error) {
    console.error('Image proxy setup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Invalid URL or internal server error' });
    }
  }
});

export { router as aiProxyRouter };
