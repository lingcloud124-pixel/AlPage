import { escapeHtml } from '../workspace/card-renderer';
import type { WorkspaceConfig } from '../types';

export interface WorkspaceCardSelection {
  id: string;
  title: string;
  templateId?: string;
  size?: string;
}

export interface WorkspaceCardContentConfigurationOptions {
  selection: WorkspaceCardSelection;
  item?: WorkspaceConfig['items'][number] | null;
  templateProps?: Record<string, unknown>;
}

export function renderCardContentConfiguration(options: WorkspaceCardSelection | WorkspaceCardContentConfigurationOptions): void {
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return;

  const normalized = 'selection' in options ? options : { selection: options };
  const { selection, item, templateProps = {} } = normalized;
  const supportsItemCount = item ? ['message-todo', 'news-carousel', 'my-schedule', 'quick-access'].includes(item.templateId) : false;
  const supportsHeadline = item?.templateId === 'news-carousel';
  const supportsSummary = item ? ['message-todo', 'news-carousel'].includes(item.templateId) : false;
  const supportsBadge = item?.templateId === 'news-carousel';

  container.innerHTML = `
    <section class="workspace-properties-section card-content-configuration">
      <h4>卡片属性</h4>
      <div class="workspace-properties-form">
        <label class="workspace-properties-field">
          <span>卡片标题</span>
          <input id="workspace-card-title-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(selection.title || '未命名卡片')}">
        </label>
        ${supportsHeadline ? `
          <label class="workspace-properties-field">
            <span>主标题</span>
            <input id="workspace-card-headline-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(templateProps.headline ?? '')}">
          </label>
        ` : ''}
        ${supportsBadge ? `
          <label class="workspace-properties-field">
            <span>标签</span>
            <input id="workspace-card-badge-input" class="workspace-properties-input" type="text" value="${escapeHtml(templateProps.badge ?? '')}">
          </label>
        ` : ''}
        ${supportsSummary ? `
          <label class="workspace-properties-field">
            <span>摘要</span>
            <input id="workspace-card-summary-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(templateProps.summary ?? '')}">
          </label>
        ` : ''}
        ${supportsItemCount ? `
          <label class="workspace-properties-field">
            <span>展示条数</span>
            <input id="workspace-card-item-count-input" class="workspace-properties-input" type="number" min="1" max="12" value="${escapeHtml(templateProps.itemCount ?? 4)}">
          </label>
        ` : ''}
        <div class="workspace-properties-field"><span>模板类型</span><strong>${escapeHtml(selection.templateId || '-')}</strong></div>
        <div class="workspace-properties-field"><span>当前尺寸</span><strong>${escapeHtml(selection.size || '-')}</strong></div>
      </div>
      <p class="workspace-autosave-note">直接在工作区设计中选择卡片后配置内容，修改会自动保存。</p>
    </section>
  `;
}

export function clearCardContentConfiguration(): void {
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return;
  container.innerHTML = `
    <section class="workspace-properties-section card-content-configuration">
      <h4>卡片内容</h4>
      <p class="workspace-planning-empty">请先在工作区设计中点击一张卡片。</p>
    </section>
  `;
}
