import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('legacy tooling markers', () => {
  test('labels historical Pencil/manifest scripts and modules as non-primary tooling', () => {
    const targets = [
      'src/core/PencilMCPClient.ts',
      'src/theme-automation/core/DesignGenerator.ts',
      'src/theme-automation/core/AssetExtractor.ts',
      'scripts/export-pen-images.py',
      'scripts/generate-manifest.mjs',
      'scripts/run-updater.mjs',
    ];

    for (const relativePath of targets) {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
      expect(source).toMatch(/LEGACY|DEPRECATED|历史工具链|非当前主链路|仅供参考/);
    }
  });
});
