import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    open: true,
    fs: {
      strict: false,
      allow: ['..'],
    },
    proxy: {
      '/api/chat': {
        target: 'https://coding.dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/chat/, '/v1'),
      },
      '/api/image': {
        target: 'https://47.100.184.181',
        changeOrigin: true,
        rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/image/, '/v1'),
        headers: { Host: 'api.minimaxi.com' },
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
