import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal cleanup and result flow contract', () => {
  test('landing and preview copy no longer position the product as a theme-package generator', () => {
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(indexHtml).not.toContain('OA主题即刻生成');
    expect(indexHtml).not.toContain('下载主题');
    expect(indexHtml).not.toContain('主题包');
    expect(indexHtml).toContain('生成门户');
    expect(indexHtml).toContain('自动保存');
    expect(indexHtml).toContain('分享方案');
    expect(indexHtml).toContain('全屏查看');
    expect(indexHtml).not.toContain('保存门户');
    expect(indexHtml).not.toContain('继续编辑');
  });

  test('chat manager no longer depends on legacy landing presets or preset recommendation cards', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).not.toContain('resolveLegacyLandingPreset');
    expect(source).not.toContain('parsePresetRecommendations');
    expect(source).not.toContain('addPresetCardsMessage');
    expect(source).not.toContain('trackPresetUsage');
    expect(source).not.toContain('setLandingGalleryImage');
  });

  test('result actions support fullscreen and share from the preview shell', () => {
    const uiSetup = fs.readFileSync(path.join(projectRoot, 'web/src/ui-setup.ts'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(indexHtml).toContain('resultFullscreenBtn');
    expect(indexHtml).not.toContain('resultSaveBtn');
    expect(indexHtml).toContain('resultShareBtn');
    expect(indexHtml).not.toContain('resultEditBtn');
    expect(uiSetup).toContain('setupResultActions');
    expect(uiSetup).toContain('requestFullscreen');
    expect(uiSetup).toContain('navigator.share');
    expect(uiSetup).toContain('navigator.clipboard.writeText');
  });
});
