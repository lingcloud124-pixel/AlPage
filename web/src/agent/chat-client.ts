import type { ChatRequest, ChatResponse, AISettings } from '../types';

const SETTINGS_KEY = 'theme-studio-settings';

const ZHIPU_DEFAULTS: AISettings = {
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: import.meta.env.VITE_ZHIPU_API_KEY ?? '',
  model: 'GLM-4-Flash',
  imageApiEndpoint: 'https://api.minimaxi.com/v1',
  imageApiKey: import.meta.env.VITE_MINIMAX_API_KEY ?? '',
  imageModel: 'image-01',
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
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

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

    const imageUrl = data.data?.[0]?.url;
    if (imageUrl) {
      return { success: true, url: imageUrl };
    }

    return { success: false, error: '图像生成返回为空' };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { success: false, error: '图像生成超时（60秒）' };
    }
    return { success: false, error: `图像生成失败: ${(e as Error).message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function chatCompletion(
  request: ChatRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const settings = loadSettings();
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
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
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('请求超时（120秒），请检查网络连接后重试');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
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
