import { describe, expect, test } from 'vitest';

import { buildGenerationPromptFromPlan, enrichToolCallsWithColorHints, inferPrimaryHintFromText } from '../../web/src/agent/tool-call-utils';
import type { ToolCall } from '../../web/src/types';

describe('web theme tool call color hints', () => {
  test('infers canonical hue labels from chinese theme descriptions', () => {
    expect(inferPrimaryHintFromText('做一个红色喜庆的新年主题', 'light-ui')).toBe('red');
    expect(inferPrimaryHintFromText('科技感蓝紫色调', 'dark-ui')).toBe('blue');
    expect(inferPrimaryHintFromText('需要一套国风端午节主题包', 'light-ui')).toBe('green');
    expect(inferPrimaryHintFromText('来一套春日气息的清明节主题皮肤', 'light-ui')).toBe('green');
    expect(inferPrimaryHintFromText('为祖国庆生，做一个国庆节主题包', 'light-ui')).toBe('red');
    expect(inferPrimaryHintFromText('想做一个元旦主题首页', 'light-ui')).toBe('blue');
  });

  test('backfills generate_theme_pipeline primaryHint from user intent', () => {
    const toolCalls: ToolCall[] = [
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: 'Chinese New Year celebration, festive atmosphere, lanterns, warm light',
          templateType: 'light-ui',
        },
      },
    ];

    const enriched = enrichToolCallsWithColorHints(toolCalls, {
      userMessage: '我要做一个26年新年主题，主视觉要红色喜庆一点',
      assistantMessage: '我会为您设计一个红色喜庆的新年主题。',
    });

    expect(enriched[0].args.primaryHint).toBe('red');
  });

  test('preserves explicit primaryHint from tool call', () => {
    const toolCalls: ToolCall[] = [
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: 'Chinese New Year celebration',
          templateType: 'light-ui',
          primaryHint: 'orange',
        },
      },
    ];

    const enriched = enrichToolCallsWithColorHints(toolCalls, {
      userMessage: '我想要红色',
      assistantMessage: '我会做成红色系。',
    });

    expect(enriched[0].args.primaryHint).toBe('orange');
  });

  test('synthesizes generate_theme_pipeline after a simple confirmation', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '好',
      priorUserMessage: '我需要生成一个2026年的新年主题',
      priorAssistantMessage: '好的，为您构思2026年新年主题。我计划以充满活力的橙红色为主色调，搭配金色作为点缀。背景图融入现代感的光效、烟花或抽象的"2026"数字元素，营造欢快、充满希望的新年氛围。整体采用明亮清新的 light-ui 模式。您觉得这个方向可以吗？',
      assistantMessage: '好的，我开始为您生成。',
    });

    expect(enriched[0].tool).toBe('generate_theme_pipeline');
    expect(enriched[0].args.primaryHint).toBe('red');
    expect(String(enriched[0].args.prompt)).toContain('2026');
    expect(String(enriched[0].args.prompt)).toContain('fireworks');
    expect(String(enriched[0].args.prompt)).toContain('dominant festive red palette');
  });

  test('single preview confirmation applies the generated theme directly', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '确认',
      assistantMessage: '好的，正在应用当前方案。',
      templateType: 'light-ui',
      latestThemeAgentDebugState: {
        toolCallPrompt: 'single prompt',
        preferredHueHint: 'blue',
      },
      latestThemePreviews: [{
        url: 'https://example.com/preview.png',
        style: 'single-direction',
        prompt: 'single prompt',
        directionLabel: '当前方案',
      }],
    });

    expect(enriched[0].tool).toBe('apply_selected_theme');
    expect(enriched[0].args.imageUrl).toBe('https://example.com/preview.png');
    expect(enriched[0].args.primaryHint).toBe('blue');
  });

  test('builds a prompt from the approved plan summary', () => {
    const prompt = buildGenerationPromptFromPlan({
      userMessage: '好',
      priorUserMessage: '我需要生成一个2026年的新年主题',
      priorAssistantMessage: '我计划以充满活力的橙红色为主色调，搭配金色作为点缀。背景图融入现代感的光效、烟花或抽象的"2026"数字元素，营造欢快、充满希望的新年氛围。整体采用明亮清新的 light-ui 模式。',
      templateType: 'light-ui',
      primaryHint: 'orange',
    });

    expect(prompt).toContain('New Year celebration theme');
    expect(prompt).toContain('modern light effects');
    expect(prompt).toContain('abstract 2026 numerals');
    expect(prompt).toContain('no UI elements');
  });

  test('backfills dragon boat requests with green primaryHint when no explicit color is provided', () => {
    const toolCalls: ToolCall[] = [
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: 'Dragon Boat Festival, traditional Chinese visual language',
          templateType: 'light-ui',
        },
      },
    ];

    const enriched = enrichToolCallsWithColorHints(toolCalls, {
      userMessage: '需要一套国风端午节主题包',
      assistantMessage: '我来为您设计端午节主题。',
    });

    expect(enriched[0].args.primaryHint).toBe('green');
  });

  test('routes explicit hex theme color edits to update_colors instead of image generation', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '我想把主题色改成#6A2500',
      assistantMessage: '好的，我来帮您调整。',
      templateType: 'light-ui',
      currentColors: {
        'primary-color': '#61D1D1',
      },
    });

    expect(enriched[0].tool).toBe('update_colors');
    expect(enriched[0].args.colors).toMatchObject({
      'primary-color': '#6A2500',
    });
  });

  test('routes semantic color edits to update_colors instead of image generation', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '主题色改成深棕色，更稳重一点',
      assistantMessage: '好的，我来帮您调整。',
      templateType: 'light-ui',
      currentColors: {
        'primary-color': '#61D1D1',
      },
    });

    expect(enriched[0].tool).toBe('update_colors');
    expect(String((enriched[0].args.colors as Record<string, string>)['primary-color'])).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('routes brightness-only color adjustments to update_colors using current primary color', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '这个颜色太暗了，亮一点',
      assistantMessage: '好的，我来帮您调整。',
      templateType: 'light-ui',
      currentColors: {
        'primary-color': '#6A2500',
      },
    });

    expect(enriched[0].tool).toBe('update_colors');
    expect((enriched[0].args.colors as Record<string, string>)['primary-color']).not.toBe('#6A2500');
  });

  test('prefers update_colors over preview selection when user adjusts theme color on a single preview', () => {
    const enriched = enrichToolCallsWithColorHints([], {
      userMessage: '主题色改成深棕色，更稳重一点',
      assistantMessage: '好的，我来帮您调整。',
      templateType: 'light-ui',
      currentColors: {
        'primary-color': '#61D1D1',
      },
      latestThemeAgentDebugState: {
        toolCallPrompt: 'mid-autumn prompt',
        preferredHueHint: 'orange',
      },
      latestThemePreviews: [{
        url: 'https://example.com/mid-autumn.png',
        style: 'single-direction',
        prompt: 'mid-autumn prompt',
        directionLabel: '当前方案',
      }],
    });

    expect(enriched).toHaveLength(1);
    expect(enriched[0].tool).toBe('update_colors');
    expect(enriched.some((toolCall) => toolCall.tool === 'apply_selected_theme')).toBe(false);
  });
});
