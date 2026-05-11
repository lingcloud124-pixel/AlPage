import type { ToolCall } from '../types';
import { resolvePreferredHueHint } from '../theme/color-utils';
import { adjustHsl, deriveColorsFromPrimary, normalizePrimaryForTemplate } from '../theme/color-utils';
import type { ThemeAgentDebugState } from '../chat-manager';
import { resolveFestivalColorRule } from '../theme/festival-color-rules';

function normalizeTemplateType(value: unknown): 'light-ui' | 'dark-ui' {
  return value === 'dark-ui' ? 'dark-ui' : 'light-ui';
}

function extractDirectionsFromText(text: string): Array<{ label: string; prompt: string }> {
  if (!text) return [];
  const directions: Array<{ label: string; prompt: string }> = [];
  const labels = ['A', 'B', 'C'];
  const parts = text.split(/\*\*\s*方向\s*([ABCabc])/u);
  if (parts.length < 3) return [];

  for (let i = 1; i + 1 < parts.length; i += 2) {
    const letter = parts[i].toUpperCase();
    if (labels.indexOf(letter) < 0) continue;
    let content = parts[i + 1] || '';
    content = content.replace(/\*\*/g, '').trim();
    const nextLabelIdx = content.search(/方向\s*[ABCabc]/u);
    if (nextLabelIdx > 0) content = content.slice(0, nextLabelIdx).trim();
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    let labelLine = lines[0] || '';
    let promptLines = lines.slice(1);
    if (labelLine.startsWith('·') || labelLine.startsWith('·')) {
      labelLine = labelLine.replace(/^[·\s]+/, '').trim();
    }
    const labelMatch = labelLine.match(/^[·\s]*([^：:]{1,20})[：:]?\s*$/);
    if (labelMatch) {
      labelLine = labelMatch[1].trim();
      promptLines = lines.slice(1);
    } else {
      const colonIdx = labelLine.search(/[：:]/);
      if (colonIdx > 0) {
        labelLine = labelLine.slice(0, colonIdx).trim();
        const rest = labelLine.slice(colonIdx + 1).trim();
        if (rest) promptLines = [rest, ...promptLines];
      }
    }
    const promptText = promptLines.join('。').replace(/[。;；\s]+$/u, '').trim();
    if (promptText.length > 20) {
      directions.push({
        label: `${letter} · ${labelLine}`,
        prompt: promptText,
      });
    }
  }

  return directions.slice(0, 3);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPlanSummaryFromAssistantMessage(text: string | undefined): string {
  if (!text) return '';
  const withoutToolJson = text.replace(/```json[\s\S]*?```/g, ' ');
  const normalized = stripMarkdown(withoutToolJson);
  const planMatch = normalized.match(/好的，我先为您整理一个方案[：:，,]?\s*([\s\S]*?)(?:现在为您生成(?:一张)?预览图[。！!]?|我来为您生成[。！!]?|接下来为您生成[。！!]?)$/u);
  if (!planMatch?.[1]) return '';
  return planMatch[1].replace(/\s+/g, ' ').trim();
}

function shouldAutoGeneratePreview(text: string | undefined): boolean {
  if (!text) return false;
  return /(现在为您生成(?:一张)?预览图|我来为您生成|接下来为您生成|我为您重新生成(?:一张)?预览图|重新生成(?:一张)?预览图)/u.test(text);
}

function mentionsGenerateThemePipeline(text: string | undefined): boolean {
  if (!text) return false;
  return /generate_theme_pipeline/u.test(text);
}

export function isSimpleConfirmationMessage(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return /^(好|好的|可以|开始|生成|行|没问题|确认|就这样|ok|okay|yes|yep|sure)[！!。.\s]*$/i.test(normalized);
}

function inferTemplateTypeFromText(text: string | undefined): 'light-ui' | 'dark-ui' {
  if (!text) return 'light-ui';
  return /dark-ui|深色/u.test(text) ? 'dark-ui' : 'light-ui';
}

function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const chars = trimmed.slice(1).split('');
    return `#${chars.map((char) => char + char).join('').toUpperCase()}`;
  }
  return trimmed.toUpperCase();
}

function extractHexColor(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  return match ? normalizeHex(match[0]) : null;
}

function hasGenerationIntent(text: string | undefined): boolean {
  if (!text) return false;
  return /(生成|生图|做一个|做一张|帮我做|创建|设计|出图|海报|背景图|插画|封面|主题包|主题|风格|场景|光影|构图|氛围感|宣传图)/u.test(text);
}

function hasExplicitColorEditIntent(text: string | undefined): boolean {
  if (!text) return false;
  return /(改成|换成|调成|调整|改一下|换一下|改为|换为|调为|改改|换个|调一下|微调|优化一下|太暗|太亮|太深|太浅|亮一点|暗一点|深一点|浅一点|更亮|更暗|更深|更浅|鲜艳|柔和|暖一点|冷一点|偏暖|偏冷)/u.test(text);
}

function isColorAdjustmentMessage(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const explicitHex = extractHexColor(text);
  const colorContext = /(主题色|主色|颜色|色调|配色|色彩)/u.test(text);
  const colorAction = hasExplicitColorEditIntent(text);
  const namedColor = /(红|蓝|绿|黄|金|橙|紫|粉|棕|咖|褐|灰|青|墨绿|酒红|卡其|米色|藏蓝|深棕|浅棕|暖白)/u.test(text);
  const brightnessOnly = /(亮一点|暗一点|深一点|浅一点|更亮|更暗|更深|更浅)/u.test(text);
  const generationIntent = hasGenerationIntent(text);
  const shortColorRequest = !generationIntent && colorContext && namedColor;

  if (explicitHex) {
    if (colorAction) return true;
    if (generationIntent) return false;
    return colorContext;
  }

  if (shortColorRequest) return true;
  if (colorAction && namedColor) return true;
  if (colorAction && colorContext) return true;
  if (generationIntent && !colorAction && !colorContext && !brightnessOnly) return false;
  if (generationIntent && !colorAction && (namedColor || colorContext)) return false;

  return (colorContext && (colorAction || namedColor))
    || (colorAction && namedColor)
    || brightnessOnly;
}

function pickSemanticColorHex(
  text: string,
  templateType: 'light-ui' | 'dark-ui',
): string | null {
  const defs: Array<{ pattern: RegExp; hex: string }> = [
    { pattern: /(深棕|棕色|咖啡色|咖色|褐色)/u, hex: templateType === 'dark-ui' ? '#8A4B2A' : '#8B4513' },
    { pattern: /(酒红|深红|红色)/u, hex: templateType === 'dark-ui' ? '#8B1E3F' : '#B22222' },
    { pattern: /(藏蓝|深蓝|蓝色)/u, hex: templateType === 'dark-ui' ? '#1F4E8C' : '#1565C0' },
    { pattern: /(墨绿|深绿|绿色)/u, hex: templateType === 'dark-ui' ? '#2B5D34' : '#2E7D32' },
    { pattern: /(金色|金黄|黄色)/u, hex: templateType === 'dark-ui' ? '#A67C00' : '#C69214' },
    { pattern: /(橙色)/u, hex: templateType === 'dark-ui' ? '#A64B00' : '#EF6C00' },
    { pattern: /(紫色)/u, hex: templateType === 'dark-ui' ? '#4A2374' : '#6A1B9A' },
    { pattern: /(粉色)/u, hex: templateType === 'dark-ui' ? '#92204E' : '#D81B60' },
    { pattern: /(灰色)/u, hex: templateType === 'dark-ui' ? '#5C6773' : '#7A8694' },
  ];

  const matched = defs.find((def) => def.pattern.test(text));
  return matched ? matched.hex : null;
}

function buildAdjustedPrimaryColor(params: {
  userMessage: string;
  currentPrimaryColor?: string;
  templateType: 'light-ui' | 'dark-ui';
}): string | null {
  const { userMessage, currentPrimaryColor, templateType } = params;
  const explicitHex = extractHexColor(userMessage);
  if (explicitHex) return explicitHex;

  const semanticHex = pickSemanticColorHex(userMessage, templateType);
  if (semanticHex) return normalizePrimaryForTemplate(semanticHex, templateType);

  if (!currentPrimaryColor || !/^#[0-9a-fA-F]{6}$/.test(currentPrimaryColor)) return null;

  let adjusted = currentPrimaryColor;
  const shouldLighten = /(亮一点|浅一点|更亮|更浅|太暗|太深)/u.test(userMessage);
  const shouldDarken = /(暗一点|深一点|更暗|更深|太亮|太浅)/u.test(userMessage);
  const shouldWarm = /(暖一点|偏暖)/u.test(userMessage);
  const shouldCool = /(冷一点|偏冷)/u.test(userMessage);

  if (shouldLighten && !shouldDarken) adjusted = adjustHsl(adjusted, 8);
  if (shouldDarken && !shouldLighten) adjusted = adjustHsl(adjusted, -8);
  if (shouldWarm && !shouldCool) adjusted = adjustHsl(adjusted, 0, 6);
  if (shouldCool && !shouldWarm) adjusted = adjustHsl(adjusted, 0, -6);

  return normalizePrimaryForTemplate(adjusted, templateType);
}

function buildDominantColorPhrase(primaryHint: string | undefined): string | null {
  switch (primaryHint) {
    case 'red':
      return 'dominant festive red palette';
    case 'orange':
      return 'dominant vibrant orange-red palette';
    case 'yellow':
      return 'dominant golden palette';
    case 'green':
      return 'dominant green palette';
    case 'teal':
      return 'dominant teal palette';
    case 'blue':
      return 'dominant blue palette';
    case 'purple':
      return 'dominant purple palette';
    case 'pink':
      return 'dominant pink palette';
    default:
      return null;
  }
}

function pushUnique(parts: string[], value: string | null | undefined): void {
  if (!value) return;
  if (!parts.includes(value)) parts.push(value);
}

export function buildGenerationPromptFromPlan(context: {
  userMessage: string;
  priorAssistantMessage?: string;
  priorUserMessage?: string;
  templateType: 'light-ui' | 'dark-ui';
  primaryHint?: string;
}): string {
  const source = `${context.priorUserMessage || ''} ${context.priorAssistantMessage || ''} ${context.userMessage || ''}`;
  const text = stripMarkdown(source);
  const parts: string[] = [];

  if (/2026/.test(text)) pushUnique(parts, '2026');
  if (/新年|元旦|跨年/u.test(text)) pushUnique(parts, 'New Year celebration theme');
  if (/春节/u.test(text)) pushUnique(parts, 'Spring Festival festive atmosphere');
  if (/传统|国风|灯笼|剪纸/u.test(text)) pushUnique(parts, 'traditional Chinese festive elements');
  if (/现代|现代感/u.test(text)) pushUnique(parts, 'modern visual style');
  if (/科技|未来/u.test(text)) pushUnique(parts, 'futuristic visual language');
  if (/光效|流光|发光/u.test(text)) pushUnique(parts, 'modern light effects');
  if (/烟花/u.test(text)) pushUnique(parts, 'fireworks');
  if (/数字|2026/u.test(text)) pushUnique(parts, 'abstract 2026 numerals');
  if (/欢快|活力|活泼/u.test(text)) pushUnique(parts, 'joyful energetic atmosphere');
  if (/希望/u.test(text)) pushUnique(parts, 'hopeful uplifting mood');
  if (/庄重/u.test(text)) pushUnique(parts, 'ceremonial and refined tone');
  if (/明亮|清新|light-ui/u.test(text) || context.templateType === 'light-ui') {
    pushUnique(parts, 'bright clean interface-friendly background');
  }
  if (/深色|dark-ui/u.test(text) || context.templateType === 'dark-ui') {
    pushUnique(parts, 'deep cinematic background');
  }

  pushUnique(parts, buildDominantColorPhrase(context.primaryHint));
  if (parts.length === 0) {
    pushUnique(parts, 'festive seasonal celebration background');
  }
  pushUnique(parts, 'no UI elements');

  return parts.join(', ');
}

function buildFallbackPromptFromAssistantPlan(context: {
  userMessage: string;
  assistantMessage: string;
  priorAssistantMessage?: string;
  priorUserMessage?: string;
  templateType: 'light-ui' | 'dark-ui';
  primaryHint?: string;
}): string {
  const planSummary = extractPlanSummaryFromAssistantMessage(context.assistantMessage)
    || extractPlanSummaryFromAssistantMessage(context.priorAssistantMessage);
  if (planSummary.length >= 40) return planSummary;
  return buildGenerationPromptFromPlan({
    userMessage: context.userMessage,
    priorAssistantMessage: context.priorAssistantMessage ?? context.assistantMessage,
    priorUserMessage: context.priorUserMessage,
    templateType: context.templateType,
    primaryHint: context.primaryHint,
  });
}

export function inferPrimaryHintFromText(
  text: string | undefined,
  templateType: 'light-ui' | 'dark-ui',
): string | undefined {
  if (!text) return undefined;
  const explicit = resolvePreferredHueHint(text, templateType)?.label;
  if (explicit) return explicit;
  return resolveFestivalColorRule(text)?.primaryHint;
}

export function enrichToolCallsWithColorHints(
  toolCalls: ToolCall[],
  context: {
    userMessage: string;
    assistantMessage: string;
    priorAssistantMessage?: string;
    priorUserMessage?: string;
    templateType?: 'light-ui' | 'dark-ui';
    latestThemeAgentDebugState?: ThemeAgentDebugState | null;
    latestThemePreviews?: Array<{ url: string; style: string; prompt: string; directionLabel?: string }> | null;
    currentColors?: Record<string, string>;
  },
): ToolCall[] {
  const templateType = context.templateType ?? 'light-ui';
  if (isColorAdjustmentMessage(context.userMessage)) {
    const currentPrimaryColor =
      context.currentColors?.['primary-color']
      ?? context.currentColors?.primaryColor
      ?? context.currentColors?.['--primary-color'];
    const adjustedPrimary = buildAdjustedPrimaryColor({
      userMessage: context.userMessage,
      currentPrimaryColor,
      templateType,
    });

    if (adjustedPrimary) {
      return [{
        tool: 'update_colors',
        args: {
          colors: deriveColorsFromPrimary(adjustedPrimary, templateType),
        },
      }, ...toolCalls.filter((toolCall) =>
        toolCall.tool !== 'generate_theme_pipeline'
        && toolCall.tool !== 'generate_theme_previews'
        && toolCall.tool !== 'analyze_image'
        && toolCall.tool !== 'apply_selected_theme'
      )];
    }
  }

  const selectionResult = detectThemeSelection(
    context.userMessage,
    context.latestThemePreviews,
    context.latestThemeAgentDebugState?.preferredHueHint,
    context.templateType,
  );
  if (selectionResult) {
    return [{ tool: 'apply_selected_theme', args: selectionResult }, ...toolCalls];
  }

  if (
    isSimpleConfirmationMessage(context.userMessage)
    && context.latestThemePreviews
    && context.latestThemePreviews.length === 1
  ) {
    const singlePreview = context.latestThemePreviews[0];
    return [{
      tool: 'apply_selected_theme',
      args: {
        imageUrl: singlePreview.url,
        templateType: context.templateType ?? 'light-ui',
        ...(context.latestThemeAgentDebugState?.preferredHueHint
          ? { primaryHint: context.latestThemeAgentDebugState.preferredHueHint }
          : {}),
      },
    }, ...toolCalls];
  }

  const enriched = toolCalls.map((toolCall) => {
    if (toolCall.tool !== 'generate_theme_pipeline' && toolCall.tool !== 'generate_theme_previews') return toolCall;

    const templateType = normalizeTemplateType(
      toolCall.args.templateType ?? inferTemplateTypeFromText(context.priorAssistantMessage ?? context.assistantMessage),
    );
    const explicitHint = toolCall.args.primaryHint ?? toolCall.args.preferredHue ?? toolCall.args.colorDirection;
    const prompt = typeof toolCall.args.prompt === 'string'
      ? toolCall.args.prompt
      : typeof toolCall.args.description === 'string'
        ? toolCall.args.description
        : '';

    const inferredHint = (typeof explicitHint === 'string' && explicitHint.trim())
      ? explicitHint
      : inferPrimaryHintFromText(context.userMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorAssistantMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorUserMessage, templateType)
        ?? inferPrimaryHintFromText(prompt, templateType)
        ?? inferPrimaryHintFromText(context.assistantMessage, templateType);

    const rawDirections = toolCall.args.directions;
    const hasDirections = Array.isArray(rawDirections) && rawDirections.length > 0;

    if (!hasDirections) {
      const extracted = extractDirectionsFromText(context.assistantMessage);
      if (extracted.length > 0) {
        console.log('[enrichToolCalls] directions 为空，从回复文本提取到', extracted.length, '个方向');
        return {
          ...toolCall,
          tool: 'generate_theme_previews',
          args: {
            directions: extracted,
            templateType,
            ...(inferredHint ? { primaryHint: inferredHint } : {}),
          },
        };
      }
    }

    const finalPrompt = prompt.trim() || (
      isSimpleConfirmationMessage(context.userMessage) && context.priorAssistantMessage
        ? buildGenerationPromptFromPlan({
            userMessage: context.userMessage,
            priorAssistantMessage: context.priorAssistantMessage,
            priorUserMessage: context.priorUserMessage,
            templateType,
            primaryHint: typeof inferredHint === 'string' ? inferredHint : undefined,
          })
        : ''
    );

    if (toolCall.tool === 'generate_theme_pipeline') {
      return {
        ...toolCall,
        tool: 'generate_theme_pipeline',
        args: {
          ...toolCall.args,
          templateType,
          ...(finalPrompt ? { prompt: finalPrompt } : {}),
          ...(inferredHint ? { primaryHint: inferredHint } : {}),
        },
      };
    }

    return {
      ...toolCall,
      tool: 'generate_theme_previews',
      args: {
        ...toolCall.args,
        directions: hasDirections ? rawDirections : undefined,
        templateType,
        ...(finalPrompt ? { prompt: finalPrompt } : {}),
        ...(inferredHint ? { primaryHint: inferredHint } : {}),
      },
    };
  });

  const hasGeneratePipeline = enriched.some((toolCall) =>
    toolCall.tool === 'generate_theme_pipeline' || toolCall.tool === 'generate_theme_previews');

  if (!hasGeneratePipeline) {
    const sourceText = context.assistantMessage || context.priorAssistantMessage || '';
    const extractedDirections = extractDirectionsFromText(sourceText);
    const templateType = inferTemplateTypeFromText(sourceText);
    const primaryHint = inferPrimaryHintFromText(context.userMessage, templateType)
      ?? inferPrimaryHintFromText(sourceText, templateType)
      ?? inferPrimaryHintFromText(context.priorUserMessage, templateType);

    if (isSimpleConfirmationMessage(context.userMessage) && context.priorAssistantMessage) {
      const templateType = inferTemplateTypeFromText(context.priorAssistantMessage);
      const primaryHint = inferPrimaryHintFromText(context.userMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorAssistantMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorUserMessage, templateType)
        ?? inferPrimaryHintFromText(context.assistantMessage, templateType);
      const finalPrompt = buildGenerationPromptFromPlan({
        userMessage: context.userMessage,
        priorAssistantMessage: context.priorAssistantMessage,
        priorUserMessage: context.priorUserMessage,
        templateType,
        primaryHint: typeof primaryHint === 'string' ? primaryHint : undefined,
      });
      if (finalPrompt) {
        console.log('[enrichToolCalls] 简单确认消息，自动生成 generate_theme_pipeline');
        return [
          {
            tool: 'generate_theme_pipeline',
            args: {
              prompt: finalPrompt,
              templateType,
              ...(primaryHint ? { primaryHint } : {}),
            },
          },
          ...enriched,
        ];
      }
    }

    if (
      (shouldAutoGeneratePreview(context.assistantMessage) || mentionsGenerateThemePipeline(context.assistantMessage))
      && !isColorAdjustmentMessage(context.userMessage)
    ) {
      const fallbackPrompt = buildFallbackPromptFromAssistantPlan({
        userMessage: context.userMessage,
        assistantMessage: context.assistantMessage,
        priorAssistantMessage: context.priorAssistantMessage,
        priorUserMessage: context.priorUserMessage,
        templateType,
        primaryHint: typeof primaryHint === 'string' ? primaryHint : undefined,
      });
      if (fallbackPrompt) {
        console.log('[enrichToolCalls] 回复承诺生图但缺少工具调用，自动补 generate_theme_pipeline');
        return [
          {
            tool: 'generate_theme_pipeline',
            args: {
              prompt: fallbackPrompt,
              templateType,
              ...(primaryHint ? { primaryHint } : {}),
            },
          },
          ...enriched,
        ];
      }
    }
  }

  return enriched;
}

export function detectThemeSelection(
  userMessage: string,
  previews: Array<{ url: string; style: string; prompt: string; directionLabel?: string }> | null | undefined,
  preferredHueHint?: string,
  templateType?: 'light-ui' | 'dark-ui',
): { imageUrl: string; templateType: string; primaryHint?: string } | null {
  if (!previews || previews.length === 0) return null;
  const msg = userMessage.trim().toLowerCase();

  let selectedIndex = -1;

  if (/(第\s*[一二三四123]\s*张|选\s*[一二三四123ABCabc]|用\s*[一二三四123ABCabc]|图\s*[123ABCabc]|[123ABCabc]\s*张|就\s*(这个|这张|第一|第二|第三)|第\s*[123]\s*个)/i.test(msg)) {
    const digitMatch = msg.match(/[123]/);
    const letterMatch = msg.match(/[abc]/i);
    if (digitMatch) {
      selectedIndex = parseInt(digitMatch[0]) - 1;
    } else if (letterMatch) {
      selectedIndex = letterMatch[0].toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    } else if (/一|第一/.test(msg)) selectedIndex = 0;
    else if (/二|第二/.test(msg)) selectedIndex = 1;
    else if (/三|第三/.test(msg)) selectedIndex = 2;
  }

  if (/(这个|这张|就这)/.test(msg) && previews.length === 1) {
    selectedIndex = 0;
  }

  if (selectedIndex < 0 || selectedIndex >= previews.length) return null;

  return {
    imageUrl: previews[selectedIndex].url,
    templateType: templateType ?? 'light-ui',
    ...(preferredHueHint ? { primaryHint: preferredHueHint } : {}),
  };
}
