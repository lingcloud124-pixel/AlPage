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
  },
  build: {
    outDir: 'dist',
  },
});
