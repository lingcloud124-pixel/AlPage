import { Router } from 'express';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    if (!MINIMAX_API_KEY) {
      return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' });
    }

    const requestBody = {
      ...req.body,
      model: req.body?.model || 'MiniMax-M2.7',
      extra_body: {
        ...(req.body?.extra_body || {}),
        reasoning_split: true,
      },
    };

    const proxyReq = https.request({
      hostname: 'api.minimaxi.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      timeout: 300000,
    });

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
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    if (!MINIMAX_API_KEY) {
      return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' });
    }

    const proxyReq = https.request({
      hostname: 'api.minimaxi.com',
      port: 443,
      path: '/v1/image_generation',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 180000,
    });

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

    const body = JSON.stringify(req.body);
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
