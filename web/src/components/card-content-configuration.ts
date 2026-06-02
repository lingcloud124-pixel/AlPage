import { escapeHtml } from '../workspace/card-renderer';
import { getWorkspaceTemplateCache } from '../workspace/runtime';
import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';

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

/**
 * Schema-driven card content configuration form.
 * Fetches CardTemplate.fields from workspaceTemplateCache and generates
 * form controls dynamically based on field type.
 */
export function renderCardContentConfiguration(options: WorkspaceCardSelection | WorkspaceCardContentConfigurationOptions): void {
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return;

  const normalized = 'selection' in options
    ? options as WorkspaceCardContentConfigurationOptions
    : { selection: options as WorkspaceCardSelection, item: undefined as undefined, templateProps: {} as Record<string, unknown> };
  const { selection, item, templateProps = {} } = normalized;

  // Get template schema from global workspace template cache
  const templateId = item?.templateId ?? selection.templateId;
  const template = getCardTemplateFromCache(templateId);
  const fields = template?.fields ?? [];

  // Build schema-driven form fields
  let schemaFieldsHtml = '';
  for (const field of fields) {
    const value = templateProps[field.key] ?? '';
    schemaFieldsHtml += renderSchemaField(field, value);
  }

  container.innerHTML = `
    <section class="workspace-properties-section card-content-configuration">
      <h4>卡片属性</h4>
      <div class="workspace-properties-form">
        <label class="workspace-properties-field">
          <span>卡片标题</span>
          <input id="workspace-card-title-input" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(selection.title || '未命名卡片')}">
        </label>
        ${fields.length > 0 ? `
          <div class="config-section">
            <h4 class="config-section-title">内容字段</h4>
            ${schemaFieldsHtml}
          </div>
        ` : ''}
        <div class="workspace-properties-field"><span>模板类型</span><strong>${escapeHtml(selection.templateId || '-')}</strong></div>
        <div class="workspace-properties-field"><span>当前尺寸</span><strong>${escapeHtml(selection.size || '-')}</strong></div>
      </div>
      ${fields.length === 0 && templateId ? '<p class="workspace-autosave-note">该卡片模板暂无可配置字段。</p>' : ''}
      <p class="workspace-autosave-note">直接在工作区设计中选择卡片后配置内容，修改会自动保存。</p>
    </section>
  `;

  // Store field definitions on the container for the save handler
  if (fields.length > 0) {
    (container as any).__cardFields = fields;
  }
}

function renderSchemaField(field: { key: string; label: string; type: string; required?: boolean; options?: string[]; itemSchema?: Record<string, string> }, value: unknown): string {
  const fieldId = `card-field-${field.key}`;
  const strValue = String(value ?? '');

  switch (field.type) {
    case 'text':
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(strValue)}" ${field.required ? 'required' : ''}>
        </label>`;

    case 'number':
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input" type="number" value="${escapeHtml(strValue)}" ${field.required ? 'required' : ''}>
        </label>`;

    case 'link':
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input workspace-properties-input-wide" type="url" value="${escapeHtml(strValue)}" placeholder="https://" ${field.required ? 'required' : ''}>
        </label>`;

    case 'select':
      const optionsHtml = (field.options ?? []).map((opt) =>
        `<option value="${escapeHtml(opt)}" ${opt === strValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`
      ).join('');
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <select id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input">
            <option value="">请选择</option>
            ${optionsHtml}
          </select>
        </label>`;

    case 'boolean':
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" type="checkbox" ${value ? 'checked' : ''}>
        </label>`;

    case 'image':
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input workspace-properties-input-wide" type="text" value="${escapeHtml(strValue)}" placeholder="图片 URL">
        </label>`;

    case 'list':
      const items = Array.isArray(value) ? value : [];
      const itemRows = items.map((item: any, idx: number) => {
        const cells = field.itemSchema ? Object.entries(field.itemSchema).map(([key]) =>
          `<input class="workspace-properties-input card-list-item-cell" data-list-key="${escapeHtml(key)}" value="${escapeHtml(item[key] ?? '')}" placeholder="${escapeHtml(key)}">`
        ).join(' ') : `<input class="workspace-properties-input card-list-item-cell" value="${escapeHtml(String(item))}">`;
        return `<div class="card-list-item-row" data-index="${idx}">${cells}<button type="button" class="card-list-item-remove" data-action="remove-list-item">×</button></div>`;
      }).join('');
      return `
        <div class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <div id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="card-list-editor">
            ${itemRows}
            <button type="button" class="card-list-item-add" data-action="add-list-item" data-target="${fieldId}">+ 添加</button>
          </div>
        </div>`;

    default:
      return `
        <label class="workspace-properties-field">
          <span>${escapeHtml(field.label)}</span>
          <input id="${fieldId}" data-field-key="${escapeHtml(field.key)}" class="workspace-properties-input" type="text" value="${escapeHtml(strValue)}">
        </label>`;
  }
}

/**
 * Get card template from the workspace template cache.
 */
function getCardTemplateFromCache(templateId?: string): CardTemplateListItem | null {
  if (!templateId) return null;
  const cache = getWorkspaceTemplateCache();
  return cache[templateId] ?? null;
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

/**
 * Collect field values from the schema-driven form.
 * Only returns values for fields defined in the template schema.
 */
export function collectCardFieldValues(): Record<string, unknown> {
  const container = document.getElementById('workspacePropertiesContent');
  if (!container) return {};

  const fields: Array<{ key: string; type: string; itemSchema?: Record<string, string> }> = (container as any).__cardFields ?? [];
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const fieldId = `card-field-${field.key}`;
    const el = document.getElementById(fieldId);
    if (!el) continue;

    if (field.type === 'boolean') {
      values[field.key] = (el as HTMLInputElement).checked;
    } else if (field.type === 'number') {
      const num = parseFloat((el as HTMLInputElement).value);
      values[field.key] = isNaN(num) ? 0 : num;
    } else if (field.type === 'list') {
      // Collect list items from the editor
      const listEditor = el;
      const rows = listEditor.querySelectorAll('.card-list-item-row');
      const items: Array<Record<string, string>> = [];
      rows.forEach((row) => {
        const cells = row.querySelectorAll('.card-list-item-cell');
        if (field.itemSchema && Object.keys(field.itemSchema).length > 0) {
          const item: Record<string, string> = {};
          cells.forEach((cell) => {
            const key = (cell as HTMLElement).dataset.listKey ?? '';
            item[key] = (cell as HTMLInputElement).value;
          });
          items.push(item);
        } else {
          items.push({ value: cells[0] ? (cells[0] as HTMLInputElement).value : '' });
        }
      });
      values[field.key] = items;
    } else {
      values[field.key] = (el as HTMLInputElement).value;
    }
  }

  return values;
}
