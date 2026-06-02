import { listConversations, getConversation, deleteConversation as apiDeleteConversation } from '../api/conversations';
import { deleteSavedPortal, getSavedPortal, listSavedPortals, type SavedPortalSummary } from '../api/saved-portals';
import type { ConversationListItem } from '../types';

const SAVED_PROJECT_VISIBLE_LIMIT = 5;

let activeConversationId: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let savedProjectsExpanded = false;

export function initSidebar(): void {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const newChatBtn = document.getElementById('sidebarNewChatBtn');
  const newChatFullBtn = document.getElementById('sidebarNewChatFullBtn');

  toggleBtn?.addEventListener('click', () => {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    const isExpanded = container.classList.contains('expanded');
    toggleSidebar(!isExpanded);
  });
  newChatBtn?.addEventListener('click', () => dispatchNewConversation());
  newChatFullBtn?.addEventListener('click', () => dispatchNewConversation());
  document.getElementById('sidebarSavedProjectMoreBtn')?.addEventListener('click', () => {
    savedProjectsExpanded = true;
    refreshSidebar();
  });

  refreshSidebar();
}

export function toggleSidebar(expand?: boolean): void {
  const container = document.getElementById('sidebarContainer');
  if (!container) return;
  if (expand === undefined) {
    container.classList.toggle('expanded');
  } else {
    container.classList.toggle('expanded', expand);
  }
}

export function setActiveConversation(id: string | null): void {
  activeConversationId = id;
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-id') === id);
  });
}

export function getActiveConversationId(): string | null {
  return activeConversationId;
}

export async function refreshSidebar(): Promise<void> {
  let savedProjects: SavedPortalSummary[] = [];
  try {
    const [items, portals] = await Promise.all([
      listConversations(),
      listSavedPortals({ limit: 50, offset: 0 }),
    ]);
    savedProjects = portals.items;
    renderSidebarList(items, savedProjects);
  } catch {
    renderSidebarList([], savedProjects);
  }
}

function dispatchNewConversation(): void {
  window.dispatchEvent(new CustomEvent('sidebar:new-conversation'));
}

function renderSidebarList(items: ConversationListItem[], savedProjects: SavedPortalSummary[]): void {
  const savedConversationIds = new Set(
    savedProjects.map(project => project.conversationId).filter((id): id is string => Boolean(id)),
  );
  const sortedSavedProjects = [...savedProjects].sort((a, b) => b.updatedAt - a.updatedAt);
  const visibleSavedProjects = savedProjectsExpanded
    ? sortedSavedProjects
    : sortedSavedProjects.slice(0, SAVED_PROJECT_VISIBLE_LIMIT);
  const historyItems = items.filter(item => !savedConversationIds.has(item.id));

  const savedSection = document.getElementById('sidebarSavedProjectsSection');
  const savedContainer = document.getElementById('sidebarSavedProjectItems');
  const moreBtn = document.getElementById('sidebarSavedProjectMoreBtn') as HTMLButtonElement | null;
  const historySection = document.getElementById('sidebarHistorySection');
  const historyContainer = document.getElementById('sidebarHistoryItems');

  if (savedSection) savedSection.style.display = savedProjects.length ? '' : 'none';
  if (historySection) historySection.style.display = historyItems.length ? '' : 'none';
  if (moreBtn) moreBtn.style.display = savedProjects.length > SAVED_PROJECT_VISIBLE_LIMIT && !savedProjectsExpanded ? '' : 'none';

  if (savedContainer) {
    savedContainer.innerHTML = '';
    visibleSavedProjects.forEach(project => savedContainer.appendChild(createSavedProjectItem(project)));
  }

  if (historyContainer) {
    historyContainer.innerHTML = '';
    if (historyItems.length === 0 && savedProjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sidebar-empty-state';
      empty.textContent = '暂无对话记录';
      historyContainer.appendChild(empty);
    } else {
      historyItems.forEach(item => historyContainer.appendChild(createSidebarItem(item)));
    }
  }
}

function createSidebarItem(item: ConversationListItem): HTMLElement {
  const el = document.createElement('div');
  const isHomepageActive = !activeConversationId && item.title === '新对话';
  el.className = 'sidebar-item' + (item.id === activeConversationId || isHomepageActive ? ' active' : '');
  el.setAttribute('data-id', item.id);

  const title = document.createElement('span');
  title.className = 'sidebar-item-title';
  title.textContent = item.title;

  const menuBtn = document.createElement('button');
  menuBtn.className = 'sidebar-item-menu';
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', '更多操作');
  menuBtn.title = '更多操作';
  menuBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" fill="currentColor"></circle>
      <circle cx="12" cy="12" r="1.75" fill="currentColor"></circle>
      <circle cx="19" cy="12" r="1.75" fill="currentColor"></circle>
    </svg>
  `;
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showItemMenu(el, item);
  });

  el.appendChild(title);
  el.appendChild(menuBtn);

  el.addEventListener('click', () => {
    loadAndRestoreConversation(item.id);
  });

  return el;
}

function createSavedProjectItem(project: SavedPortalSummary): HTMLElement {
  const el = document.createElement('div');
  el.className = 'sidebar-item';
  el.setAttribute('data-id', project.id);

  const title = document.createElement('span');
  title.className = 'sidebar-item-title';
  title.textContent = project.name || '未命名门户';

  const menuBtn = document.createElement('button');
  menuBtn.className = 'sidebar-item-menu';
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', '更多操作');
  menuBtn.title = '更多操作';
  menuBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" fill="currentColor"></circle>
      <circle cx="12" cy="12" r="1.75" fill="currentColor"></circle>
      <circle cx="19" cy="12" r="1.75" fill="currentColor"></circle>
    </svg>
  `;
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showSavedProjectMenu(el, project);
  });

  el.appendChild(title);
  el.appendChild(menuBtn);
  el.addEventListener('click', () => loadAndRestoreSavedProject(project.id));
  return el;
}

async function loadAndRestoreConversation(id: string): Promise<void> {
  try {
    const detail = await getConversation(id);
    if (!detail) return;
    window.dispatchEvent(new CustomEvent('sidebar:restore-conversation', { detail }));
  } catch {
    /* intentionally empty - conversation may have been deleted */
  }
}

function showItemMenu(itemEl: HTMLElement, item: ConversationListItem): void {
  closeAllMenus();
  const dropdown = document.createElement('div');
  dropdown.className = 'sidebar-item-menu-dropdown';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.remove();
    if (window.confirm('确定要删除这条对话记录吗？')) {
      await apiDeleteConversation(item.id);
      if (item.id === activeConversationId) {
        dispatchNewConversation();
      }
      refreshSidebar();
    }
  });

  dropdown.appendChild(deleteBtn);
  positionDropdown(dropdown, itemEl);
}

function showSavedProjectMenu(itemEl: HTMLElement, item: SavedPortalSummary): void {
  closeAllMenus();
  const dropdown = document.createElement('div');
  dropdown.className = 'sidebar-item-menu-dropdown';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.remove();
    if (window.confirm('确定要删除这个保存项目吗？')) {
      await deleteSavedPortal(item.id);
      refreshSidebar();
    }
  });

  dropdown.appendChild(deleteBtn);
  positionDropdown(dropdown, itemEl);
}

function positionDropdown(dropdown: HTMLElement, itemEl: HTMLElement): void {
  const rect = itemEl.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = `${rect.top}px`;
  dropdown.style.left = `${rect.right - 108}px`;
  document.body.appendChild(dropdown);

  const closeHandler = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

async function loadAndRestoreSavedProject(id: string): Promise<void> {
  try {
    const detail = await getSavedPortal(id);
    const snapshot = { ...(detail.projectSnapshot ?? {}) };
    snapshot.savedPortalId = id;
    let conversation: any = null;
    if (detail.conversationId) {
      try {
        conversation = await getConversation(detail.conversationId);
        if (conversation && typeof conversation === 'object') {
          conversation.projectSnapshot = {
            ...(conversation.projectSnapshot ?? {}),
          };
          conversation.projectSnapshot.savedPortalId = id;
        }
      } catch {
        conversation = null;
      }
    }
    if (!conversation && detail.conversationSnapshot && Array.isArray((detail.conversationSnapshot as any).messages)) {
      conversation = {
        id: detail.conversationId || id,
        messages: (detail.conversationSnapshot as any).messages,
        projectSnapshot: {
          ...snapshot,
          savedPortalId: id,
        },
        hasGeneratedTheme: true,
      };
    }
    window.dispatchEvent(new CustomEvent('sidebar:restore-project', {
      detail: {
        ...detail,
        projectSnapshot: snapshot,
        conversation,
      },
    }));
  } catch {
    /* intentionally empty - saved portal may have been deleted */
  }
}

function closeAllMenus(): void {
  document.querySelectorAll('.sidebar-item-menu-dropdown').forEach(el => el.remove());
}
