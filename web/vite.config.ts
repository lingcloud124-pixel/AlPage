import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
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
