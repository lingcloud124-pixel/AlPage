import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const proxy = {
  '/api/export': {
    target: 'http://127.0.0.1:5174',
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/api\/export/, ''),
  },
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    timeout: 600_000,
    proxyTimeout: 600_000,
  },
};

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
