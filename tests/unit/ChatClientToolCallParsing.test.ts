import { describe, expect, test } from 'vitest';

import { parseToolCallsFromContent } from '../../web/src/agent/chat-client';

describe('chat client tool call parsing', () => {
  test('parses wrapped TOOL_CALL payloads produced by current model formatting', () => {
    const content = `现在为您生成一张预览图。[TOOL_CALL] {tool => "generate_theme_pipeline", args => { --prompt "一面飘扬的党旗占据画面左侧核心位置，正红与深红渐变渲染", --templateType "light-ui" --primaryHint "red" }} [/TOOL_CALL]`;

    expect(parseToolCallsFromContent(content)).toEqual([
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: '一面飘扬的党旗占据画面左侧核心位置，正红与深红渐变渲染',
          templateType: 'light-ui',
          primaryHint: 'red',
        },
      },
    ]);
  });

  test('parses compact json code fences without requiring surrounding blank lines', () => {
    const content = `好的，我为您重新生成一张预览图。\n\`\`\`json\n{"tool":"generate_theme_pipeline","args":{"prompt":"微软风格数字信息可视化插画","templateType":"light-ui","primaryHint":"blue"}}\n\`\`\``;

    expect(parseToolCallsFromContent(content)).toEqual([
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: '微软风格数字信息可视化插画',
          templateType: 'light-ui',
          primaryHint: 'blue',
        },
      },
    ]);
  });

  test('falls back to balanced-json extraction when generate_theme_pipeline json appears inline in assistant text', () => {
    const content = `好的，我先为您整理一个方案：主视觉采用三条透明渐变信息带。\n\n{"tool": "generate_theme_pipeline", "args": {"prompt": "三条透明渐变信息带", "templateType": "light-ui", "primaryHint": "blue"}}\n\n`;

    expect(parseToolCallsFromContent(content)).toEqual([
      {
        tool: 'generate_theme_pipeline',
        args: {
          prompt: '三条透明渐变信息带',
          templateType: 'light-ui',
          primaryHint: 'blue',
        },
      },
    ]);
  });
});
