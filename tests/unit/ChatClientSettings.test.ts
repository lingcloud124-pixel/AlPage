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

<<<<<<< Updated upstream
  test('describeChatEndpointUsage returns a string', () => {
    const message = mod.describeChatEndpointUsage('/api/theme/chat');
=======
  test('loadSettings falls back to defaults when saved strings are blank', () => {
    store.set(
      mod.SETTINGS_KEY,
      JSON.stringify({
        apiEndpoint: '   ',
        apiKey: '   ',
        model: '   ',
        imageApiEndpoint: '   ',
        imageApiKey: '   ',
        imageModel: '   ',
        exportRoot: '   ',
      }),
    );

    const settings = mod.loadSettings();

    expect(settings.apiEndpoint).toBe('/api/chat');
    expect(settings.model).toBe('qwen3.6-plus');
    expect(settings.imageApiEndpoint).toBe('/api/image');
    expect(settings.imageModel).toBe('image-01');
    expect(settings.exportRoot).toBe('');
  });

  test('saveSettings omits blank keys so env defaults can still apply', () => {
    mod.saveSettings({
      apiEndpoint: '   ',
      apiKey: '   ',
      model: '   ',
      imageApiEndpoint: '   ',
      imageApiKey: '   ',
      imageModel: '   ',
      exportRoot: '   ',
      uiTheme: 'dark',
    });

    const raw = store.get(mod.SETTINGS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      apiEndpoint: '/api/chat',
      model: 'qwen3.6-plus',
      imageApiEndpoint: '/api/image',
      imageModel: 'image-01',
      exportRoot: '',
      uiTheme: 'dark',
    });
    expect(JSON.parse(raw!)).not.toHaveProperty('apiKey', '');
    expect(JSON.parse(raw!)).not.toHaveProperty('imageApiKey', '');
  });

  test('describeChatEndpointUsage explains proxy mode on Theme Studio Vite origin', () => {
    const message = mod.describeChatEndpointUsage('/api/chat', {
      protocol: 'http:',
      origin: 'http://127.0.0.1:5173',
      hostname: '127.0.0.1',
      port: '5173',
    });
>>>>>>> Stashed changes

    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});
