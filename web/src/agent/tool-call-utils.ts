import type { ToolCall } from '../types';
import { resolvePreferredHueHint } from '../theme/color-utils';
import { parseThemeFeedback } from '../tools/theme-feedback-refiner';
import { buildRegeneratedScenePlan } from '../tools/theme-regeneration-director';
import { buildDirectedPrompt } from '../tools/theme-prompt-director';
import type { ThemeAgentDebugState } from '../chat-manager';

function normalizeTemplateType(value: unknown): 'light-ui' | 'dark-ui' {
  return value === 'dark-ui' ? 'dark-ui' : 'light-ui';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
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
  pushUnique(parts, 'no text');
  pushUnique(parts, 'no UI elements');

  return parts.join(', ');
}

export function inferPrimaryHintFromText(
  text: string | undefined,
  templateType: 'light-ui' | 'dark-ui',
): string | undefined {
  if (!text) return undefined;
  return resolvePreferredHueHint(text, templateType)?.label;
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
  },
): ToolCall[] {
  const enriched = toolCalls.map((toolCall) => {
    if (toolCall.tool !== 'generate_theme_pipeline') return toolCall;

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

    const regeneratedPrompt = (!isSimpleConfirmationMessage(context.userMessage)
      && context.latestThemeAgentDebugState?.intent
      && context.latestThemeAgentDebugState?.scenePlan)
      ? (() => {
          const adjustment = parseThemeFeedback(context.userMessage);
          const hasAdjustment = Object.values(adjustment).some((value) =>
            Array.isArray(value) ? value.length > 0 : value !== undefined,
          );
          if (!hasAdjustment) return '';
          const basePlan = context.latestThemeAgentDebugState.scenePlan;
          const regenerated = buildRegeneratedScenePlan(
            context.latestThemeAgentDebugState.intent,
            basePlan,
            adjustment,
          );
          return buildDirectedPrompt(regenerated.nextScenePlan).prompt;
        })()
      : '';

      return {
        ...toolCall,
        args: {
          ...toolCall.args,
          templateType,
          ...((regeneratedPrompt || finalPrompt) ? { prompt: regeneratedPrompt || finalPrompt } : {}),
          ...(inferredHint ? { primaryHint: inferredHint } : {}),
          ...(regeneratedPrompt ? { themeFeedbackRegenerated: true } : {}),
        },
      };
  });

  const hasGeneratePipeline = enriched.some((toolCall) =>
    toolCall.tool === 'generate_theme_pipeline');
  if (!hasGeneratePipeline && isSimpleConfirmationMessage(context.userMessage) && context.priorAssistantMessage) {
    const templateType = inferTemplateTypeFromText(context.priorAssistantMessage);
    const primaryHint = inferPrimaryHintFromText(context.priorAssistantMessage, templateType)
      ?? inferPrimaryHintFromText(context.priorUserMessage, templateType)
      ?? inferPrimaryHintFromText(context.assistantMessage, templateType);

    return [
      {
        tool: 'generate_theme_pipeline',
        args: {
          templateType,
          prompt: buildGenerationPromptFromPlan({
            userMessage: context.userMessage,
            priorAssistantMessage: context.priorAssistantMessage,
            priorUserMessage: context.priorUserMessage,
            templateType,
            primaryHint,
          }),
          ...(primaryHint ? { primaryHint } : {}),
        },
      },
      ...enriched,
    ];
  }

  if (!hasGeneratePipeline && context.latestThemeAgentDebugState?.intent && context.latestThemeAgentDebugState?.scenePlan) {
    const adjustment = parseThemeFeedback(context.userMessage);
    const hasAdjustment = Object.values(adjustment).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined,
    );

    if (hasAdjustment) {
      const basePlan = context.latestThemeAgentDebugState.scenePlan;
      const regenerated = buildRegeneratedScenePlan(
        context.latestThemeAgentDebugState.intent,
        basePlan,
        adjustment,
      );
      const directedPrompt = buildDirectedPrompt(regenerated.nextScenePlan).prompt;
      const templateType = context.latestThemeAgentDebugState.intent.templateType ?? 'light-ui';
      const primaryHint = inferPrimaryHintFromText(context.userMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorAssistantMessage, templateType)
        ?? inferPrimaryHintFromText(context.priorUserMessage, templateType);

      return [
        {
          tool: 'generate_theme_pipeline',
          args: {
            templateType,
            prompt: directedPrompt,
            ...(primaryHint ? { primaryHint } : {}),
            themeFeedbackRegenerated: true,
          },
        },
        ...enriched,
      ];
    }
  }

  if (!hasGeneratePipeline && /方向\s*[ABCabc·]/u.test(context.assistantMessage)) {
    const templateType = inferTemplateTypeFromText(context.assistantMessage);
    const prompt = buildGenerationPromptFromPlan({
      userMessage: context.userMessage,
      priorAssistantMessage: context.assistantMessage,
      priorUserMessage: context.priorUserMessage,
      templateType,
    });
    const primaryHint = inferPrimaryHintFromText(context.userMessage, templateType)
      ?? inferPrimaryHintFromText(context.assistantMessage, templateType);

    return [
      {
        tool: 'generate_theme_pipeline',
        args: {
          templateType,
          prompt,
          ...(primaryHint ? { primaryHint } : {}),
        },
      },
      ...enriched,
    ];
  }

  return enriched;
}
