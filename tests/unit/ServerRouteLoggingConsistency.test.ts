import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();
const targets = [
  'server/src/routes/export-jobs.ts',
  'server/src/routes/ai-proxy.ts',
  'server/src/routes/model-config.ts',
  'server/src/routes/security-config.ts',
  'server/src/routes/auth.ts',
  'server/src/db.ts',
];

describe('server logging consistency', () => {
  test('server modules use logger instead of raw console error/warn', () => {
    for (const file of targets) {
      const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
      expect(source, file).not.toMatch(/console.(error|warn)/);
    }
  });
});
