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
});
