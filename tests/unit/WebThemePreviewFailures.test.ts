import { beforeEach, describe, expect, test, vi } from 'vitest';

const { generateImageMock } = vi.hoisted(() => ({
  generateImageMock: vi.fn(),
}));

vi.mock('../../web/src/agent/chat-client', () => ({
  generateImage: generateImageMock,
}));

import { executeTool } from '../../web/src/tools/executor';

describe('web theme preview failures', () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    const styleStore = new Map<string, string>();
    const target = {
      style: {
        setProperty: (name: string, value: string) => { styleStore.set(name, value); },
        getPropertyValue: (name: string) => styleStore.get(name) ?? '',
      },
    };
    Object.defineProperty(globalThis, 'document', {
      value: {
        getElementById: () => target,
        documentElement: target,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'getComputedStyle', {
      value: () => ({
        getPropertyValue: (name: string) => styleStore.get(name) ?? '',
      }),
      configurable: true,
    });
  });

  test('surfaces per-direction generation errors when all previews fail', async () => {
    generateImageMock
      .mockResolvedValueOnce({ success: false, error: '积分不足，今日使用次数已用完。' })
      .mockResolvedValueOnce({ success: false, error: '输入文本含敏感词，请调整描述' });

    const result = await executeTool({
      tool: 'generate_theme_previews',
      args: {
        directions: [
          { label: 'A · 节庆红', prompt: 'prompt-a' },
          { label: 'B · 科技蓝', prompt: 'prompt-b' },
        ],
        templateType: 'light-ui',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('所有预览图生成失败。');
    expect(result.error).toContain('A · 节庆红: 积分不足，今日使用次数已用完。');
    expect(result.error).toContain('B · 科技蓝: 输入文本含敏感词，请调整描述');
    expect(result.data).toEqual({
      failures: [
        { directionLabel: 'A · 节庆红', error: '积分不足，今日使用次数已用完。' },
        { directionLabel: 'B · 科技蓝', error: '输入文本含敏感词，请调整描述' },
      ],
    });
  });

  test('returns friendly copy when image generation does not support uploaded-image continuation', async () => {
    generateImageMock.mockResolvedValueOnce({ success: false, error: '图像生成失败: 输入图片审核未通过' });

    const result = await executeTool({
      tool: 'generate_theme_pipeline',
      args: {
        prompt: 'prompt-with-uploaded-image-context',
        templateType: 'light-ui',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('当前仅支持文字生图，暂不支持基于上传图片继续生成');
  });

  test('skips image color analysis when a landing preset locks an exact primary hex', async () => {
    generateImageMock.mockResolvedValueOnce({ success: true, url: 'https://example.com/fixed-theme.png' });

    const result = await executeTool({
      tool: 'generate_theme_pipeline',
      args: {
        prompt: '春节主题海报，灯笼与节庆氛围',
        templateType: 'light-ui',
        primaryHint: '#C90808',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      primaryColor: '#C90808',
      imageUrl: 'https://example.com/fixed-theme.png',
      enforcedPreferredHue: true,
      enforcementReason: '快捷入口已锁定主题色 #C90808，跳过图片提色分析。',
      dominantColors: [],
      triedCandidates: [],
    });
  });
});
