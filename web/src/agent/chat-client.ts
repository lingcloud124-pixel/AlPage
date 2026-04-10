import type { ChatRequest, ChatResponse, AISettings } from '../types';

const SETTINGS_KEY = 'theme-studio-settings';

const ZHIPU_DEFAULTS: AISettings = {
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: import.meta.env.VITE_ZHIPU_API_KEY ?? '',
  model: 'GLM-4-Flash',
};

export function loadSettings(): AISettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...ZHIPU_DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...ZHIPU_DEFAULTS };
}

export function saveSettings(settings: AISettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function chatCompletion(
  request: ChatRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const settings = loadSettings();
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API 错误 (${response.status}): ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

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
        if (delta?.content) {
          fullContent += delta.content;
          onToken?.(delta.content);
        }
      } catch {}
    }
  }

  return fullContent;
}

export function parseToolCallsFromContent(content: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];

  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && typeof parsed.tool === 'string') {
        toolCalls.push({ tool: parsed.tool, args: parsed.args ?? {} });
      }
    } catch {}
  }

  if (toolCalls.length === 0) {
    const inlineRegex = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[^}]*\})\s*\}/g;
    while ((match = inlineRegex.exec(content)) !== null) {
      try {
        toolCalls.push({ tool: match[1], args: JSON.parse(match[2]) });
      } catch {}
    }
  }

  return toolCalls;
}
