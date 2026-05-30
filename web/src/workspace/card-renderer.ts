import type { CardTemplateListItem } from '../api/card-templates';
import type { WorkspaceConfig } from '../types';

const CARD_TITLES: Record<string, string> = {
  'message-todo': '待办事务',
  'news-carousel': '新闻轮播',
  'my-schedule': '我的日程',
  'quick-access': '快捷入口',
};

export interface WorkspaceCardRenderContext {
  mode: 'editor' | 'preview';
  templateCache: Record<string, CardTemplateListItem>;
}

export interface WorkspaceCardShellOptions {
  item: WorkspaceConfig['items'][number];
  context: WorkspaceCardRenderContext;
  style?: string;
  attributes?: Record<string, unknown>;
  extraClassName?: string;
}

export interface WorkspaceCardContent {
  body: string;
  extraClassName?: string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTemplateProps(
  item: WorkspaceConfig['items'][number],
  templateCache: Record<string, CardTemplateListItem>
): Record<string, any> {
  const template = templateCache[item.templateId] ?? null;
  return {
    ...((template?.defaultProps as Record<string, unknown>) ?? {}),
    ...((item.instanceProps as Record<string, unknown>) ?? {}),
  };
}

export function getWorkspaceCardTitle(
  item: WorkspaceConfig['items'][number],
  templateCache: Record<string, CardTemplateListItem>
): string {
  const instanceTitle = typeof item.instanceProps?.title === 'string' ? item.instanceProps.title.trim() : '';
  const template = templateCache[item.templateId] ?? null;
  return instanceTitle || String(template?.defaultProps?.title || template?.name || CARD_TITLES[item.templateId] || item.templateId);
}

export function renderListItems(items: Array<Record<string, unknown>>, labelKey: string, metaKey: string): string {
  return items
    .map((entry) => `<div class="workspace-card-list-item"><span>${escapeHtml(entry[labelKey])}</span><strong>${escapeHtml(entry[metaKey])}</strong></div>`)
    .join('');
}

export function buildCardRows(templateId: string): string {
  const rowsByTemplate: Record<string, string[]> = {
    'message-todo': ['待审批事项', '我发起的流程', '超时提醒'],
    'news-carousel': ['企业新闻头条', '公告速览', '活动专题'],
    'my-schedule': ['今日会议安排', '本周计划', '待跟进事项'],
    'quick-access': ['常用入口', '业务导航', '收藏应用'],
  };
  const rows = rowsByTemplate[templateId] ?? ['卡片内容占位'];
  return rows
    .map((row, index) => `<div class="workspace-editor-card-row"><span>${escapeHtml(row)}</span><span>${index + 1}</span></div>`)
    .join('');
}

export function renderTodoCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 4)) : [];
  return {
    extraClassName: 'workspace-card-list',
    body: `
      ${props.summary ? `<div class="workspace-card-summary">${escapeHtml(props.summary)}</div>` : ''}
      <div class="workspace-card-list">${renderListItems(items, 'label', 'meta')}</div>
    `,
  };
}

export function renderNewsCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 2)) : [];
  return {
    body: `
      <div class="workspace-card-news-hero">
        <div class="workspace-card-news-badge">${escapeHtml(props.badge || '专题')}</div>
        <div class="workspace-card-news-title">${escapeHtml(props.headline || '新闻标题')}</div>
        <div class="workspace-card-news-copy">${escapeHtml(props.summary || '新闻摘要')}</div>
      </div>
      <div class="workspace-card-list">${renderListItems(items, 'title', 'meta')}</div>
    `,
  };
}

export function renderScheduleCardContent(props: Record<string, any>): WorkspaceCardContent {
  const items = Array.isArray(props.items) ? props.items.slice(0, Number(props.itemCount ?? props.items.length ?? 3)) : [];
  return {
    body: items
      .map((entry: Record<string, unknown>) => `
        <div class="workspace-card-schedule-item">
          <div>
            <div class="workspace-card-schedule-title">${escapeHtml(entry.title)}</div>
            <div class="workspace-card-schedule-meta">${escapeHtml(entry.meta)}</div>
          </div>
          <strong>${escapeHtml(entry.status)}</strong>
        </div>
      `)
      .join(''),
  };
}

export function renderQuickAccessCardContent(props: Record<string, any>): WorkspaceCardContent {
  const links = Array.isArray(props.links) ? props.links.slice(0, Number(props.itemCount ?? props.links.length ?? 6)) : [];
  return {
    body: `<div class="workspace-card-quick-links">${links.map((label: unknown) => `<button type="button">${escapeHtml(label)}</button>`).join('')}</div>`,
  };
}

export function renderWorkspaceCardContent(
  item: WorkspaceConfig['items'][number],
  templateCache: Record<string, CardTemplateListItem>
): WorkspaceCardContent {
  const props = getTemplateProps(item, templateCache);
  if (item.templateId === 'message-todo') return renderTodoCardContent(props);
  if (item.templateId === 'news-carousel') return renderNewsCardContent(props);
  if (item.templateId === 'my-schedule') return renderScheduleCardContent(props);
  if (item.templateId === 'quick-access') return renderQuickAccessCardContent(props);
  return {
    body: buildCardRows(item.templateId),
  };
}

function renderHtmlAttributes(attributes: Record<string, unknown> = {}): string {
  return Object.entries(attributes)
    .filter(([name, value]) => name.trim().length > 0 && value !== null && value !== undefined && value !== false)
    .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value === true ? '' : value)}"`)
    .join('');
}

export function renderWorkspaceCardShell({ item, context, style, attributes, extraClassName }: WorkspaceCardShellOptions): string {
  const title = getWorkspaceCardTitle(item, context.templateCache);
  const content = renderWorkspaceCardContent(item, context.templateCache);
  const isEditor = context.mode === 'editor';
  const shellClass = [isEditor ? 'workspace-editor-card' : 'workspace-preview-card', content.extraClassName, extraClassName]
    .filter(Boolean)
    .map((className) => escapeHtml(className))
    .join(' ');
  const contentClass = isEditor ? 'workspace-editor-card-content' : 'workspace-preview-card-content';
  const headerControls = isEditor
    ? '<button class="workspace-editor-card-drag-handle" type="button" data-action="drag-card" aria-label="拖拽卡片" title="拖拽卡片">⋮⋮</button>'
    : '';
  const resizeHandle = isEditor ? '<button class="workspace-editor-card-resize-handle" type="button" data-action="resize-card" aria-label="缩放卡片" title="缩放卡片">↘</button>' : '';
  const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';

  return `
    <article class="${shellClass}"${styleAttribute} data-item-id="${escapeHtml(item.id)}" data-template-id="${escapeHtml(item.templateId)}"${renderHtmlAttributes(attributes)}>
      <header class="workspace-editor-card-header">
        <div class="workspace-editor-card-header-main">
          ${isEditor ? headerControls : ''}
          <div class="workspace-editor-card-title">${escapeHtml(title)}</div>
        </div>
        ${isEditor ? `
          <div class="workspace-editor-card-header-actions">
            <div class="workspace-editor-card-meta">${escapeHtml(item.templateId)}</div>
            <button class="workspace-editor-card-delete" type="button" data-action="delete-card" aria-label="删除卡片" title="删除卡片">×</button>
          </div>
        ` : ''}
      </header>
      <div class="${contentClass}">${content.body}</div>
      ${resizeHandle}
    </article>
  `;
}
