import { Router } from 'express';
import http from 'http';
import https from 'https';
import { getModelConfig } from './model-config.js';
import { getSecurityConfig } from '../db.js';

const router = Router();

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
  try {
    const config = getModelConfig();
    const securityConfig = getSecurityConfig();
    if (securityConfig?.enabled_features?.chat === false) {
      return res.status(403).json({ error: '对话功能已关闭' });
    }
    if (!config.chatEndpoint || !config.chatApiKey) {
      return res.status(500).json({ error: 'Chat model not configured. Please configure in /admin' });
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
    if (securityConfig?.enabled_features?.image === false) {
      return res.status(403).json({ error: '生图功能已关闭' });
    }
    if (!config.imageEndpoint || !config.imageApiKey) {
      return res.status(500).json({ error: 'Image model not configured. Please configure in /admin' });
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
      res.status(500).json({ error: 'Internal server error' });
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
