import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CardTemplateListItem } from '../../web/src/api/card-templates';
import type { WorkspaceConfig } from '../../web/src/types';
import { renderWorkspaceCardShell } from '../../web/src/workspace/card-renderer';

const baseItem: WorkspaceConfig['items'][number] = {
  id: 'card-1',
  templateId: 'news-carousel',
  x: 0,
  y: 0,
  w: 2,
  h: 12,
};

function renderCard(
  item: WorkspaceConfig['items'][number],
  templateCache: Record<string, CardTemplateListItem>,
  mode: 'editor' | 'preview' = 'editor'
): string {
  return renderWorkspaceCardShell({
    item,
    context: { mode, templateCache },
  });
}

describe('workspace card renderer', () => {
  test('merges defaultProps and instanceProps with instance values taking precedence', () => {
    const html = renderCard(
      {
        ...baseItem,
        instanceProps: {
          title: '实例标题',
          headline: '实例主标题',
          itemCount: 1,
        },
      },
      {
        'news-carousel': {
          id: 'tpl-news',
          type: 'news-carousel',
          name: '模板标题',
          defaultProps: {
            title: '默认标题',
            headline: '默认主标题',
            summary: '默认摘要',
            itemCount: 2,
            items: [
              { title: '第一条', meta: '今天' },
              { title: '第二条', meta: '明天' },
            ],
          },
        },
      }
    );

    expect(html).toContain('实例标题');
    expect(html).toContain('实例主标题');
    expect(html).toContain('默认摘要');
    expect(html).toContain('第一条');
    expect(html).not.toContain('第二条');
    expect(html).not.toContain('默认标题');
    expect(html).not.toContain('默认主标题');
  });

  test('escapes user and template fields before rendering HTML', () => {
    const html = renderCard(
      {
        ...baseItem,
        id: 'card-<script>',
        templateId: 'news-carousel',
        instanceProps: {
          title: '<img src=x onerror=alert(1)>',
          headline: '<b>实例主标题</b>',
        },
      },
      {
        'news-carousel': {
          id: 'tpl-news',
          type: 'news-carousel',
          name: '<template-name>',
          defaultProps: {
            summary: '摘要 & 说明',
            badge: '专题 "推荐"',
            items: [{ title: '<script>alert(1)</script>', meta: "O'Reilly" }],
          },
        },
      }
    );

    expect(html).toContain('card-&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;b&gt;实例主标题&lt;/b&gt;');
    expect(html).toContain('摘要 &amp; 说明');
    expect(html).toContain('专题 &quot;推荐&quot;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('O&#39;Reilly');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('editor shell includes drag, delete, and resize controls', () => {
    const html = renderCard(baseItem, {});

    expect(html).toContain('data-action="drag-card"');
    expect(html).toContain('data-action="delete-card"');
    expect(html).toContain('data-action="resize-card"');
    expect(html).toContain('workspace-editor-card-drag-handle');
    expect(html).toContain('workspace-editor-card-delete');
    expect(html).toContain('workspace-editor-card-resize-handle');
  });

  test('applies extraClassName to the article class', () => {
    const html = renderWorkspaceCardShell({
      item: { ...baseItem, templateId: 'message-todo' },
      context: {
        mode: 'editor',
        templateCache: {
          'message-todo': {
            id: 'tpl-todo',
            type: 'message-todo',
            name: '待办',
            defaultProps: { items: [] },
          },
        },
      },
      extraClassName: 'custom-shell-class',
    });

    expect(html).toContain('class="workspace-editor-card workspace-card-list custom-shell-class"');
  });

  test('accepts explicit shell style and attributes without string injection', () => {
    const html = renderWorkspaceCardShell({
      item: baseItem,
      context: { mode: 'editor', templateCache: {} },
      style: 'grid-column: 1 / span 2; grid-row: 1 / span 12;',
      attributes: {
        'data-width': 2,
        'data-height': 12,
      },
    });

    expect(html).toContain('style="grid-column: 1 / span 2; grid-row: 1 / span 12;"');
    expect(html).toContain('data-width="2"');
    expect(html).toContain('data-height="12"');
  });

  test('escapes card library preview image URL before writing style attribute', () => {
    const runtimeSource = readFileSync(resolve(process.cwd(), 'web/src/workspace/runtime.ts'), 'utf-8');

    expect(runtimeSource).toContain("const previewImageUrl = escapeHtml(item.previewImageUrl ?? '')");
    expect(runtimeSource).toContain("url('${previewImageUrl}')");
    expect(runtimeSource).not.toContain('String(item.previewImageUrl).replace');
  });
});
