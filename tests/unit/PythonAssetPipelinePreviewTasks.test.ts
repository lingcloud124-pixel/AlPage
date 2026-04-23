import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';

const projectRoot = process.cwd();
const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'topic-automation-preview-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('python asset pipeline preview tasks', () => {
  test('queues preview-html thumbnails instead of generating them in python', () => {
    const tempDir = makeTempDir();
    const outputDir = path.join(tempDir, 'assets');
    const metadataDir = path.join(tempDir, '.build-meta');
    const snapshotPath = path.join(tempDir, 'asset-snapshot.json');

    fs.writeFileSync(
      snapshotPath,
      JSON.stringify({
        version: 1,
        generatedAt: '2026-04-23T00:00:00.000Z',
        project: {
          id: 'project-123',
          name: '清明主题',
          nameEn: 'project-123-qingming',
          templateType: 'light-ui',
          selectedProducts: ['mk'],
        },
        sourceImages: {
          background: 'web/public/backgrounds/qingming-bg.png',
        },
        assetSources: {
          login: 'background-image',
          headerSidebar: 'background-image',
          thumbnails: 'preview-html',
        },
        colors: {
          'primary-color': '#2C615C',
          'tlayout-header-bg-extend-color': '#FBFCF2',
        },
        paths: {
          exportDir: outputDir,
        },
        pipeline: {
          steps: [],
        },
      }),
      'utf8',
    );

    const script = `
import json
from pathlib import Path
from scripts.lib.asset_pipeline import prepare_assets_from_snapshot

snapshot = json.loads(Path(${JSON.stringify(snapshotPath)}).read_text(encoding="utf-8"))
manifest = prepare_assets_from_snapshot(snapshot, Path(${JSON.stringify(outputDir)}), Path(${JSON.stringify(projectRoot)}), Path(${JSON.stringify(metadataDir)}))
print(json.dumps(manifest, ensure_ascii=False))
`;

    const manifest = JSON.parse(
      execFileSync('python3', ['-c', script], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
    );

    expect(manifest.assetSources).toEqual({
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    });
    expect(manifest.pendingPreviewCaptures.map((item: any) => item.output)).toContain('desktop.png');
    expect(manifest.pendingPreviewCaptures.map((item: any) => item.output)).toContain('layout-banner.jpg');
    expect(manifest.pendingPreviewCaptures.map((item: any) => item.output)).toContain('thumb.jpg');
    expect(manifest.assets.loginBackground).toContain('bg-login.jpg');
    expect(manifest.assets.desktop).toContain(path.join(outputDir, 'desktop.png'));
    expect(fs.existsSync(path.join(outputDir, 'asset-snapshot.json'))).toBe(false);
    expect(fs.existsSync(path.join(metadataDir, 'asset-snapshot.json'))).toBe(true);
  });
});
