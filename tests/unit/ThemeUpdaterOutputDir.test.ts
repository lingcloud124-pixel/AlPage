import { describe, it, expect } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ThemeUpdater } from '../../src/core/ThemeUpdater.js';
import { ManifestConfig } from '../../src/types/ManifestTypes.js';

describe('ThemeUpdater output directory behavior', () => {
  it('writes generated zips directly into outputDir and archives previous files', async () => {
    const tempRoot = path.join('tests', 'temp-output-dir');
    const outputDir = path.resolve(tempRoot, 'output');
    const manifestPath = path.join(tempRoot, 'manifest.json');
    const dateDir = new Date().toISOString().split('T')[0];

    await fs.remove(tempRoot);
    await fs.ensureDir(outputDir);
    await fs.writeFile(path.join(outputDir, 'old.zip'), 'old');

    const manifest: ManifestConfig = {
      version: '1.0',
      globalColors: { primary: '#123456' },
      sourceImages: {
        templateType: 'light-ui',
        penFile: 'designs/Light-UI-模板.pen'
      },
      themes: [
        { name: 'A', zip: 'a.zip', enabled: true },
        { name: 'B', zip: 'b.zip', enabled: true }
      ],
      outputDir: 'output'
    };
    await fs.ensureDir(path.dirname(manifestPath));
    await fs.writeJson(manifestPath, manifest);

    const updater = new ThemeUpdater() as any;
    updater.processTheme = async (zipPath: string, _config: ManifestConfig, targetOutputDir: string) => {
      const themeName = path.basename(zipPath, '.zip');
      await fs.ensureDir(targetOutputDir);
      await fs.writeFile(path.join(targetOutputDir, `${themeName}-新版.zip`), 'new');
      return {
        themeName,
        success: true,
        updatedFiles: [],
        errors: [],
        duration: 1
      };
    };

    const report = await updater.processAll(manifestPath);

    expect(report.successful).toBe(2);
    expect(await fs.pathExists(path.join(outputDir, 'a-新版.zip'))).toBe(true);
    expect(await fs.pathExists(path.join(outputDir, 'b-新版.zip'))).toBe(true);
    expect(await fs.pathExists(path.join(outputDir, 'history', dateDir, 'old.zip'))).toBe(true);

    await fs.remove(tempRoot);
  });
});
