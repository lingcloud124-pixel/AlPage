import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  plugins: [tailwindcss()],
  server: {
    port: 5180,
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
