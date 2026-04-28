import { listConversations, getConversation, toggleStar as apiToggleStar, deleteConversation as apiDeleteConversation } from '../api/conversations';
import type { ConversationListItem } from '../types';

let activeConversationId: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function initSidebar(): void {
  const container = document.getElementById('sidebarContainer');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const newChatBtn = document.getElementById('sidebarNewChatBtn');
  const newChatFullBtn = document.getElementById('sidebarNewChatFullBtn');
  const settingsBtn = document.getElementById('sidebarSettingsBtn');
  const settingsFullBtn = document.getElementById('sidebarSettingsFullBtn');

  toggleBtn?.addEventListener('click', () => toggleSidebar(true));
  collapseBtn?.addEventListener('click', () => toggleSidebar(false));
  newChatBtn?.addEventListener('click', () => dispatchNewConversation());
  newChatFullBtn?.addEventListener('click', () => dispatchNewConversation());
  settingsBtn?.addEventListener('click', () => openSettings());
  settingsFullBtn?.addEventListener('click', () => openSettings());

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
  try {
    const items = await listConversations();
    renderSidebarList(items);
  } catch {
    renderSidebarList([]);
  }
}

function dispatchNewConversation(): void {
  window.dispatchEvent(new CustomEvent('sidebar:new-conversation'));
}

function openSettings(): void {
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.classList.remove('is-hidden');
  }
}

function renderSidebarList(items: ConversationListItem[]): void {
  const starredItems = items.filter(i => i.isStarred);
  const historyItems = items.filter(i => !i.isStarred);

  const starredSection = document.getElementById('sidebarStarredSection');
  const starredContainer = document.getElementById('sidebarStarredItems');
  const historySection = document.getElementById('sidebarHistorySection');
  const historyContainer = document.getElementById('sidebarHistoryItems');

  if (starredSection) starredSection.style.display = starredItems.length ? '' : 'none';
  if (historySection) historySection.style.display = historyItems.length ? '' : 'none';

  if (starredContainer) {
    starredContainer.innerHTML = '';
    starredItems.forEach(item => starredContainer.appendChild(createSidebarItem(item)));
  }

  if (historyContainer) {
    historyContainer.innerHTML = '';
    if (historyItems.length === 0 && starredItems.length === 0) {
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
  el.className = 'sidebar-item' + (item.id === activeConversationId ? ' active' : '');
  el.setAttribute('data-id', item.id);

  const title = document.createElement('span');
  title.className = 'sidebar-item-title';
  title.textContent = item.title;

  const menuBtn = document.createElement('button');
  menuBtn.className = 'sidebar-item-menu';
  menuBtn.textContent = '…';
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

  const starBtn = document.createElement('button');
  starBtn.textContent = item.isStarred ? '取消收藏' : '收藏';
  starBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await apiToggleStar(item.id);
    dropdown.remove();
    refreshSidebar();
  });

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

  dropdown.appendChild(starBtn);
  dropdown.appendChild(deleteBtn);

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

function closeAllMenus(): void {
  document.querySelectorAll('.sidebar-item-menu-dropdown').forEach(el => el.remove());
}
