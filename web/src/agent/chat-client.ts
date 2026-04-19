import type { ChatRequest, ChatResponse, AISettings } from '../types';

export const SETTINGS_KEY = 'themeStudioSettings';
const DEFAULT_CHAT_PROXY_ENDPOINT = '/api/chat';
const DEFAULT_IMAGE_PROXY_ENDPOINT = '/api/image';
const DEFAULT_CHAT_REMOTE_ENDPOINT = 'https://coding.dashscope.aliyuncs.com/v1';
const DEFAULT_IMAGE_REMOTE_ENDPOINT = 'https://api.minimaxi.com/v1';

export const DEFAULT_CHAT_ENDPOINT = import.meta.env.DEV
  ? DEFAULT_CHAT_PROXY_ENDPOINT
  : DEFAULT_CHAT_REMOTE_ENDPOINT;
export const DEFAULT_IMAGE_ENDPOINT = import.meta.env.DEV
  ? DEFAULT_IMAGE_PROXY_ENDPOINT
  : DEFAULT_IMAGE_REMOTE_ENDPOINT;

const CHAT_IDLE_TIMEOUT_MS = 300_000;

type RuntimeLocationLike = Pick<Location, 'protocol' | 'origin' | 'hostname' | 'port'>;

const ZHIPU_DEFAULTS: AISettings = {
  apiEndpoint: DEFAULT_CHAT_ENDPOINT,
  apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY ?? '',
  model: 'qwen3.6-plus',
  imageApiEndpoint: DEFAULT_IMAGE_ENDPOINT,
  imageApiKey: import.meta.env.VITE_MINIMAX_API_KEY ?? '',
  imageModel: 'image-01',
  exportRoot: '',
  uiTheme: 'dark',
};

function normalizeEndpoint(endpoint: string, fallback: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function migrateEndpoint(endpoint: string | undefined, fallback: string): string | undefined {
  if (!endpoint) return endpoint;
  if (endpoint.includes('dashscope.aliyuncs.com')) return fallback;
  if (endpoint.includes('api.minimaxi.com') || endpoint.includes('47.100.184.181')) return fallback;
  return normalizeEndpoint(endpoint, fallback);
}

function isRelativeEndpoint(endpoint: string): boolean {
  return endpoint.trim().startsWith('/');
}

function getRuntimeLocation(locationLike?: RuntimeLocationLike): RuntimeLocationLike | undefined {
  if (locationLike) return locationLike;
  if (typeof window === 'undefined') return undefined;
  return window.location;
}

function isHttpPage(locationLike?: RuntimeLocationLike): boolean {
  return locationLike?.protocol === 'http:' || locationLike?.protocol === 'https:';
}

function isThemeStudioProxyOrigin(locationLike?: RuntimeLocationLike): boolean {
  return locationLike?.port === '5173' || locationLike?.port === '4173';
}

export function describeChatEndpointUsage(endpoint: string, locationLike?: RuntimeLocationLike): string {
  const runtime = getRuntimeLocation(locationLike);
  if (!isRelativeEndpoint(endpoint)) {
    return '当前将直接请求这个完整地址；请确认目标服务允许浏览器跨域访问。';
  }

  if (!runtime) {
    return '当前是相对代理地址，需由 Theme Studio 自带的 /api/chat 代理提供服务。';
  }

  if (runtime.protocol === 'file:') {
    return '当前页面是文件直开，/api/chat 无法工作；请通过 `cd web && npm run dev` 或 `npm run preview` 启动。';
  }

  if (!isHttpPage(runtime)) {
    return `当前页面协议是 ${runtime.protocol}，/api/chat 无法工作；请改用 Theme Studio 自带服务，或填写完整 https 地址。`;
  }

  if (isThemeStudioProxyOrigin(runtime)) {
    return `当前页面来源 ${runtime.origin}，将通过内置 /api/chat 代理访问模型接口。`;
  }

  return `当前页面来源 ${runtime.origin}，但这里未必提供 /api/chat 代理；若当前不是 Theme Studio 的 Vite 页面，请填写完整 https 地址。`;
}

export function getChatEndpointPreflightError(endpoint: string, locationLike?: RuntimeLocationLike): string | null {
  const runtime = getRuntimeLocation(locationLike);
  if (!isRelativeEndpoint(endpoint) || !runtime) return null;

  if (runtime.protocol === 'file:') {
    return '当前页面是以文件方式直接打开的，无法使用 /api 代理。请通过 `cd web && npm run dev` 或 `npm run preview` 启动 Theme Studio。';
  }

  if (!isHttpPage(runtime)) {
    return `当前页面协议为 ${runtime.protocol}，无法使用相对代理地址 ${endpoint}。请通过 Theme Studio 自带服务启动，或在设置中填写完整 https 地址。`;
  }

  return null;
}

export function buildChatConnectionError(endpoint: string, locationLike?: RuntimeLocationLike): string {
  const runtime = getRuntimeLocation(locationLike);
  if (isRelativeEndpoint(endpoint)) {
    if (!runtime) {
      return `无法连接到接口 ${endpoint}。当前运行环境无法确认 /api 代理是否存在，请优先通过 \`cd web && npm run dev\` 或 \`npm run preview\` 启动 Theme Studio。`;
    }

    if (runtime.protocol === 'file:') {
      return '当前页面是以文件方式直接打开的，无法使用 /api 代理。请通过 `cd web && npm run dev` 或 `npm run preview` 启动 Theme Studio。';
    }

    if (!isHttpPage(runtime)) {
      return `当前页面协议为 ${runtime.protocol}，无法连接到相对代理地址 ${endpoint}。请通过 Theme Studio 自带服务启动，或在设置中填写完整 https 地址。`;
    }

    if (!isThemeStudioProxyOrigin(runtime)) {
      return `无法连接到接口 ${endpoint}。当前页面来源是 ${runtime.origin}，这里没有可用的 /api/chat 代理。请改用 Theme Studio 的 Vite 开发/预览页面，或在设置中填写完整 https 地址。`;
    }

    return `无法连接到接口 ${endpoint}。当前页面来源是 ${runtime.origin}，但内置 /api/chat 代理没有响应。请确认 \`cd web && npm run dev\` 或 \`npm run preview\` 仍在运行，并检查 \`web/vite.config.ts\` 的代理配置。`;
  }

  return `无法连接到接口 ${endpoint}。请确认该 https 地址可直接访问，且目标服务允许浏览器跨域请求。`;
}

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...ZHIPU_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return {
      ...ZHIPU_DEFAULTS,
      ...parsed,
      apiEndpoint: migrateEndpoint(parsed.apiEndpoint, DEFAULT_CHAT_ENDPOINT) ?? ZHIPU_DEFAULTS.apiEndpoint,
      imageApiEndpoint: migrateEndpoint(parsed.imageApiEndpoint, DEFAULT_IMAGE_ENDPOINT) ?? ZHIPU_DEFAULTS.imageApiEndpoint,
    };
  } catch (error) {
    console.warn('[chat-client] 设置读取失败，已回退默认配置:', {
      message: (error as Error).message,
    });
    return { ...ZHIPU_DEFAULTS };
  }
}

export function saveSettings(settings: AISettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getImageSettings(): { endpoint: string; apiKey: string; model: string } {
  const settings = loadSettings();
  return {
    endpoint: settings.imageApiEndpoint ?? settings.apiEndpoint,
    apiKey: settings.imageApiKey || settings.apiKey,
    model: settings.imageModel || 'image-01',
  };
}

export async function generateImage(prompt: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const imgSettings = getImageSettings();
  if (!imgSettings.apiKey) {
    return { success: false, error: '未配置图像生成 API 密钥' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  try {
    const MAX_PROMPT_LENGTH = 1500;
    const truncatedPrompt = prompt.length > MAX_PROMPT_LENGTH
      ? prompt.slice(0, MAX_PROMPT_LENGTH - 3) + '...'
      : prompt;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.warn(`[chat-client] Image prompt truncated: ${prompt.length} → ${truncatedPrompt.length} chars`);
    }

    const response = await fetch(`${imgSettings.endpoint}/image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${imgSettings.apiKey}`,
      },
      body: JSON.stringify({
        model: imgSettings.model,
        prompt: truncatedPrompt,
        width: 1920,
        height: 1080,
        response_format: 'url',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `图像生成失败 (${response.status}): ${errorBody}` };
    }

    const data = await response.json();

    const baseStatusCode = data.base_resp?.status_code;
    const baseStatusMsg = data.base_resp?.status_msg;
    if (typeof baseStatusCode === 'number' && baseStatusCode !== 0) {
      const errorMap: Record<number, string> = {
        1002: '触发限流，请稍后再试',
        1004: '账号鉴权失败，请检查 API Key 是否正确',
        1008: '账号余额不足',
        1026: '图片描述涉及敏感内容，请调整描述',
        2013: '传入参数异常，请检查请求参数',
        2049: '无效的 API Key',
      };
      const detail = errorMap[baseStatusCode] ?? baseStatusMsg ?? `未知错误 (${baseStatusCode})`;
      return { success: false, error: `图像生成失败: ${detail}` };
    }

    const imageUrlFromUrls = data.data?.image_urls?.[0];
    if (imageUrlFromUrls) {
      return { success: true, url: imageUrlFromUrls };
    }

    const base64Array = data.data?.image_base64;
    if (base64Array && base64Array.length > 0) {
      const dataUrl = `data:image/jpeg;base64,${base64Array[0]}`;
      return { success: true, url: dataUrl };
    }

    const imageUrlFromArr = data.data?.[0]?.url;
    if (imageUrlFromArr) {
      return { success: true, url: imageUrlFromArr };
    }

    console.warn('[chat-client] Image API response could not be parsed:', JSON.stringify(data).slice(0, 500));
    return { success: false, error: '图像生成返回为空，请检查 API Key 是否有图像生成权限。' };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { success: false, error: '图像生成超时（180秒）' };
    }
    return { success: false, error: `图像生成失败: ${(e as Error).message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function chatCompletion(
  request: ChatRequest,
  onToken?: (token: string) => void,
  externalSignal?: AbortSignal,
): Promise<string> {
  const settings = loadSettings();
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const refreshTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => controller.abort(), CHAT_IDLE_TIMEOUT_MS);
  };
  refreshTimeout();

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const preflightError = getChatEndpointPreflightError(settings.apiEndpoint);
    if (preflightError) {
      throw new Error(preflightError);
    }

    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: request.messages,
        tools: request.tools,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
      signal: controller.signal,
    });
    refreshTimeout();

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API 错误 (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let fullContent = '';
    let reasoningContent = '';
    let buffer = '';
    let contentStarted = false;
    let streamParseErrorCount = 0;
    let streamParseErrorSample = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      refreshTimeout();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.reasoning_content && !contentStarted) {
            reasoningContent += delta.reasoning_content;
            onToken?.(`\u200B${delta.reasoning_content}`);
          }
          if (delta?.content) {
            contentStarted = true;
            fullContent += delta.content;
            onToken?.(delta.content);
          }
        } catch (error) {
          streamParseErrorCount += 1;
          if (!streamParseErrorSample) streamParseErrorSample = data.slice(0, 160);
          void error;
        }
      }
    }

    if (streamParseErrorCount > 0) {
      console.warn('[chat-client] 流式响应存在未解析片段，已跳过:', {
        count: streamParseErrorCount,
        sample: streamParseErrorSample,
      });
    }

    if (buffer.trim()) {
      console.warn('[chat-client] 流式响应结束后仍有未消费缓冲片段:', {
        sample: buffer.trim().slice(0, 160),
      });
    }

    return fullContent;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('请求超时（5分钟内未收到新的响应数据），请重试');
    }
    if (e instanceof TypeError) {
      throw new Error(buildChatConnectionError(settings.apiEndpoint));
    }
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function parseToolCallsFromContent(content: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  let invalidJsonBlockCount = 0;
  let invalidInlineToolCallCount = 0;
  let invalidToolCallSample = '';

  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && typeof parsed.tool === 'string') {
        toolCalls.push({ tool: parsed.tool, args: parsed.args ?? {} });
      }
    } catch (error) {
      invalidJsonBlockCount += 1;
      if (!invalidToolCallSample) invalidToolCallSample = match[1].slice(0, 160);
      void error;
    }
  }

  if (toolCalls.length === 0) {
    const inlineRegex = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[^}]*\})\s*\}/g;
    while ((match = inlineRegex.exec(content)) !== null) {
      try {
        toolCalls.push({ tool: match[1], args: JSON.parse(match[2]) });
      } catch (error) {
        invalidInlineToolCallCount += 1;
        if (!invalidToolCallSample) invalidToolCallSample = match[0].slice(0, 160);
        void error;
      }
    }
  }

  if (invalidJsonBlockCount + invalidInlineToolCallCount > 0) {
    console.warn('[chat-client] Tool call JSON 解析失败，已跳过无效片段:', {
      jsonBlocks: invalidJsonBlockCount,
      inlineCalls: invalidInlineToolCallCount,
      sample: invalidToolCallSample,
    });
  }

  return toolCalls;
}
