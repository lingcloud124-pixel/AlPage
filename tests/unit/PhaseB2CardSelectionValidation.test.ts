import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildCardLibraryPromptSummary,
  validateCardSelection,
  filterAIWritableProps,
} from '../../web/src/portal-agent';
import type { CardTemplateListItem } from '../../web/src/api/card-templates';

const projectRoot = process.cwd();

const mockTemplates: CardTemplateListItem[] = [
  {
    id: 'tpl-message-todo',
    name: '待办事项',
    type: 'list',
    enabled: true,
    industryTags: ['通用'],
    capabilityTags: ['待办'],
    scenarioTags: [],
    fields: [
      { key: 'summary', label: '摘要', type: 'text', aiWritable: true },
      { key: 'itemCount', label: '数量', type: 'number', aiWritable: true },
      { key: 'internalNote', label: '内部备注', type: 'text', aiWritable: false },
    ],
  },
  {
    id: 'tpl-news-carousel',
    name: '新闻轮播',
    type: 'carousel',
    enabled: true,
    industryTags: [],
    capabilityTags: ['资讯'],
    scenarioTags: ['首页'],
    fields: [
      { key: 'headline', label: '标题', type: 'text', aiWritable: true, required: true },
      { key: 'itemCount', label: '数量', type: 'number', aiWritable: false },
    ],
  },
  {
    id: 'tpl-disabled-card',
    name: '已禁用卡片',
    type: 'text',
    enabled: false,
    fields: [],
  },
];

describe('Phase B2: AI card selection + schema validation', () => {
  // --- buildCardLibraryPromptSummary ---
  describe('buildCardLibraryPromptSummary', () => {
    test('includes enabled templates only', () => {
      const result = buildCardLibraryPromptSummary(mockTemplates);
      expect(result).toContain('tpl-message-todo');
      expect(result).toContain('tpl-news-carousel');
      expect(result).not.toContain('tpl-disabled-card');
    });

    test('includes aiWritable fields only', () => {
      const result = buildCardLibraryPromptSummary(mockTemplates);
      expect(result).toContain('summary');
      expect(result).not.toContain('internalNote');
    });

    test('includes tags', () => {
      const result = buildCardLibraryPromptSummary(mockTemplates);
      expect(result).toContain('通用');
      expect(result).toContain('资讯');
      expect(result).toContain('首页');
    });

    test('includes card selection rules', () => {
      const result = buildCardLibraryPromptSummary(mockTemplates);
      expect(result).toContain('不能发明新卡片');
      expect(result).toContain('aiWritable');
      expect(result).toContain('uncoveredNeeds');
    });

    test('returns empty string for empty array', () => {
      expect(buildCardLibraryPromptSummary([])).toBe('');
    });
  });

  // --- validateCardSelection ---
  describe('validateCardSelection', () => {
    test('accepts valid card with known template', () => {
      const result = validateCardSelection(
        [{ templateId: 'tpl-message-todo', instanceProps: { summary: '3项待办' } }],
        mockTemplates,
      );
      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].templateId).toBe('tpl-message-todo');
      expect(result.valid[0].instanceProps.summary).toBe('3项待办');
      expect(result.rejected).toHaveLength(0);
    });

    test('rejects unknown templateId', () => {
      const result = validateCardSelection(
        [{ templateId: 'tpl-nonexistent', instanceProps: {} }],
        mockTemplates,
      );
      expect(result.valid).toHaveLength(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toContain('未知模板');
    });

    test('rejects disabled template', () => {
      const result = validateCardSelection(
        [{ templateId: 'tpl-disabled-card', instanceProps: {} }],
        mockTemplates,
      );
      expect(result.valid).toHaveLength(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].reason).toContain('禁用');
    });

    test('filters non-aiWritable fields from valid cards', () => {
      const result = validateCardSelection(
        [{
          templateId: 'tpl-message-todo',
          instanceProps: { summary: 'OK', internalNote: 'should be removed' },
        }],
        mockTemplates,
      );
      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].instanceProps.summary).toBe('OK');
      expect(result.valid[0].instanceProps.internalNote).toBeUndefined();
      expect(result.valid[0].rejectedFields).toHaveLength(1);
      expect(result.valid[0].rejectedFields[0]).toContain('internalNote');
    });

    test('handles mixed valid and rejected cards', () => {
      const result = validateCardSelection(
        [
          { templateId: 'tpl-message-todo', instanceProps: { summary: 'OK' } },
          { templateId: 'tpl-nonexistent', instanceProps: {} },
          { templateId: 'tpl-disabled-card', instanceProps: {} },
        ],
        mockTemplates,
      );
      expect(result.valid).toHaveLength(1);
      expect(result.rejected).toHaveLength(2);
    });
  });

  // --- filterAIWritableProps ---
  describe('filterAIWritableProps', () => {
    test('keeps aiWritable fields', () => {
      const template = mockTemplates[0]; // tpl-message-todo
      const result = filterAIWritableProps(template, { summary: 'test', itemCount: 5 });
      expect(result.props.summary).toBe('test');
      expect(result.props.itemCount).toBe(5);
      expect(result.rejected).toHaveLength(0);
    });

    test('rejects non-aiWritable fields', () => {
      const template = mockTemplates[0];
      const result = filterAIWritableProps(template, { internalNote: 'secret' });
      expect(Object.keys(result.props)).toHaveLength(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toContain('非 aiWritable');
    });

    test('rejects undefined fields', () => {
      const template = mockTemplates[0];
      const result = filterAIWritableProps(template, { unknownField: 'value' });
      expect(Object.keys(result.props)).toHaveLength(0);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toContain('未定义字段');
    });
  });

  // --- prompt template injection ---
  describe('prompt template has CARD_LIBRARY placeholder', () => {
    test('portal-agent-prompt.txt contains {{CARD_LIBRARY}}', () => {
      const content = fs.readFileSync(
        path.join(projectRoot, 'web/src/agent/portal-agent-prompt.txt'),
        'utf8',
      );
      expect(content).toContain('{{CARD_LIBRARY}}');
    });
  });

  // --- system-prompt.ts integration ---
  describe('system-prompt.ts injects card library', () => {
    test('getSystemPrompt accepts cardTemplates parameter', () => {
      const source = fs.readFileSync(
        path.join(projectRoot, 'web/src/agent/system-prompt.ts'),
        'utf8',
      );
      expect(source).toContain('cardTemplates');
      expect(source).toContain('buildCardLibraryPromptSummary');
      expect(source).toContain('{{CARD_LIBRARY}}');
    });
  });

  // --- chat-manager wiring ---
  describe('chat-manager wires card library', () => {
    test('chat-manager imports validateCardSelection and listCardTemplates', () => {
      const source = fs.readFileSync(
        path.join(projectRoot, 'web/src/chat-manager.ts'),
        'utf8',
      );
      expect(source).toContain('validateCardSelection');
      expect(source).toContain('listCardTemplates');
    });
  });
});
