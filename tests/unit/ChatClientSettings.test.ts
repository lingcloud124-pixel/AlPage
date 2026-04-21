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

    expect(settings.apiEndpoint).toBe('/api/theme/chat');
    expect(settings.model).toBe('qwen3.6-plus');
  });

  test('saveSettings persists values for later chat requests', () => {
    mod.saveSettings({
      apiEndpoint: '/api/theme/chat',
      apiKey: '',
      model: 'qwen3.6-plus',
      imageApiEndpoint: '/api/theme',
      imageApiKey: '',
      imageModel: 'image-01',
    });

    const raw = store.get(mod.SETTINGS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      apiEndpoint: '/api/theme/chat',
      imageApiEndpoint: '/api/theme',
    });
  });

  test('default chat endpoint is backend proxy path', () => {
    expect(mod.DEFAULT_CHAT_ENDPOINT).toBe('/api/theme/chat');
  });

  test('loadSettings no longer migrates endpoints — uses stored values', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: 'sk-old',
        model: 'qwen3.6-plus',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(settings.apiKey).toBe('sk-old');
  });

  test('loadSettings preserves stored image endpoint', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: '/api/theme/chat',
        apiKey: '',
        model: 'qwen3.6-plus',
        imageApiEndpoint: 'https://api.minimaxi.com/v1',
        imageApiKey: 'img-old',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.imageApiEndpoint).toBe('https://api.minimaxi.com/v1');
    expect(settings.imageApiKey).toBe('img-old');
  });

  test('describeChatEndpointUsage returns a string', () => {
    const message = mod.describeChatEndpointUsage('/api/theme/chat');

    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});
