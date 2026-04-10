import type { ToolCall, ToolResult } from '../types';
import { updateThemeColors as penUpdateThemeColors } from '../pen-renderer';

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

function updateColors(colors: Record<string, string>): ToolResult {
  let updated = 0;
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = CSS_VAR_MAP[key] ?? (key.startsWith('--') ? key : `--${key}`);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      document.documentElement.style.setProperty(cssVar, value);
      updated++;
    }
  }
  penUpdateThemeColors(colors);
  return { success: true, data: { updated } };
}

function analyzeImage(args: { imageUrl: string }): ToolResult {
  return { success: false, error: '图片分析需要在主线程中通过 canvas 执行，请使用 analyzeImageAsync' };
}

export async function analyzeImageAsync(imageUrl: string): Promise<ToolResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
    };
    img.onerror = () => resolve({ success: false, error: '图片加载失败' });
    img.src = imageUrl;
  });
}

function parsePen(args: { penContent: string }): ToolResult {
  try {
    const pen = JSON.parse(args.penContent);
    const variables: Record<string, string> = {};
    if (pen.variables) {
      for (const [name, def] of Object.entries(pen.variables)) {
        const v = def as { themeTokens?: Record<string, string>; default?: string };
        if (v.themeTokens) {
          for (const [axis, color] of Object.entries(v.themeTokens)) {
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

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { tool, args } = toolCall;

  switch (tool) {
    case 'update_colors':
      return updateColors(args.colors as Record<string, string>);

    case 'analyze_image':
      return await analyzeImageAsync((args as { imageUrl: string }).imageUrl);

    case 'parse_pen':
      return parsePen(args as { penContent: string });

    case 'save_colors':
      return saveColors(args as any);

    case 'load_colors':
      return loadColors(args as { nameEn: string });

    case 'generate_background':
    case 'screenshot':
    case 'build':
    case 'verify':
      return { success: false, error: `"${tool}" 需要 Node.js 后端支持` };

    default:
      return { success: false, error: `未知工具: ${tool}` };
  }
}
