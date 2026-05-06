import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('landing gallery primary hint contract', () => {
  test('last gallery card can lock a fixed red primary color through primary image flow', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const primaryFlow = fs.readFileSync(path.join(projectRoot, 'web/src/primary-image-flow.ts'), 'utf8');

    expect(html).toContain('data-image-src="/workbench-gallery/run-12.png"');
    expect(html).toContain('data-primary-hint="#DA0404"');
    expect(chatManager).toContain('const primaryHint = card.dataset.primaryHint?.trim();');
    expect(chatManager).toContain('primaryHint: lockedPrimaryHint,');
    expect(primaryFlow).toContain('primaryHint: preferredHueHint,');
  });

  test('landing gallery resolves image urls against origin and separates resource-load errors from apply errors', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(chatManager).toContain('const resolvedImageUrl = new URL(imageSrc, window.location.origin).toString();');
    expect(chatManager).toContain('const response = await fetch(resolvedImageUrl);');
    expect(chatManager).toContain("[chat-manager] 推荐图资源加载失败:");
    expect(chatManager).toContain('推荐图加载失败，请稍后重试');
    expect(chatManager).toContain("[chat-manager] 推荐图应用失败:");
    expect(chatManager).toContain('推荐图应用失败，请稍后重试');
  });
});
