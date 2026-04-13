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

  test('loadSettings keeps persisted settings instead of deleting them', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: 'sk-test',
        model: 'qwen3.6-plus',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(settings.apiKey).toBe('sk-test');
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  test('saveSettings persists values for later chat requests', () => {
    mod.saveSettings({
      apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: 'sk-test-2',
      model: 'qwen3.6-plus',
      imageApiEndpoint: 'https://api.minimaxi.com/v1',
      imageApiKey: 'img-key',
      imageModel: 'image-01',
    });

    const raw = store.get(mod.SETTINGS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: 'sk-test-2',
      imageApiKey: 'img-key',
    });
  });

  test('default chat endpoint matches settings dialog default', () => {
    expect(mod.DEFAULT_CHAT_ENDPOINT).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');

    const settings = mod.loadSettings();
    expect(settings.apiEndpoint).toBe(mod.DEFAULT_CHAT_ENDPOINT);
  });

  test('loadSettings migrates legacy dev proxy endpoint to DashScope endpoint', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: '/api/chat',
        apiKey: 'sk-legacy',
        model: 'qwen3.6-plus',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe(mod.DEFAULT_CHAT_ENDPOINT);
    expect(settings.apiKey).toBe('sk-legacy');
  });
});
