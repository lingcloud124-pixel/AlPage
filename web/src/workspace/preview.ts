import type { WorkspaceConfig } from '../types';
import type { CardTemplateListItem } from '../api/card-templates';
import { renderWorkspaceCardShell } from './card-renderer';

const DEFAULT_PREVIEW_WORKSPACE_SETTINGS = {
  columns: 4,
  rowHeight: 24,
  gapX: 16,
  gapY: 16,
  paddingX: 20,
  paddingY: 16,
};

function suppressStaticPortalChrome(target: HTMLElement): void {
  const quickLinksBar = target.querySelector('.quick-links-bar') as HTMLElement | null;
  if (quickLinksBar) {
    quickLinksBar.style.display = 'none';
  }

  const sidebar = target.querySelector('.desktop-sidebar') as HTMLElement | null;
  if (sidebar) {
    sidebar.style.display = 'none';
  }

  const body = target.querySelector('.desktop-body') as HTMLElement | null;
  body?.classList.add('workspace-driven-preview');
}

export function renderWorkspacePreview(target: HTMLElement | null, workspace: WorkspaceConfig | null, templateCache: Record<string, CardTemplateListItem> = {}): void {
  if (!target) return;
  const host = target.querySelector('.desktop-grid') as HTMLElement | null
    ?? target.querySelector('.portal-workspace-preview-host') as HTMLElement | null
    ?? target.querySelector('.desktop-main-content') as HTMLElement | null
    ?? target.querySelector('main') as HTMLElement | null
    ?? target;

  suppressStaticPortalChrome(target);
  host.classList.add('portal-workspace-preview-host');

  if (!workspace || !Array.isArray(workspace.items) || workspace.items.length === 0) {
    host.innerHTML = '<div class="workspace-preview-empty">描述客户需求后，AI 将生成门户工作区内容。也可以打开设计模式手动添加卡片。</div>';
    return;
  }

  const settings = {
    ...DEFAULT_PREVIEW_WORKSPACE_SETTINGS,
    ...(workspace.settings ?? {}),
  };

  host.style.setProperty('--workspace-columns', String(settings.columns || 4));
  host.style.setProperty('--workspace-row-height', `${settings.rowHeight || 24}px`);
  host.style.setProperty('--workspace-gap-x', `${settings.gapX || 16}px`);
  host.style.setProperty('--workspace-gap-y', `${settings.gapY || 16}px`);
  host.style.setProperty('--workspace-padding-x', `${settings.paddingX || 20}px`);
  host.style.setProperty('--workspace-padding-y', `${settings.paddingY || 16}px`);

  const maxWidth = Number(settings.maxWidth || 0);
  if (maxWidth > 0) {
    host.style.maxWidth = `${maxWidth}px`;
    host.style.marginLeft = 'auto';
    host.style.marginRight = 'auto';
  }

  host.innerHTML = workspace.items.map((item) => {
    const style = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    return renderWorkspaceCardShell({ item, context: { mode: 'preview', templateCache }, style });
  }).join('');
}
