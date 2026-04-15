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
    const response = await fetch(`${imgSettings.endpoint}/image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${imgSettings.apiKey}`,
      },
      body: JSON.stringify({
        model: imgSettings.model,
        prompt,
        aspect_ratio: '16:9',
        response_format: 'url',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `图像生成失败 (${response.status}): ${errorBody}` };
    }

    const data = await response.json();

    const base64Array = data.data?.image_base64;
    if (base64Array && base64Array.length > 0) {
      const dataUrl = `data:image/jpeg;base64,${base64Array[0]}`;
      return { success: true, url: dataUrl };
    }

    const imageUrlFromUrls = data.data?.image_urls?.[0];
    if (imageUrlFromUrls) {
      return { success: true, url: imageUrlFromUrls };
    }

    const imageUrlFromArr = data.data?.[0]?.url;
    if (imageUrlFromArr) {
      return { success: true, url: imageUrlFromArr };
    }

    return { success: false, error: '图像生成返回为空' };
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
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    if (settings.apiEndpoint.startsWith('/') && typeof window !== 'undefined' && window.location.protocol === 'file:') {
      throw new Error('当前页面是以文件方式直接打开的，无法使用 /api 代理。请通过 `npm run dev` 或 `npm run preview` 启动 Theme Studio。');
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
      throw new Error('请求超时（120秒），请检查网络连接后重试');
    }
    if (e instanceof TypeError) {
      throw new Error(`无法连接到接口 ${settings.apiEndpoint}，请确认当前是通过 Vite 开发服务器启动，或在设置中填写可访问的完整 https 地址`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
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
