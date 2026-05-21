import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

function copyTemplatesPlugin(): Plugin {
  return {
    name: 'copy-templates',
    closeBundle() {
      const srcDir = resolve(__dirname, 'src/templates');
      const destDir = resolve(__dirname, 'dist/src/templates');
      if (!existsSync(srcDir)) return;
      mkdirSync(destDir, { recursive: true });
      for (const file of readdirSync(srcDir)) {
        const srcFile = resolve(srcDir, file);
        if (statSync(srcFile).isFile()) {
          copyFileSync(srcFile, resolve(destDir, file));
        }
      }
    },
  };
}

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
  plugins: [tailwindcss(), copyTemplatesPlugin()],
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
        loginPreview: resolve(__dirname, 'login-preview.html'),
      },
    },
  },
});
