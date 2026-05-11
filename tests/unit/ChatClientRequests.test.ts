import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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

const { fetchCreditsMock, updateCreditsDisplayMock, redirectToLoginMock, getCurrentProjectIdMock } = vi.hoisted(() => ({
  fetchCreditsMock: vi.fn(async () => ({ credits: 100, maxCredits: 100, nextResetAt: '' })),
  updateCreditsDisplayMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  getCurrentProjectIdMock: vi.fn(() => 'project-1'),
}));

vi.mock('../../web/src/credits', () => ({
  fetchCredits: fetchCreditsMock,
  updateCreditsDisplay: updateCreditsDisplayMock,
  formatNextReset: (value: string) => value || '明日 06:00',
}));

vi.mock('../../web/src/auth', () => ({
  redirectToLogin: redirectToLoginMock,
}));

vi.mock('../../web/src/project-manager', () => ({
  getCurrentProjectId: getCurrentProjectIdMock,
}));

function createStreamResponse(payloads: string[]): Response {
  const stream = new ReadableStream({
    start(controller) {
      for (const payload of payloads) {
        controller.enqueue(new TextEncoder().encode(payload));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('chat client requests', async () => {
  const mod = await import('../../web/src/agent/chat-client');
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    fetchCreditsMock.mockResolvedValue({ credits: 100, maxCredits: 100, nextResetAt: '' });
    getCurrentProjectIdMock.mockReturnValue('project-1');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('generateImage sends same-origin credentials as a fetch option', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        image_urls: ['https://example.com/theme.jpg'],
      },
      base_resp: { status_code: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await mod.generateImage('spring festival banner');

    expect(result).toEqual({ success: true, url: 'https://example.com/theme.jpg' });
    expect(fetchMock).toHaveBeenCalledWith('/api/theme/image', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  test('chatCompletion sends same-origin credentials as a fetch option', async () => {
    const fetchMock = vi.fn(async () => createStreamResponse([
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n',
      'data: [DONE]\n',
    ]));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await mod.chatCompletion({
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result).toBe('hello');
    expect(fetchMock).toHaveBeenCalledWith('/api/theme/chat', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

});
