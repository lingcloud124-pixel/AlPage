import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';
import type { IncomingMessage, ServerResponse } from 'http';

const upstreamProxyUrl = process.env.https_proxy
  || process.env.HTTPS_PROXY
  || process.env.http_proxy
  || process.env.HTTP_PROXY
  || process.env.all_proxy
  || process.env.ALL_PROXY
  || '';

const imageProxyAgent = upstreamProxyUrl ? new HttpsProxyAgent(upstreamProxyUrl) : undefined;

function imageProxyPlugin(): Plugin {
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy-image', (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '', `http://${req.headers.host}`).searchParams.get('url');
        if (!url) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        req.on('close', () => { clearTimeout(timeout); controller.abort(); });
        if (imageProxyAgent) {
          const parsed = new URL(url);
          const transport = parsed.protocol === 'https:' ? https : http;
          const proxyReq = transport.get(url, { agent: imageProxyAgent, signal: controller.signal }, (proxyRes) => {
            clearTimeout(timeout);
            if (proxyRes.statusCode && proxyRes.statusCode >= 300) {
              res.statusCode = 502;
              res.end(`Upstream ${proxyRes.statusCode}`);
              return;
            }
            const contentType = proxyRes.headers['content-type'] || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
            proxyRes.pipe(res);
          });
          proxyReq.on('error', (err) => { clearTimeout(timeout); res.statusCode = 502; res.end(err.message); });
        } else {
          fetch(url, { signal: controller.signal }).then(async (imgRes) => {
            clearTimeout(timeout);
            if (!imgRes.ok) {
              res.statusCode = 502;
              res.end(`Upstream ${imgRes.status}`);
              return;
            }
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const buf = Buffer.from(await imgRes.arrayBuffer());
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(buf);
          }).catch((err) => {
            clearTimeout(timeout);
            res.statusCode = 502;
            res.end(err.message);
          });
        }
      });
    },
  };
}

const proxy = {
  '/api/chat': {
    target: 'https://coding.dashscope.aliyuncs.com',
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/chat/, '/v1'),
  },
  '/api/image': {
    target: 'https://api.minimaxi.com',
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/image/, '/v1'),
    ...(imageProxyAgent ? { agent: imageProxyAgent } : {}),
  },
  '/api/export': {
    target: 'http://127.0.0.1:5174',
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/export/, ''),
  },
};

export default defineConfig({
  root: '.',
    plugins: [tailwindcss(), imageProxyPlugin()],
  server: {
    port: 5173,
    open: true,
    fs: {
      strict: false,
      allow: ['..'],
    },
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    outdir: 'dist',
  },
});
