import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const proxy = {
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
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        desktopPreview: resolve(__dirname, 'desktop-preview.html'),
        landingPromptsAdmin: resolve(__dirname, 'landing-prompts-admin.html'),
        loginPreview: resolve(__dirname, 'login-preview.html'),
      },
    },
  },
});
