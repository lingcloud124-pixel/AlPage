import { vi } from 'vitest';

export interface MockRequest {
  headers: Record<string, string | string[] | undefined>;
  secure: boolean;
  cookies: Record<string, string>;
  query: Record<string, string | undefined>;
  xhr: boolean;
  socket: { remoteAddress?: string };
  path: string;
}

export interface MockResponse {
  redirect: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  sendFile: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  removeHeader: ReturnType<typeof vi.fn>;
  _statusCode: number;
  _body: any;
  _redirectUrl: string | null;
  _cookies: Array<{ name: string; value: string; options: Record<string, any> }>;
}

export function makeMockReq(overrides: Partial<MockRequest> = {}): MockRequest & Record<string, any> {
  return {
    headers: {},
    secure: false,
    cookies: {},
    query: {},
    xhr: false,
    socket: { remoteAddress: '127.0.0.1' },
    path: '/',
    loginName: undefined,
    ...overrides,
  };
}

export function makeMockRes(): MockResponse & Record<string, any> {
  const res: MockResponse & Record<string, any> = {
    _statusCode: 200,
    _body: null,
    _redirectUrl: null,
    _cookies: [],

    redirect(url: string) {
      res._redirectUrl = url;
      return res;
    },
    status(code: number) {
      res._statusCode = code;
      return res;
    },
    json(body: any) {
      res._body = body;
      return res;
    },
    cookie(name: string, value: string, options: Record<string, any> = {}) {
      res._cookies.push({ name, value, options });
      return res;
    },
    clearCookie(_name: string, _options: Record<string, any> = {}) {
      return res;
    },
    send(_body?: any) {
      return res;
    },
    sendFile(_path: string) {
      return res;
    },
    setHeader(_name: string, _value: string) {
      return res;
    },
    removeHeader(_name: string) {
      return res;
    },
  };

  // Also create vi.fn spies for tests that want to use toHaveBeenCalled
  res.redirect = vi.fn((url: string) => {
    res._redirectUrl = url;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res._statusCode = code;
    return res;
  });
  res.json = vi.fn((body: any) => {
    res._body = body;
    return res;
  });
  res.cookie = vi.fn((name: string, value: string, options: Record<string, any> = {}) => {
    res._cookies.push({ name, value, options });
    return res;
  });

  return res;
}
