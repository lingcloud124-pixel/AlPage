import { beforeEach, describe, expect, test, vi } from 'vitest';

const store = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

const apiFetchMock = vi.fn();

vi.mock('../../web/src/api-base', () => ({
  apiFetch: apiFetchMock,
}));

describe('chat client apiFetch integration', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  test('generateImage uses apiFetch for authenticated backend calls', async () => {
    apiFetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      data: { image_urls: ['https://example.com/image.png'] },
      base_resp: { status_code: 0, status_msg: 'ok' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const mod = await import('../../web/src/agent/chat-client');
    const result = await mod.generateImage('enterprise spring campaign');

    expect(apiFetchMock).toHaveBeenCalledWith('/api/theme/image', expect.objectContaining({
      method: 'POST',
    }));
    expect(result).toEqual({ success: true, url: 'https://example.com/image.png' });
  });

  test('generateImage surfaces base_resp errors from non-2xx backend responses', async () => {
    apiFetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'Invalid status code: 50412',
      base_resp: { status_code: 50412, status_msg: 'Input text audit failed' },
    }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }));

    const mod = await import('../../web/src/agent/chat-client');
    const result = await mod.generateImage('military poster prompt');

    expect(result).toEqual({
      success: false,
      error: '图像生成失败: 输入文本审核未通过，请调整描述',
    });
  });

  test('generateImage explains backend connection failures clearly', async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const mod = await import('../../web/src/agent/chat-client');
    const result = await mod.generateImage('enterprise poster prompt');

    expect(result).toEqual({
      success: false,
      error: '无法连接到后端生图服务，请确认本地服务正在运行后重试',
    });
  });

  test('chatCompletion uses apiFetch for authenticated backend calls', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    apiFetchMock.mockResolvedValueOnce(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));

    const mod = await import('../../web/src/agent/chat-client');
    const result = await mod.chatCompletion({
      messages: [{ role: 'user', content: '你好' }],
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/api/theme/chat', expect.objectContaining({
      method: 'POST',
    }));
    expect(result).toContain('你好');
  });
});
