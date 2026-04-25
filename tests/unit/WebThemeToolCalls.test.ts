import { describe, expect, test } from 'vitest';

import { buildGenerationPromptFromPlan, enrichToolCallsWithColorHints, inferPrimaryHintFromText } from '../../web/src/agent/tool-call-utils';
import type { ToolCall } from '../../web/src/types';

describe('web theme tool call color hints', () => {
  test('infers canonical hue labels from chinese theme descriptions', () => {
    expect(inferPrimaryHintFromText('做一个红色喜庆的新年主题', 'light-ui')).toBe('red');
    expect(inferPrimaryHintFromText('科技感蓝紫色调', 'dark-ui')).toBe('blue');
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

    expect(enriched[0].tool).toBe('generate_theme_previews');
    expect(enriched[0].args.primaryHint).toBe('red');
    expect(String(enriched[0].args.prompt)).toContain('2026');
    expect(String(enriched[0].args.prompt)).toContain('fireworks');
    expect(String(enriched[0].args.prompt)).toContain('dominant festive red palette');
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
});
