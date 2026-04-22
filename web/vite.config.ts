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
<<<<<<< Updated upstream
    plugins: [tailwindcss()],
=======
  plugins: [tailwindcss(), imageProxyPlugin()],
>>>>>>> Stashed changes
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    open: true,
    fs: {
      strict: false,
      allow: ['..'],
    },
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy,
  },
  build: {
    outdir: 'dist',
  },
});
