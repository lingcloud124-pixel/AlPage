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
        rewrite: (path: string) => path.replace(/^\/api\/chat/, '/v1'),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
