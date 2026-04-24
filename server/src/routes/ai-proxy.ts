import { Router } from 'express';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import { buildSignedRequest } from '../services/jimeng-client.js';

const router = Router();

const JIMENG_REQ_KEY = 'jimeng_t2i_v40';
const JIMENG_POLL_INTERVAL = 3000;
const JIMENG_MAX_POLLS = 60;

function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

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
    const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
    const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;
    if (!VOLC_ACCESS_KEY || !VOLC_SECRET_KEY) {
      return res.status(500).json({ error: 'VOLC_ACCESS_KEY / VOLC_SECRET_KEY not configured' });
    }

    const auth = { accessKey: VOLC_ACCESS_KEY, secretKey: VOLC_SECRET_KEY };
    const prompt: string = req.body?.prompt || '';
    const width: number = req.body?.width || 2560;
    const height: number = req.body?.height || 1440;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const submitBody: Record<string, unknown> = {
      req_key: JIMENG_REQ_KEY,
      prompt,
      width,
      height,
      force_single: true,
    };

    const submitReq = buildSignedRequest(auth, 'CVSync2AsyncSubmitTask', '2022-08-31', submitBody);
    const submitResp = JSON.parse(await httpsPost(submitReq.url, submitReq.headers, submitReq.body));

    if (submitResp.code !== 10000) {
      console.error('[jimeng] Submit failed:', submitResp.code, submitResp.message);
      return res.status(400).json({ error: submitResp.message, code: submitResp.code });
    }

    const taskId = submitResp.data.task_id;
    console.log(`[jimeng] Task submitted: ${taskId}`);

    for (let attempt = 0; attempt < JIMENG_MAX_POLLS; attempt++) {
      await new Promise((r) => setTimeout(r, JIMENG_POLL_INTERVAL));

      const pollReq = buildSignedRequest(auth, 'CVSync2AsyncGetResult', '2022-08-31', {
        req_key: JIMENG_REQ_KEY,
        task_id: taskId,
        req_json: JSON.stringify({ return_url: true }),
      });
      const pollResp = JSON.parse(await httpsPost(pollReq.url, pollReq.headers, pollReq.body));

      if (pollResp.code !== 10000) {
        console.error('[jimeng] Poll failed:', pollResp.code, pollResp.message);
        return res.status(400).json({ error: pollResp.message, code: pollResp.code });
      }

      const status = pollResp.data?.status;
      if (status === 'done') {
        const imageUrls: string[] = pollResp.data.image_urls || [];
        const binaryData: string[] = pollResp.data.binary_data_base64 || [];

        if (imageUrls.length > 0) {
          console.log(`[jimeng] Task done, returning ${imageUrls.length} URL(s)`);
          return res.json({
            base_resp: { status_code: 0, status_msg: '' },
            data: { image_urls: imageUrls },
          });
        }

        if (binaryData.length > 0) {
          console.log(`[jimeng] Task done, returning ${binaryData.length} base64 image(s)`);
          return res.json({
            base_resp: { status_code: 0, status_msg: '' },
            data: { image_base64: binaryData },
          });
        }

        return res.status(500).json({ error: 'Task done but no images returned' });
      }

      if (status === 'not_found' || status === 'expired') {
        return res.status(400).json({ error: `Task ${status}` });
      }
    }

    return res.status(504).json({ error: 'Image generation polling timed out' });
  } catch (error) {
    console.error('[jimeng] Image generation error:', error);
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
