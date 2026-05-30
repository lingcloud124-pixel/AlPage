import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';
import { renderWorkspaceCardShell } from './card-renderer';

export function renderWorkspacePreview(target: HTMLElement | null, workspace: WorkspaceConfig | null, templateCache: Record<string, CardTemplateListItem> = {}): void {
  if (!target) return;
  const host = target.querySelector('.portal-workspace-preview-host') as HTMLElement | null
    ?? target.querySelector('.desktop-main-content') as HTMLElement | null
    ?? target.querySelector('main') as HTMLElement | null
    ?? target;

  if (!workspace || !Array.isArray(workspace.items) || workspace.items.length === 0) {
    host.innerHTML = '<div class="workspace-preview-empty">暂无工作区卡片，请在工作区设计中添加。</div>';
    return;
  }

  host.classList.add('portal-workspace-preview-host');
  host.style.setProperty('--workspace-columns', String(workspace.settings.columns || 4));
  host.style.setProperty('--workspace-row-height', `${workspace.settings.rowHeight || 24}px`);
  host.style.setProperty('--workspace-gap-x', `${workspace.settings.gapX || 16}px`);
  host.style.setProperty('--workspace-gap-y', `${workspace.settings.gapY || 16}px`);
  host.style.setProperty('--workspace-padding-x', `${workspace.settings.paddingX || 20}px`);
  host.style.setProperty('--workspace-padding-y', `${workspace.settings.paddingY || 20}px`);

  host.innerHTML = workspace.items.map((item) => {
    const style = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    return renderWorkspaceCardShell({ item, context: { mode: 'preview', templateCache }, style });
  }).join('');
}
