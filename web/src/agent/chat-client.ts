import type { ChatRequest, ChatResponse, AISettings } from '../types';
import { redirectToLogin } from '../auth';
import { fetchCredits, updateCreditsDisplay, formatNextReset } from '../credits';
import { getCurrentProjectId } from '../project-manager';
import { apiFetch } from '../api-base';

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
  uiTheme: 'light',
};

function getDefaultExportRoot(): string {
  const runtimeProcess =
    typeof globalThis !== 'undefined' && 'process' in globalThis
      ? (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process
      : undefined;
  const home = runtimeProcess?.env?.HOME ?? runtimeProcess?.env?.USERPROFILE ?? '';
  return home ? `${home}/Desktop/ThemeStudio-Exports` : 'Desktop/ThemeStudio-Exports';
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
    const settings = {
      ...ZHIPU_DEFAULTS,
      ...parsed,
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

    // Frontend workbench is now light-only; migrate any stored dark mode.
    settings.uiTheme = 'light';

    return settings;
  } catch (error) {
    console.warn('[chat-client] 设置读取失败，已回退默认配置:', {
      message: (error as Error).message,
    });
    return { ...ZHIPU_DEFAULTS };
  }
}

export function saveSettings(settings: AISettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    ...settings,
    uiTheme: 'light',
  }));
}

export function getImageSettings(): { endpoint: string; apiKey: string; model: string } {
  const settings = loadSettings();
  return {
    endpoint: '/api/theme',
    apiKey: '',
    model: settings.imageModel || 'image-01',
  };
}

function normalizeImageGenerationError(message: string): string {
  if (
    /输入图片审核未通过/u.test(message)
    || /暂不支持.*图片/u.test(message)
    || /不支持.*图片/u.test(message)
  ) {
    return '当前仅支持文字生图，暂不支持基于上传图片继续生成';
  }
  return message;
}

function describeImageBaseRespError(data: any): string | null {
  const baseStatusCode = data?.base_resp?.status_code;
  const baseStatusMsg = data?.base_resp?.status_msg;
  if (typeof baseStatusCode !== 'number' || baseStatusCode === 0) return null;
  const errorMap: Record<number, string> = {
    1002: '触发限流，请稍后再试',
    1004: '账号鉴权失败，请检查 API Key 是否正确',
    1008: '账号余额不足',
    1026: '图片描述涉及敏感内容，请调整描述',
    2013: '传入参数异常，请检查请求参数',
    2049: '无效的 API Key',
    50411: '输入图片审核未通过',
    50412: '输入文本审核未通过，请调整描述',
    50413: '输入文本含敏感词，请调整描述',
    50429: '请求过快，请稍后再试',
    50500: '服务内部错误，请重试',
    50511: '生成结果未通过审核，请调整描述后重试',
  };
  return errorMap[baseStatusCode] ?? baseStatusMsg ?? `未知错误 (${baseStatusCode})`;
}

export async function generateImage(prompt: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);
  const imageSettings = getImageSettings();

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
      response = await apiFetch('/api/theme/image', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: imageSettings.model,
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
      if (response?.status === 403) {
        try {
          const errData = await response.json();
          if (errData.code === 'CREDITS_EXHAUSTED') {
            updateCreditsDisplay({ credits: errData.remainingCredits ?? 0, maxCredits: 100, nextResetAt: errData.nextResetAt ?? '' });
            return { success: false, error: `今日生成次数已用完。${formatNextReset(errData.nextResetAt)}自动恢复` };
          }
        } catch { /* fall through */ }
      }
      const errorBody = response ? await response.text() : 'no response';
      const statusCode = response?.status ?? 0;
      try {
        const errorData = JSON.parse(errorBody);
        const detail = describeImageBaseRespError(errorData);
        if (detail) {
          return { success: false, error: normalizeImageGenerationError(`图像生成失败: ${detail}`) };
        }
      } catch { /* fall through */ }
      return { success: false, error: normalizeImageGenerationError(`图像生成失败 (${statusCode}): ${errorBody}`) };
    }

    const data = await response.json();
    fetchCredits().then(updateCreditsDisplay).catch(() => {});

    const detail = describeImageBaseRespError(data);
    if (detail) {
      return { success: false, error: normalizeImageGenerationError(`图像生成失败: ${detail}`) };
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
    if (e instanceof TypeError && /failed to fetch/i.test(e.message)) {
      return { success: false, error: '无法连接到后端生图服务，请确认本地服务正在运行后重试' };
    }
    return { success: false, error: normalizeImageGenerationError(`图像生成失败: ${(e as Error).message}`) };
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
      response = await apiFetch('/api/theme/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model || 'MiniMax-M2.7',
          messages: request.messages,
          tools: request.tools,
          temperature: request.temperature ?? 0.7,
          stream: true,
          project_id: getCurrentProjectId() || undefined,
        }),
        signal: controller.signal,
      });
      refreshTimeout();

      if (response.status === 401) {
        redirectToLogin();
        throw new Error('未授权，请重新登录');
      }

      if (response.status === 403) {
        try {
          const errData = await response.json();
          if (errData.code === 'MESSAGE_LIMIT_EXCEEDED') {
            throw new Error(errData.error || '对话轮数已达上限');
          }
        } catch (e) {
          if ((e as Error).message.includes('已达上限')) throw e;
        }
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

    const cleaned = fullContent.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '').replace(/<thinkblocking>[\s\S]*$/g, '');
    return cleaned;
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

export function extractBalancedJson(text: string, startIdx: number): string | null {
  if (startIdx >= text.length || text[startIdx] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

function parseWrappedToolArgs(rawArgs: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const tokenRegex = /--([a-zA-Z0-9_]+)\s+(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^\s][^\n]*?)(?=\s+--|$))/g;
  let match;
  while ((match = tokenRegex.exec(rawArgs)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    args[key] = value.trim();
  }
  return args;
}

export function parseToolCallsFromContent(content: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  let invalidJsonBlockCount = 0;
  let invalidInlineToolCallCount = 0;
  let invalidWrappedToolCallCount = 0;
  let invalidToolCallSample = '';

  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
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
    const inlineRegex = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*/g;
    let inlineMatch;
    while ((inlineMatch = inlineRegex.exec(content)) !== null) {
      const startIdx = inlineRegex.lastIndex;
      const argsJson = extractBalancedJson(content, startIdx);
      if (argsJson) {
        try {
          toolCalls.push({ tool: inlineMatch[1], args: JSON.parse(argsJson) });
        } catch (error) {
          invalidInlineToolCallCount += 1;
          if (!invalidToolCallSample) invalidToolCallSample = argsJson.slice(0, 160);
          void error;
        }
      }
    }
  }

  if (toolCalls.length === 0 && /"tool"\s*:\s*"generate_theme_pipeline"/.test(content)) {
    const toolIdx = content.search(/\{"tool"\s*:\s*"generate_theme_pipeline"/);
    if (toolIdx >= 0) {
      const payload = extractBalancedJson(content, toolIdx);
      if (payload) {
        try {
          const parsed = JSON.parse(payload);
          if (parsed.tool && typeof parsed.tool === 'string') {
            toolCalls.push({ tool: parsed.tool, args: parsed.args ?? {} });
          }
        } catch (error) {
          invalidInlineToolCallCount += 1;
          if (!invalidToolCallSample) invalidToolCallSample = payload.slice(0, 160);
          void error;
        }
      }
    }
  }

  if (toolCalls.length === 0) {
    const wrappedRegex = /\[TOOL_CALL\]\s*\{tool\s*=>\s*"([^"]+)"\s*,\s*args\s*=>\s*\{([\s\S]*?)\}\s*\}\s*\[\/TOOL_CALL\]/g;
    let wrappedMatch;
    while ((wrappedMatch = wrappedRegex.exec(content)) !== null) {
      try {
        toolCalls.push({ tool: wrappedMatch[1], args: parseWrappedToolArgs(wrappedMatch[2]) });
      } catch (error) {
        invalidWrappedToolCallCount += 1;
        if (!invalidToolCallSample) invalidToolCallSample = wrappedMatch[0].slice(0, 160);
        void error;
      }
    }
  }

  if (invalidJsonBlockCount + invalidInlineToolCallCount + invalidWrappedToolCallCount > 0) {
    console.warn('[chat-client] Tool call JSON 解析失败，已跳过无效片段:', {
      jsonBlocks: invalidJsonBlockCount,
      inlineCalls: invalidInlineToolCallCount,
      wrappedCalls: invalidWrappedToolCallCount,
      sample: invalidToolCallSample,
    });
  }

  return toolCalls;
}
