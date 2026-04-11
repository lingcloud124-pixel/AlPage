import type { ToolCall, ToolResult } from '../types';
import { generateImage } from '../agent/chat-client';
import { validateColorScheme } from './contrast-validator';

const COLOR_VARS = [
  'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
  'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
  'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
  'body-bg-color', 'portal-header-bg-extend-color', 'portal-header-complex-bg-extend-color',
  'login-bg-color', 'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
  'border-color', 'border-icon-color', 'gradient-start', 'gradient-mid',
];

const CSS_VAR_MAP: Record<string, string> = {};
COLOR_VARS.forEach(v => { CSS_VAR_MAP[v] = `--${v}`; });

/**
 * 超时包装器 — 防止任何 Promise 永久挂起
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`工具 "${label}" 执行超时（${ms}ms）`)), ms)
    ),
  ]);
}

function updateColors(colors: Record<string, string>): ToolResult {
  let updated = 0;
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = CSS_VAR_MAP[key] ?? (key.startsWith('--') ? key : `--${key}`);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      document.documentElement.style.setProperty(cssVar, value);
      updated++;
    }
  }
  return { success: true, data: { updated } };
}

function getAllCurrentColors(): Record<string, string> {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const vars: Record<string, string> = {};
  for (const v of COLOR_VARS) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) vars[v] = val;
  }
  return vars;
}

export async function analyzeImageAsync(imageUrl: string): Promise<ToolResult> {
  // 参数验证 — 拒绝非 URL/data URI 的值
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { success: false, error: 'analyze_image 需要 imageUrl 参数' };
  }
  if (!imageUrl.startsWith('data:image/') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return { success: false, error: `imageUrl 必须是 data URI 或 HTTP URL，不支持本地路径: "${imageUrl.substring(0, 80)}"` };
  }

  const loadPromise = new Promise<ToolResult>((resolve) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => done(() => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = 100;
        const targetH = Math.round((img.height / img.width) * targetW);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const pixels = imageData.data;

        const colorBuckets: Record<string, number> = {};
        const step = 40;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.floor(pixels[i] / step) * step;
          const g = Math.floor(pixels[i + 1] / step) * step;
          const b = Math.floor(pixels[i + 2] / step) * step;
          const key = `${r},${g},${b}`;
          colorBuckets[key] = (colorBuckets[key] ?? 0) + 1;
        }

        const sorted = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            const hex = '#' + [r, g, b].map(c => Math.min(255, c + step / 2).toString(16).padStart(2, '0')).join('');
            return hex;
          });

        resolve({ success: true, data: { dominantColors: sorted, source: 'client-canvas' } });
      } catch (e) {
        resolve({ success: false, error: `图片分析失败: ${(e as Error).message}` });
      }
    });
    img.onerror = () => done(() => resolve({ success: false, error: '图片加载失败' }));
    img.src = imageUrl;
  });

  return withTimeout(loadPromise, 10_000, 'analyze_image');
}

function parsePen(args: { penContent: string }): ToolResult {
  try {
    const pen = JSON.parse(args.penContent);
    const variables: Record<string, string> = {};
    if (pen.variables) {
      for (const [name, def] of Object.entries(pen.variables)) {
        const v = def as { themeTokens?: Record<string, string>; default?: string };
        if (v.themeTokens) {
          for (const [, color] of Object.entries(v.themeTokens)) {
            variables[name] = color as string;
          }
        } else if (v.default) {
          variables[name] = v.default;
        }
      }
    }
    return { success: true, data: { variables } };
  } catch (e) {
    return { success: false, error: `解析 .pen 文件失败: ${(e as Error).message}` };
  }
}

function saveColors(args: { colors: Record<string, string>; nameEn: string; name: string; templateType: string }): ToolResult {
  try {
    const key = `theme-studio-colors-${args.nameEn}`;
    localStorage.setItem(key, JSON.stringify({
      name: args.name,
      nameEn: args.nameEn,
      templateType: args.templateType,
      colors: args.colors,
      savedAt: Date.now(),
    }));
    return { success: true, data: { key } };
  } catch (e) {
    return { success: false, error: `保存失败: ${(e as Error).message}` };
  }
}

function loadColors(args: { nameEn: string }): ToolResult {
  try {
    const key = `theme-studio-colors-${args.nameEn}`;
    const stored = localStorage.getItem(key);
    if (!stored) return { success: false, error: `未找到配色方案: ${args.nameEn}` };
    return { success: true, data: JSON.parse(stored) };
  } catch (e) {
    return { success: false, error: `加载失败: ${(e as Error).message}` };
  }
}

/**
 * 工具参数验证 — 在执行前拦截无效参数
 */
function validateToolArgs(tool: string, args: Record<string, unknown>): string | null {
  switch (tool) {
    case 'update_colors':
      if (!args.colors || typeof args.colors !== 'object') return 'update_colors 需要 colors 对象参数';
      return null;
    case 'analyze_image': {
      const url = args.imageUrl ?? args.imagePath ?? args.url;
      if (!url || typeof url !== 'string') return 'analyze_image 需要 imageUrl 参数';
      return null;
    }
    case 'parse_pen':
      if (!args.penContent && !args.penPath) return 'parse_pen 需要 penContent 参数';
      return null;
    case 'save_colors':
      if (!args.nameEn) return 'save_colors 需要 nameEn 参数';
      return null;
    case 'load_colors':
      if (!args.nameEn) return 'load_colors 需要 nameEn 参数';
      return null;
    default:
      return null;
  }
}

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { tool, args } = toolCall;

  // 全局参数验证
  const validationError = validateToolArgs(tool, args);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // 每个工具都有超时保护
  const TOOL_TIMEOUT = 15_000; // 15 秒

  const execute = async (): Promise<ToolResult> => {
    switch (tool) {
      case 'update_colors':
        return updateColors(args.colors as Record<string, string>);

      case 'analyze_image': {
        // 兼容 AI 可能使用的不同参数名
        const imageUrl = (args.imageUrl ?? args.imagePath ?? args.url ?? '') as string;
        return await analyzeImageAsync(imageUrl);
      }

      case 'parse_pen': {
        const content = (args.penContent ?? '') as string;
        if (!content) return { success: false, error: 'penContent 为空' };
        return parsePen({ penContent: content });
      }

      case 'save_colors':
        return saveColors(args as any);

      case 'load_colors':
        return loadColors(args as { nameEn: string });

      case 'generate_background': {
        const bgPrompt = (args.prompt ?? args.description ?? '') as string;
        if (!bgPrompt) return { success: false, error: 'generate_background 需要 prompt 参数' };
        return await generateImage(bgPrompt);
      }

      case 'validate_colors': {
        const colors = (args.colors ?? {}) as Record<string, string>;
        if (Object.keys(colors).length === 0) {
          const currentVars = getAllCurrentColors();
          if (Object.keys(currentVars).length === 0) return { success: false, error: '无当前配色方案' };
          const result = validateColorScheme(currentVars);
          return { success: result.passed, data: result };
        }
        const result = validateColorScheme(colors);
        return { success: result.passed, data: result };
      }

      case 'screenshot':
      case 'build':
      case 'verify':
        return { success: false, error: `"${tool}" 需要 Node.js 后端支持` };

      default:
        return { success: false, error: `未知工具: ${tool}` };
    }
  };

  return withTimeout(execute(), TOOL_TIMEOUT, tool);
}
