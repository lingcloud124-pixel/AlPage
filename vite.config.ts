import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['web/e2e/**', 'node_modules/**', 'web/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts', '**/*.config.ts', '**/dist/**', '**/tests/fixtures/**'],
    },
    setupFiles: [],
  },
});
