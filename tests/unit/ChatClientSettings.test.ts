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

describe('chat client settings', async () => {
  const mod = await import('../../web/src/agent/chat-client');

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  test('loadSettings returns defaults when no saved settings', () => {
    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe('/api/chat');
    expect(settings.model).toBe('qwen3.6-plus');
  });

  test('saveSettings persists values for later chat requests', () => {
    mod.saveSettings({
      apiEndpoint: '/api/chat',
      apiKey: 'sk-test-2',
      model: 'qwen3.6-plus',
      imageApiEndpoint: '/api/image',
      imageApiKey: 'img-key',
      imageModel: 'image-01',
    });

    const raw = store.get(mod.SETTINGS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      apiEndpoint: '/api/chat',
      apiKey: 'sk-test-2',
      imageApiEndpoint: '/api/image',
      imageApiKey: 'img-key',
    });
  });

  test('default chat endpoint is Vite proxy path', () => {
    expect(mod.DEFAULT_CHAT_ENDPOINT).toBe('/api/chat');
  });

  test('loadSettings migrates old DashScope direct endpoint to proxy', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: 'sk-old',
        model: 'qwen3.6-plus',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe('/api/chat');
    expect(settings.apiKey).toBe('sk-old');
  });

  test('loadSettings migrates old MiniMax direct endpoint to proxy', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: '/api/chat',
        apiKey: 'sk-test',
        model: 'qwen3.6-plus',
        imageApiEndpoint: 'https://api.minimaxi.com/v1',
        imageApiKey: 'img-old',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.imageApiEndpoint).toBe('/api/image');
    expect(settings.imageApiKey).toBe('img-old');
  });

  test('describeChatEndpointUsage explains proxy mode on Theme Studio Vite origin', () => {
    const message = mod.describeChatEndpointUsage('/api/chat', {
      protocol: 'http:',
      origin: 'http://127.0.0.1:5173',
      hostname: '127.0.0.1',
      port: '5173',
    });

    expect(message).toContain('内置 /api/chat 代理');
    expect(message).toContain('http://127.0.0.1:5173');
  });

  test('buildChatConnectionError explains file-open pages cannot use proxy', () => {
    const message = mod.buildChatConnectionError('/api/chat', {
      protocol: 'file:',
      origin: 'null',
      hostname: '',
      port: '',
    });

    expect(message).toContain('文件方式直接打开');
    expect(message).toContain('npm run dev');
  });

  test('buildChatConnectionError explains missing proxy on non-Vite origin', () => {
    const message = mod.buildChatConnectionError('/api/chat', {
      protocol: 'https:',
      origin: 'https://studio.example.com',
      hostname: 'studio.example.com',
      port: '',
    });

    expect(message).toContain('https://studio.example.com');
    expect(message).toContain('没有可用的 /api/chat 代理');
  });

  test('buildChatConnectionError explains direct https endpoint failures', () => {
    const message = mod.buildChatConnectionError('https://coding.dashscope.aliyuncs.com/v1');

    expect(message).toContain('https://coding.dashscope.aliyuncs.com/v1');
    expect(message).toContain('跨域');
  });
});
