import type { ChatRequest, ChatResponse, AISettings, ToolDefinition, ToolCall } from '../types';
import { authHeaders } from '../auth';

const THEME_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'generate_theme_pipeline',
      description: '生成1张主题背景图，自动提取配色并应用到预览。调用后系统会自动完成生图、提色、配色、应用全流程。',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'English description of the desired background image theme and scene' },
          templateType: { type: 'string', enum: ['light-ui', 'dark-ui'], description: 'UI template type' },
          primaryHint: { type: 'string', description: 'Dominant color hint, e.g. red, blue, gold, green, purple, pink, or #RRGGBB' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_colors',
      description: '微调主题配色，直接修改某个或多个CSS颜色变量的值',
      parameters: {
        type: 'object',
        properties: {
          colors: {
            type: 'object',
            description: 'CSS variable name to hex color mapping',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['colors'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_colors',
      description: '保存当前配色方案',
      parameters: {
        type: 'object',
        properties: {
          nameEn: { type: 'string', description: 'English name for the color scheme' },
          name: { type: 'string', description: 'Chinese name for the color scheme' },
          templateType: { type: 'string', enum: ['light-ui', 'dark-ui'] },
        },
        required: ['nameEn', 'name', 'templateType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_colors',
      description: '验证当前配色方案的对比度和可访问性',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export const SETTINGS_KEY = 'themeStudioSettings';
// Backend API endpoints
const BACKEND_CHAT_ENDPOINT = '/api/theme/chat';
const BACKEND_IMAGE_ENDPOINT = '/api/theme/image';

// Keep these for compatibility with ui-setup.ts
export const DEFAULT_CHAT_ENDPOINT = BACKEND_CHAT_ENDPOINT;
export const DEFAULT_IMAGE_ENDPOINT = BACKEND_IMAGE_ENDPOINT;

const CHAT_IDLE_TIMEOUT_MS = 300_000;

type RuntimeLocationLike = Pick<Location, 'protocol' | 'origin' | 'hostname' | 'port'>;

const ZHIPU_DEFAULTS: AISettings = {
  apiEndpoint: BACKEND_CHAT_ENDPOINT,
  apiKey: '',  // Not needed anymore - server holds the key
  model: 'MiniMax-M2.7',
  imageApiEndpoint: BACKEND_IMAGE_ENDPOINT,
  imageApiKey: '',  // Not needed anymore - server holds the key
  imageModel: 'image-01',
  exportRoot: '',
  uiTheme: 'dark',
};

<<<<<<< Updated upstream
function getDefaultExportRoot(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  return home ? `${home}/Desktop/ThemeStudio-Exports` : '';
=======
function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getUiTheme(value: unknown): 'dark' | 'light' | undefined {
  return value === 'dark' || value === 'light' ? value : undefined;
}

function normalizeEndpoint(endpoint: string, fallback: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
>>>>>>> Stashed changes
}

export function getEffectiveExportRoot(settings?: { exportRoot?: string }): string {
  const root = settings?.exportRoot?.trim();
  return root || getDefaultExportRoot();
}

// Keep this for compatibility with ui-setup.ts
export function describeChatEndpointUsage(endpoint: string, locationLike?: RuntimeLocationLike): string {
  return '当前将通过后端代理访问模型接口。';
}

function migrateEndpoint(endpoint: string | undefined, defaultEndpoint: string): string | null {
  // If endpoint is undefined or empty, use the default
  if (!endpoint) return null;
  
  // If endpoint is already the default backend endpoint, return it as-is
  if (endpoint === defaultEndpoint) return null;
  
  // For legacy endpoints that might be stored in localStorage, 
  // we now always use the backend proxy endpoints
  return null;
}

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...ZHIPU_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AISettings>;
<<<<<<< Updated upstream
    const settings = {
      ...ZHIPU_DEFAULTS,
      ...parsed,
=======
    const apiEndpoint = migrateEndpoint(getNonEmptyString(parsed.apiEndpoint), DEFAULT_CHAT_ENDPOINT) ?? ZHIPU_DEFAULTS.apiEndpoint;
    const imageApiEndpoint = migrateEndpoint(getNonEmptyString(parsed.imageApiEndpoint), DEFAULT_IMAGE_ENDPOINT) ?? ZHIPU_DEFAULTS.imageApiEndpoint;
    return {
      ...ZHIPU_DEFAULTS,
      ...parsed,
      apiEndpoint,
      apiKey: getNonEmptyString(parsed.apiKey) ?? ZHIPU_DEFAULTS.apiKey,
      model: getNonEmptyString(parsed.model) ?? ZHIPU_DEFAULTS.model,
      imageApiEndpoint,
      imageApiKey: getNonEmptyString(parsed.imageApiKey) ?? ZHIPU_DEFAULTS.imageApiKey,
      imageModel: getNonEmptyString(parsed.imageModel) ?? ZHIPU_DEFAULTS.imageModel,
      exportRoot: getNonEmptyString(parsed.exportRoot) ?? ZHIPU_DEFAULTS.exportRoot,
      uiTheme: getUiTheme(parsed.uiTheme) ?? ZHIPU_DEFAULTS.uiTheme,
>>>>>>> Stashed changes
    };

    if (settings.model === 'qwen3.6-plus') {
      settings.model = 'MiniMax-M2.7';
    }

    if (settings.apiEndpoint === '/api/chat') {
      settings.apiEndpoint = BACKEND_CHAT_ENDPOINT;
    }

    if (settings.imageApiEndpoint === '/api/image') {
      settings.imageApiEndpoint = BACKEND_IMAGE_ENDPOINT;
    }

    return settings;
  } catch (error) {
    console.warn('[chat-client] 设置读取失败，已回退默认配置:', {
      message: (error as Error).message,
    });
    return { ...ZHIPU_DEFAULTS };
  }
}

export function saveSettings(settings: AISettings): void {
  const normalized = {
    ...settings,
    apiEndpoint: getNonEmptyString(settings.apiEndpoint) ?? DEFAULT_CHAT_ENDPOINT,
    apiKey: getNonEmptyString(settings.apiKey),
    model: getNonEmptyString(settings.model) ?? ZHIPU_DEFAULTS.model,
    imageApiEndpoint: getNonEmptyString(settings.imageApiEndpoint) ?? DEFAULT_IMAGE_ENDPOINT,
    imageApiKey: getNonEmptyString(settings.imageApiKey),
    imageModel: getNonEmptyString(settings.imageModel) ?? ZHIPU_DEFAULTS.imageModel,
    exportRoot: getNonEmptyString(settings.exportRoot) ?? '',
    uiTheme: getUiTheme(settings.uiTheme) ?? ZHIPU_DEFAULTS.uiTheme,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
}

export function getImageSettings(): { endpoint: string; apiKey: string; model: string } {
  return {
    endpoint: '/api/theme',
    apiKey: '',  // Server holds the key
    model: 'image-01',
  };
}

export async function generateImage(prompt: string): Promise<{ success: boolean; url?: string; error?: string }> {
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

    const MAX_RETRIES = 2;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch('/api/theme/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          model: 'image-01',
          prompt: truncatedPrompt,
          width: 1920,
          height: 1080,
          response_format: 'url',
        }),
        signal: controller.signal,
      });

      if (response.status === 529 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 5000;
        console.warn(`[chat-client] Image API 过载 (529)，${delay / 1000}s 后重试`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const errorBody = response ? await response.text() : 'no response';
      const statusCode = response?.status ?? 0;
      return { success: false, error: `图像生成失败 (${statusCode}): ${errorBody}` };
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

export interface ChatCompletionResult {
  content: string;
  toolCalls: ToolCall[];
}

export async function chatCompletion(
  request: ChatRequest,
  onToken?: (token: string) => void,
  externalSignal?: AbortSignal,
): Promise<ChatCompletionResult> {
  const settings = loadSettings();
  // apiKey requirement removed - server holds the key now

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
    const MAX_RETRIES = 3;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch('/api/theme/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          model: settings.model || 'MiniMax-M2.7',
          messages: request.messages,
          tools: request.tools ?? THEME_TOOLS,
          temperature: request.temperature ?? 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });
      refreshTimeout();

      if (response.status === 401) {
        window.location.href = '/login.html';
        throw new Error('未授权，请重新登录');
      }

      if (response.status === 529 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 5000;
        console.warn(`[chat-client] MiniMax 过载 (529)，${delay / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      break;
    }

    if (!response!.ok) {
      const errorBody = await response!.text();
      throw new Error(`API 错误 (${response!.status}): ${errorBody}`);
    }

    const reader = response!.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let fullContent = '';
    let reasoningContent = '';
    let buffer = '';
    let contentStarted = false;
    let streamParseErrorCount = 0;
    let streamParseErrorSample = '';
    const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

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
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallMap.has(idx)) {
                toolCallMap.set(idx, { id: tc.id ?? '', name: '', arguments: '' });
              }
              const entry = toolCallMap.get(idx)!;
              if (tc.id) entry.id = tc.id;
              if (tc.function?.name) entry.name += tc.function.name;
              if (tc.function?.arguments) entry.arguments += tc.function.arguments;
            }
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

    const cleaned = fullContent.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '').replace(/<thinkblocking>[\s\S]*$/g, '');

    const collectedToolCalls: ToolCall[] = [];
    for (const [, entry] of toolCallMap) {
      if (!entry.name) continue;
      let args: Record<string, unknown> = {};
      if (entry.arguments) {
        try { args = JSON.parse(entry.arguments); } catch { /* ignore */ }
      }
      collectedToolCalls.push({ tool: entry.name, args, id: entry.id });
    }

    return { content: cleaned, toolCalls: collectedToolCalls };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('请求超时（5分钟内未收到新的响应数据），请重试');
    }
    if (e instanceof TypeError) {
      throw new Error('无法连接到后端服务，请确认服务器正在运行');
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

  if (toolCalls.length === 0) {
    const toolCallBlockRegex = /\[TOOL_CALL\]\s*\{([^]*?)\}\s*\[\/TOOL_CALL\]/g;
    while ((match = toolCallBlockRegex.exec(content)) !== null) {
      try {
        const inner = match[1].trim();
        const toolMatch = inner.match(/\btool\s*(?:=>|=|:)\s*"([^"]+)"/);
        if (!toolMatch) continue;
        const toolName = toolMatch[1];
        const args: Record<string, unknown> = {};
        const argRegex = /--(\w[\w-]*)\s+(?:"([^"]*)"|(\S+))/g;
        let argMatch;
        while ((argMatch = argRegex.exec(inner)) !== null) {
          args[argMatch[1]] = argMatch[2] ?? argMatch[3];
        }
        const argsBlockMatch = inner.match(/"args"\s*(?:=>|=|:)\s*\{([^}]*)\}/);
        if (argsBlockMatch) {
          try {
            const parsedArgs = JSON.parse('{' + argsBlockMatch[1] + '}');
            Object.assign(args, parsedArgs);
          } catch { /* ignore */ }
        }
        if (Object.keys(args).length > 0 || toolName) {
          toolCalls.push({ tool: toolName, args });
        }
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
