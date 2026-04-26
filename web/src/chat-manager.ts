import { marked } from 'marked';
import {
  chatCompletion,
  loadSettings,
  parseToolCallsFromContent,
} from './agent/chat-client';
import { authHeaders } from './auth';
import { enrichToolCallsWithColorHints } from './agent/tool-call-utils';
import { getSystemPrompt } from './agent/system-prompt';
import { loadUserPreferences, extractPreferencesFromMessage, saveUserPreferences, trackPresetUsage } from './agent/user-preferences';
import { analyzeImageAsync, executeTool } from './tools/executor';
import type { ChatMessage } from './types';
import { deriveNameEnFromText, normalizeNameEn } from './project-naming';
import { getCurrentProjectId, loadProject, saveProject, updateProjectNameDisplay, PRESET_DISPLAY, getAvailablePresets, activateProject } from './project-manager';
import type { Project } from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, saveCurrentColorsToProject, getCurrentColors, applyPresetBackground, getThemeTarget } from './theme-engine';
import { PRESET_BACKGROUNDS } from './project-manager';
import { syncColorEditorFromTheme } from './components/color-editor';
import { parseThemeFeedback } from './tools/theme-feedback-refiner';
import { decidePreferenceUpdate } from './tools/theme-preference-updater';
import { updateProjectVisualContext, loadProjectVisualContext } from './tools/project-visual-context-store';
import { updateCustomerVisualProfile, loadCustomerVisualProfile } from './tools/customer-visual-profile-store';
import type { ThemePreview } from './tools/executor';
import { classifyImageIntent } from './image-intent';
import { applyPrimaryImageToProject } from './primary-image-flow';

const conversationHistory: ChatMessage[] = [];
let activeAbortController: AbortController | null = null;

export interface ThemeAgentDebugState {
  toolCallPrompt?: string;
  feedbackRegenerated?: boolean;
  finalPrompt?: string;
  preferredHueHint?: string;
  directions?: Array<{ label: string; prompt: string }>;
}

let latestThemeAgentDebugState: ThemeAgentDebugState | null = null;
let latestThemePreviews: Array<{ url: string; style: string; prompt: string }> | null = null;

export function getConversationHistory() { return conversationHistory; }
export function getActiveAbortController() { return activeAbortController; }
export function getLatestThemeAgentDebugState() { return latestThemeAgentDebugState; }

function getConversationMessagesContainer(): HTMLElement | null {
  return document.getElementById('messagesContainer') as HTMLElement | null;
}

function setChatViewMode(mode: 'default' | 'conversation'): void {
  const defaultView = document.getElementById('chatDefaultView');
  const conversationView = document.getElementById('chatConversationView');
  if (!defaultView || !conversationView) return;
  defaultView.classList.toggle('is-hidden', mode !== 'default');
  conversationView.classList.toggle('is-hidden', mode !== 'conversation');
}

export function showDefaultChatView(): void {
  setChatViewMode('default');
}

export function showConversationChatView(): void {
  setChatViewMode('conversation');
}

export function renderMessage(role: 'user' | 'ai', content: string): HTMLElement {
  const messagesContainer = getConversationMessagesContainer();
  if (!messagesContainer) return document.createElement('div');

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  if (role === 'user') {
    avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>';
  } else {
    avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  if (content) {
    if (role === 'ai') {
      contentDiv.innerHTML = marked.parse(content) as string;
    } else {
      contentDiv.textContent = content;
    }
  }

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageDiv;
}

export async function saveChatHistory(): Promise<void> {
  const pid = getCurrentProjectId();
  if (!pid) return;
  const messages = conversationHistory.map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
  try {
    await fetch(`/api/theme/projects/${pid}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
}

export async function loadChatHistory(): Promise<Array<{ role: string; content: string; timestamp: number }>> {
  const pid = getCurrentProjectId();
  if (!pid) return [];
  try {
    const res = await fetch(`/api/theme/projects/${pid}/messages`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      // Handle 401 Unauthorized
      if (res.status === 401) {
        window.location.href = '/login.html';
      }
      return [];
    }
    const messages = await res.json();
    return messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  } catch (error) {
    console.warn('[chat-manager] 聊天历史读取失败:', error);
    return [];
  }
}

export async function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): Promise<void> {
  if (!messagesContainer) return;
  conversationHistory.length = 0;
  const history = await loadChatHistory();
  if (history.length === 0) {
    showDefaultChatView();
    messagesContainer.innerHTML = '';
    return;
  }
  showConversationChatView();
  messagesContainer.innerHTML = '';
  history.forEach(msg => {
    const savedMsg: ChatMessage = {
      id: Date.now().toString(),
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    };
    conversationHistory.push(savedMsg);
    renderMessage(msg.role as 'user' | 'ai', msg.content);
  });
}

function ensureProjectNameEn(project: Project, sourceText: string): boolean {
  const derived = deriveNameEnFromText(sourceText);
  if (!derived || derived === 'project') return false;

  const normalizedStored = normalizeNameEn(project.nameEn);
  if (normalizedStored === derived) return false;
  if (normalizedStored && normalizedStored !== 'project') return false;

  project.nameEn = derived;
  return true;
}

function stripToolCallsFromDisplay(content: string): string {
  let cleaned = content;
  // Strip <thinkblocking> tags from MiniMax-M2.7 reasoning output
  cleaned = cleaned.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '');
  cleaned = cleaned.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '');
  cleaned = cleaned.replace(/\{"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function parsePresetRecommendations(content: string): string[] {
  const keys: string[] = [];
  const regex = /\[preset:(\w[\w-]*)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) keys.push(match[1]);
  return keys;
}

function parseBackgroundRecommendations(content: string): string[] {
  const keys: string[] = [];
  const regex = /\[background:(\w[\w-]*)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) keys.push(match[1]);
  return keys;
}

function parseGuideOptions(content: string): string[] {
  const regex = /\[guide:(.+?)\]/;
  const match = regex.exec(content);
  if (!match) return [];
  return match[1].split('|').map(s => s.trim()).filter(Boolean);
}

function addPresetCardsMessage(cards: Array<{key: string; label: string; primary: string; type: string}>, addMessage: (role: 'user' | 'ai', content: string) => HTMLElement, expandPreview: () => void): HTMLElement {
  const messagesContainer = getConversationMessagesContainer();
  if (!messagesContainer) return document.createElement('div');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message';
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = '为您推荐以下主题方案，点击即可应用：';
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'preset-cards-container';

  cards.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card-chat';
    card.innerHTML = `
      <div class="preset-card-swatch" style="background: ${preset.primary};"></div>
      <div class="preset-card-info">
        <span class="preset-card-label">${preset.label}</span>
        <span class="preset-card-type">${preset.type === 'dark-ui' ? '暗色' : '亮色'}</span>
      </div>
      <button class="preset-card-view-btn" title="查看预览">查看</button>
    `;
    const viewBtn = card.querySelector('.preset-card-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => { e.stopPropagation(); expandPreview(); });
    }
    card.addEventListener('click', async () => {
      try {
        const response = await fetch(`/colors/${preset.key}.json`);
        if (response.ok) {
          const presetColors = await response.json();
          const mappedColors: Record<string, string> = {};
          if (presetColors.colors) {
            const c = presetColors.colors;
            if (c.primary) mappedColors['primary-color'] = c.primary;
            if (c.primaryHover) mappedColors['primary-color-hover'] = c.primaryHover;
            if (c.alterColor) mappedColors['alter-color'] = c.alterColor;
            if (c.alterColorHoverOn) mappedColors['alter-color-hover-on'] = c.alterColorHoverOn;
            if (c.primaryOpacity10) mappedColors['primary-color-opacity-10'] = c.primaryOpacity10;
            if (c.primaryOpacity20) mappedColors['primary-color-opacity-20'] = c.primaryOpacity20;
            if (c.primaryOpacity30) mappedColors['primary-color-opacity-30'] = c.primaryOpacity30;
            if (c.headerFont) mappedColors['header-font-color'] = c.headerFont;
            if (c.sidebarPanelBg) mappedColors['sidebar-panel-bg'] = c.sidebarPanelBg;
            if (c.loginBg) mappedColors['login-bg-color'] = c.loginBg;
          }
          for (const [k, v] of Object.entries(mappedColors)) setThemeVar(`--${k}`, v);
          const pid = getCurrentProjectId();
          if (pid) {
            const project = await loadProject(pid);
            if (project) {
              project.colors = { ...project.colors, ...mappedColors };
              project.templateType = preset.type === 'dark-ui' ? 'dark-ui' : 'light-ui';
              await saveProject(project);
              applyTemplateSpecificThemeVars(project.templateType);
            }
          }
          syncColorEditorFromTheme();
          trackPresetUsage(preset.key);
          applyPresetBackground(preset.key, PRESET_BACKGROUNDS);
          expandPreview();
          cardsContainer.querySelectorAll('.preset-card-chat').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          addMessage('ai', `✅ 已应用「${preset.label}」配色方案`);
          requestAnimationFrame(() => (window as any).resizePreview?.());
        }
      } catch {
        addMessage('ai', `⚠️ 加载「${preset.label}」失败，请重试`);
      }
    });
    cardsContainer.appendChild(card);
  });

  contentDiv.appendChild(cardsContainer);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageDiv;
}

function addBackgroundCardsMessage(bgKeys: string[], addMessage: (role: 'user' | 'ai', content: string) => HTMLElement, expandPreview: () => void): HTMLElement {
  const messagesContainer = getConversationMessagesContainer();
  if (!messagesContainer) return document.createElement('div');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message';
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = '为您推荐以下背景图，点击即可应用：';
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'background-cards-container';

  bgKeys.forEach(bgKey => {
    const card = document.createElement('div');
    card.className = 'background-card-chat';
    const ext = (bgKey === 'winter-solstice' || bgKey === 'work-hard') ? 'jpg' : 'png';
    const imgSrc = `/backgrounds/${bgKey}-bg.${ext}`;
    card.innerHTML = `
      <img class="background-card-img" src="${imgSrc}" alt="${bgKey}" loading="lazy" />
      <div class="background-card-info">
        <span class="background-card-name">${bgKey.replace(/-/g, ' ')}</span>
        <button class="preset-card-view-btn" title="查看预览">查看</button>
      </div>
    `;
    const viewBtn = card.querySelector('.preset-card-view-btn');
    if (viewBtn) viewBtn.addEventListener('click', (e) => { e.stopPropagation(); expandPreview(); });
    card.addEventListener('click', () => {
      const bgUrl = `/backgrounds/${bgKey}-bg.${ext}`;
      applyThemeImageAssignments('login', bgUrl);
      applyThemeImageAssignments('desktop', bgUrl);
      expandPreview();
      cardsContainer.querySelectorAll('.background-card-chat').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      addMessage('ai', '✅ 已应用背景图');
    });
    cardsContainer.appendChild(card);
  });

  contentDiv.appendChild(cardsContainer);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageDiv;
}

function addGuideCardsMessage(options: string[], sendUserMessage: () => void): HTMLElement {
  const messagesContainer = getConversationMessagesContainer();
  if (!messagesContainer) return document.createElement('div');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message';
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="9" y1="19" x2="9" y2="19"/><line x1="15" y1="19" x2="15" y2="19"/></svg>';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = '请选择您想要的主题风格方向：';
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'guide-cards-container';

  options.forEach(option => {
    const card = document.createElement('div');
    card.className = 'guide-card-chat';
    card.textContent = option;
    card.addEventListener('click', () => {
      const input = document.getElementById('conversationMessageInput') as HTMLTextAreaElement;
      if (input) { input.value = `我想做一个${option}`; sendUserMessage(); }
    });
    cardsContainer.appendChild(card);
  });

  contentDiv.appendChild(cardsContainer);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageDiv;
}

function buildThinkingToggle(text: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'thinking-toggle';
  const btn = document.createElement('button');
  btn.className = 'thinking-toggle-btn';
  btn.textContent = '▶ 思考过程';
  const body = document.createElement('div');
  body.className = 'thinking-toggle-body';
  body.textContent = text;
  body.style.display = 'none';
  btn.addEventListener('click', () => {
    const expanded = body.style.display !== 'none';
    body.style.display = expanded ? 'none' : 'block';
    btn.textContent = expanded ? '▶ 思考过程' : '▼ 思考过程';
  });
  wrapper.appendChild(btn);
  wrapper.appendChild(body);
  return wrapper;
}

export interface ChatDeps {
  expandPreview: () => void;
  populateSidebarProjects: () => void;
  syncLayout: (hasPreview: boolean, activeTabId: 'loginTab' | 'mainPageTab') => void;
  collapseProjectSidebar: () => void;
  setChatPanelWidth: (width: number | null) => void;
}

export function setupChatInterface(deps: ChatDeps) {
  (globalThis as any).__selectThemePreview = (index: number) => {
    if (!latestThemePreviews || index < 0 || index >= latestThemePreviews.length) return;
    const selected = latestThemePreviews[index];
    const styleLabels: Record<string, string> = { photography: 'A', '3D-render': 'B', watercolor: 'C', abstract: 'C', illustration: 'B' };
    const label = styleLabels[selected.style] ?? `${index + 1}`;
    const input = document.getElementById('conversationMessageInput') as HTMLTextAreaElement | null
      ?? document.getElementById('messageInput') as HTMLTextAreaElement | null;
    if (input) {
      input.value = `我选择第${label}张图`;
      input.dispatchEvent(new Event('input'));
      setTimeout(() => {
        const sendBtn = document.getElementById('conversationSendBtn') as HTMLButtonElement | null
          ?? document.getElementById('sendBtn') as HTMLButtonElement | null;
        sendBtn?.click();
      }, 50);
    }
  };
  const defaultMessageInput = document.getElementById('messageInput') as HTMLTextAreaElement | null;
  const conversationMessageInput = document.getElementById('conversationMessageInput') as HTMLTextAreaElement | null;
  const defaultSendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
  const conversationSendBtn = document.getElementById('conversationSendBtn') as HTMLButtonElement | null;
  const messagesContainer = getConversationMessagesContainer();
  const defaultComposerInner = defaultMessageInput?.closest('.chat-shell-composer-inner') as HTMLElement | null;
  const conversationComposerInner = conversationMessageInput?.closest('.chat-shell-composer-inner') as HTMLElement | null;

  if (!defaultMessageInput || !conversationMessageInput || !defaultSendBtn || !conversationSendBtn || !messagesContainer) {
    console.error('Chat elements not found');
    return;
  }

  defaultSendBtn.addEventListener('click', () => sendUserMessage('default'));
  conversationSendBtn.addEventListener('click', () => sendUserMessage('conversation'));
  const resizeMessageInput = (input: HTMLTextAreaElement, composerInner: HTMLElement | null) => {
    input.style.height = '40px';
    const nextHeight = Math.min(input.scrollHeight, 72);
    const resolvedHeight = Math.max(40, nextHeight);
    input.style.height = `${resolvedHeight}px`;
    if (composerInner) composerInner.style.minHeight = `${resolvedHeight + 56}px`;
  };
  resizeMessageInput(defaultMessageInput, defaultComposerInner);
  resizeMessageInput(conversationMessageInput, conversationComposerInner);
  defaultMessageInput.addEventListener('input', () => resizeMessageInput(defaultMessageInput, defaultComposerInner));
  conversationMessageInput.addEventListener('input', () => resizeMessageInput(conversationMessageInput, conversationComposerInner));
  defaultMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage('default'); }
  });
  conversationMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage('conversation'); }
  });

  const pendingImages: string[] = [];
  const defaultImagePreviewBar = document.getElementById('imagePreviewBar') as HTMLElement | null;
  const conversationImagePreviewBar = document.getElementById('conversationImagePreviewBar') as HTMLElement | null;

  const openImagePicker = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const files = input.files;
        if (!files) return;
        const file = files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) return;
          pendingImages.splice(0, pendingImages.length, dataUrl);
          renderImagePreviewBar();
        };
        reader.readAsDataURL(file);
      };
      input.click();
  };

  document.getElementById('plusBtn')?.addEventListener('click', openImagePicker);
  document.getElementById('conversationPlusBtn')?.addEventListener('click', openImagePicker);

  function renderImagePreviewBar() {
    const previewBars = [defaultImagePreviewBar, conversationImagePreviewBar].filter(Boolean) as HTMLElement[];
    if (previewBars.length === 0) return;
    previewBars.forEach((bar) => { bar.innerHTML = ''; });
    if (pendingImages.length === 0) {
      previewBars.forEach((bar) => bar.classList.remove('has-images'));
      return;
    }
    previewBars.forEach((bar) => bar.classList.add('has-images'));
    pendingImages.forEach((src, idx) => {
      previewBars.forEach((bar) => {
        const thumb = document.createElement('div');
        thumb.className = 'preview-thumb';
        const img = document.createElement('img');
        img.src = src;
        thumb.appendChild(img);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => { pendingImages.splice(idx, 1); renderImagePreviewBar(); });
        thumb.appendChild(removeBtn);
        bar.appendChild(thumb);
      });
    });
  }

  function addMessageToChat(role: 'user' | 'ai', content: string): HTMLElement {
    const messageEl = renderMessage(role, content);
    return messageEl;
  }

  function addStatusMessage(content: string): HTMLElement {
    const msgEl = addMessageToChat('ai', '');
    const contentEl = msgEl.querySelector('.message-content') as HTMLElement | null;
    if (contentEl) {
      contentEl.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${content}</span>`;
    }
    return msgEl;
  }

  async function persistProjectVisualContext(projectId: string): Promise<void> {
    const project = await loadProject(projectId);
    if (!project) return;
    project.visualContext = loadProjectVisualContext(projectId);
    await saveProject(project);
  }

  function appendImageRoleBadge(contentEl: HTMLElement | null, label: string) {
    if (!contentEl) return;
    const badge = document.createElement('div');
    badge.textContent = label;
    badge.style.cssText = 'margin-top:6px;font-size:12px;color:var(--auxiliary-gray);';
    contentEl.appendChild(badge);
  }

  async function sendUserMessage(source: 'default' | 'conversation' = 'conversation') {
    if (activeAbortController) return;
    const activeInput = source === 'default' ? defaultMessageInput : conversationMessageInput;
    const fallbackInput = source === 'default' ? conversationMessageInput : defaultMessageInput;
    const hasText = activeInput && activeInput.value.trim() !== '';
    const hasImages = pendingImages.length > 0;
    if (!hasText && !hasImages) return;
    const content = activeInput ? activeInput.value.trim() : '';

    showConversationChatView();
    (globalThis as any).__themeStudioCurrentProjectId = getCurrentProjectId() ?? undefined;

    const userMessageTimestamp = Date.now();
    const userMessageId = userMessageTimestamp.toString();
    const currentProjectId = getCurrentProjectId();
    const currentProject = currentProjectId ? await loadProject(currentProjectId) : null;
    const visualContext = currentProject?.visualContext ?? (currentProjectId ? loadProjectVisualContext(currentProjectId) : null);

    if (hasImages) {
      const imagesToSend = [...pendingImages];
      pendingImages.length = 0;
      renderImagePreviewBar();
      const imageIntent = classifyImageIntent(content || '');
      const finalRole = content ? imageIntent.role : 'reference';
      const userLabel = finalRole === 'primary' ? '上传了主图' : '上传了参考图片';
      const msgEl = addMessageToChat('user', content || userLabel);
      conversationHistory.push({
        id: userMessageId,
        role: 'user',
        content: content || userLabel,
        timestamp: userMessageTimestamp,
      });
      const contentEl = msgEl.querySelector('.message-content') as HTMLElement;
      if (contentEl) {
        imagesToSend.forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.style.cssText = 'max-width:200px;border-radius:8px;margin-top:4px;display:block;';
          contentEl.appendChild(img);
        });
        appendImageRoleBadge(
          contentEl,
          finalRole === 'primary'
            ? '已识别为主图，将直接用于生成主题预览'
            : '已识别为参考图，将作为风格参考',
        );
      }
      await saveChatHistory();

      if (finalRole === 'primary' && currentProjectId) {
        const statusEl = addStatusMessage('正在根据主图提取主题色并生成预览...');
        const imageDataUrl = imagesToSend[0];
        updateProjectVisualContext(currentProjectId, {
          imageInput: {
            dataUrl: imageDataUrl,
            role: finalRole,
            sourceText: content,
            explicitReason: imageIntent.reason,
            updatedAt: Date.now(),
          },
        });
        const primaryResult = await applyPrimaryImageToProject({
          projectId: currentProjectId,
          imageDataUrl,
          message: content || imageIntent.matchedPhrase || '',
        });
        statusEl.remove();
        if (primaryResult.success) {
          addMessageToChat('ai', [
            primaryResult.message,
            primaryResult.primaryColor ? `主色已提取为 ${primaryResult.primaryColor}。` : '',
            primaryResult.enforcedReason ?? '',
          ].filter(Boolean).join(' '));
          deps.expandPreview();
          deps.collapseProjectSidebar();
          deps.setChatPanelWidth(372);
        } else {
          addMessageToChat('ai', `⚠️ ${primaryResult.message}`);
        }
      } else {
        const imageDataUrl = imagesToSend[0];
        if (currentProjectId) {
          updateProjectVisualContext(currentProjectId, {
            imageInput: {
              dataUrl: imageDataUrl,
              role: finalRole,
              sourceText: content,
              explicitReason: imageIntent.reason,
              updatedAt: Date.now(),
            },
          });
        }
        try {
          const result = await analyzeImageAsync(imageDataUrl);
          if (result.success && result.data) {
            const colors = result.data as { dominantColors: string[] };
            conversationHistory.push({
              id: Date.now().toString(),
              role: 'user',
              content: `[图片参考] 主色调: ${colors.dominantColors.join(', ')}`,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.warn('[chat-manager] 图片参考分析失败，已跳过颜色参考注入:', {
            message: (error as Error).message,
          });
        }
      }
    } else {
      addMessageToChat('user', content);
      conversationHistory.push({
        id: userMessageId,
        role: 'user',
        content,
        timestamp: userMessageTimestamp,
      });
      await saveChatHistory();
    }

    if (activeInput) {
      activeInput.value = '';
      resizeMessageInput(activeInput, source === 'default' ? defaultComposerInner : conversationComposerInner);
    }
    if (fallbackInput && content) {
      fallbackInput.value = '';
      resizeMessageInput(fallbackInput, source === 'default' ? conversationComposerInner : defaultComposerInner);
    }
    const latestVisualContext = currentProjectId ? loadProjectVisualContext(currentProjectId) : undefined;
    const currentImageRole = latestVisualContext?.imageInput?.role;
    const shouldSkipAiForPrimaryImage = hasImages && currentImageRole === 'primary';
    const shouldUpgradeExistingReference = !hasImages
      && Boolean(content)
      && currentProjectId
      && latestVisualContext?.imageInput?.dataUrl
      && currentImageRole === 'reference'
      && classifyImageIntent(content).role === 'primary';

    if (shouldUpgradeExistingReference && currentProjectId && latestVisualContext?.imageInput?.dataUrl) {
      const statusEl = addStatusMessage('正在将当前参考图升级为主图并生成预览...');
      updateProjectVisualContext(currentProjectId, {
        imageInput: {
          dataUrl: latestVisualContext.imageInput.dataUrl,
          role: 'primary',
          sourceText: content,
          explicitReason: 'upgrade-from-reference',
          updatedAt: Date.now(),
        },
      });
      const primaryResult = await applyPrimaryImageToProject({
        projectId: currentProjectId,
        imageDataUrl: latestVisualContext.imageInput.dataUrl,
        message: content,
      });
      statusEl.remove();
      addMessageToChat('ai', primaryResult.success
        ? [
            '已将当前参考图升级为主图并生成主题预览。',
            primaryResult.primaryColor ? `主色已提取为 ${primaryResult.primaryColor}。` : '',
            primaryResult.enforcedReason ?? '',
          ].filter(Boolean).join(' ')
        : `⚠️ ${primaryResult.message}`);
      if (primaryResult.success) {
        deps.expandPreview();
        deps.collapseProjectSidebar();
        deps.setChatPanelWidth(372);
      }
    }

    if (content && !shouldSkipAiForPrimaryImage && !shouldUpgradeExistingReference) await callAI(content);
    if (!content && hasImages && currentImageRole !== 'primary') {
      addMessageToChat('ai', '已收到这张参考图。继续输入一句描述，比如“参考这张图做一个春日主题”，我就会开始生成。');
      await saveChatHistory();
    }

    if (content && getCurrentProjectId()) {
      const projectId = getCurrentProjectId()!;
      const activatedProject = await activateProject(projectId);
      const project = activatedProject ?? await loadProject(projectId);
      if (project) {
        let changed = activatedProject !== null;

        if (project.name === '未命名项目') {
          const autoName = content.length > 20 ? content.substring(0, 20) + '...' : content;
          project.name = autoName;
          const chatProjectName = document.getElementById('chatProjectName');
          if (chatProjectName) chatProjectName.textContent = autoName;
          const projectNameEl = document.getElementById('projectName');
          if (projectNameEl) projectNameEl.textContent = autoName;
          changed = true;
        }

        changed = ensureProjectNameEn(project, `${project.themeName || ''} ${content}`) || changed;

        if (changed) {
          await saveProject(project);
          await deps.populateSidebarProjects();
        }
      }
    }
  }

  const landingPromptButtons = document.querySelectorAll<HTMLElement>('.landing-prompt-trigger[data-prompt]');
  landingPromptButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const prompt = button.dataset.prompt?.trim();
      if (!prompt || !defaultMessageInput) return;
      defaultMessageInput.value = prompt;
      resizeMessageInput(defaultMessageInput, defaultComposerInner);
      sendUserMessage('default');
    });
  });

  async function callAI(userMessage: string) {
    const priorAssistantMessage = [...conversationHistory]
      .reverse()
      .find((message) => message.role === 'assistant')?.content ?? '';
    const priorUserMessage = [...conversationHistory]
      .reverse()
      .find((message) => message.role === 'user' && message.content.trim() !== userMessage.trim())?.content ?? '';

    const settings = loadSettings();
    // API key check removed - server holds the key now

    const availablePresets = getAvailablePresets();
    const prefs = loadUserPreferences();
    const currentProject = getCurrentProjectId() ? await loadProject(getCurrentProjectId()!) : null;
    const templateType = currentProject?.templateType || 'light-ui';
    const systemPrompt = getSystemPrompt({
      templateType,
      currentColors: getCurrentColors(),
      availablePresets,
      userPreferences: prefs,
      userMessage,
    });

    const extracted = extractPreferencesFromMessage(userMessage);
    if (extracted) saveUserPreferences(extracted);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
    ];

    const aiMessageEl = addMessageToChat('ai', '');
    await saveChatHistory();
    const contentEl = aiMessageEl.querySelector('.message-content') as HTMLElement;
    let fullResponse = '';

    if (contentEl) {
      contentEl.classList.add('typing');
      contentEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    }

    const setSendBtnStop = (isStop: boolean) => {
      if (!conversationSendBtn) return;
      if (isStop) { conversationSendBtn.classList.add('stop-mode'); conversationSendBtn.title = '停止生成'; }
      else { conversationSendBtn.classList.remove('stop-mode'); conversationSendBtn.title = '发送'; }
    };

    activeAbortController = new AbortController();
    setSendBtnStop(true);

    const stopHandler = () => { activeAbortController?.abort(); setSendBtnStop(false); };
    conversationSendBtn?.addEventListener('click', stopHandler);

    let thinkingText = '';
    let displayBuffer = '';
    let insideThinkTag = false;

    try {
      let firstToken = true;
      fullResponse = await chatCompletion(
        { messages, temperature: 0.7 },
        (token) => {
          if (contentEl) {
            if (firstToken) {
              contentEl.classList.remove('typing');
              contentEl.classList.add('streaming');
              contentEl.innerHTML = '<span class="thinking-indicator">🤔 思考中...</span>';
              firstToken = false;
            }
            if (token) {
              if (token.startsWith('\u200B')) {
                thinkingText += token.slice(1);
                const indicator = contentEl.querySelector('.thinking-indicator');
                if (indicator) indicator.remove();
                const thinkEl = contentEl.querySelector('.thinking-content') as HTMLElement ?? (() => {
                  const el = document.createElement('span');
                  el.className = 'thinking-content';
                  contentEl.appendChild(el);
                  return el;
                })();
                if (!thinkEl.parentElement) contentEl.appendChild(thinkEl);
                thinkEl.textContent += token.slice(1);
              } else {
                displayBuffer += token;
                let displayText = '';
                while (displayBuffer.includes('<thinkblocking>') || displayBuffer.includes('</thinkblocking>')) {
                  if (!insideThinkTag && displayBuffer.includes('<thinkblocking>')) {
                    const idx = displayBuffer.indexOf('<thinkblocking>');
                    displayText += displayBuffer.slice(0, idx);
                    displayBuffer = displayBuffer.slice(idx + '<thinkblocking>'.length);
                    insideThinkTag = true;
                  }
                  if (insideThinkTag && displayBuffer.includes('</thinkblocking>')) {
                    const idx = displayBuffer.indexOf('</thinkblocking>');
                    displayBuffer = displayBuffer.slice(idx + '</thinkblocking>'.length);
                    insideThinkTag = false;
                  } else {
                    displayBuffer = '';
                    break;
                  }
                }
                if (!insideThinkTag && displayBuffer) {
                  displayText += displayBuffer;
                  displayBuffer = '';
                }
                if (displayText) {
                  const indicator = contentEl.querySelector('.thinking-indicator');
                  if (indicator) indicator.remove();
                  const thinkEl = contentEl.querySelector('.thinking-content');
                  if (thinkEl) thinkEl.remove();
                  contentEl.textContent += displayText;
                }
              }
            }
            messagesContainer?.scrollTo(0, messagesContainer.scrollHeight);
          }
        },
        activeAbortController.signal,
      );
    } catch (e) {
      conversationSendBtn?.removeEventListener('click', stopHandler);
      activeAbortController = null;
      setSendBtnStop(false);
      if (contentEl) {
        contentEl.classList.remove('typing', 'streaming');
        if ((e as Error).name === 'AbortError' || (e as Error).message?.includes('aborted')) {
          const partial = contentEl.textContent || '';
          contentEl.innerHTML = '';
          if (thinkingText) contentEl.appendChild(buildThinkingToggle(thinkingText));
          if (partial) {
            const span = document.createElement('span');
            span.textContent = partial;
            contentEl.appendChild(span);
          }
          contentEl.appendChild(Object.assign(document.createElement('div'), {
            textContent: '⏹ 生成已停止',
            style: 'color:var(--auxiliary-gray);font-size:12px;margin-top:6px;',
          }));
        } else {
          contentEl.textContent = `❌ 请求失败: ${(e as Error).message}`;
        }
      }
      return;
    }

    conversationSendBtn?.removeEventListener('click', stopHandler);

    if (contentEl) {
      contentEl.classList.remove('streaming');
      const cleaned = stripToolCallsFromDisplay(fullResponse);
      contentEl.innerHTML = '';
      if (thinkingText) contentEl.appendChild(buildThinkingToggle(thinkingText));
      const mdSpan = document.createElement('span');
      mdSpan.innerHTML = marked.parse(cleaned || '') as string;
      contentEl.appendChild(mdSpan);
    }

    conversationHistory.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    });
    await saveChatHistory();

    const cleanedResponse = fullResponse.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '');
    console.log('[DEBUG] cleanedResponse 长度:', cleanedResponse.length);
    console.log('[DEBUG] cleanedResponse 最后200字:', cleanedResponse.slice(-200));

    const toolCalls = enrichToolCallsWithColorHints(parseToolCallsFromContent(cleanedResponse), {
      userMessage,
      assistantMessage: fullResponse,
      priorAssistantMessage,
      priorUserMessage,
      templateType,
      latestThemeAgentDebugState,
      latestThemePreviews,
    });
    console.log('[DEBUG] 解析到 toolCalls 数量:', toolCalls.length);
    toolCalls.forEach((tc, i) => {
      console.log(`[DEBUG] toolCall[${i}]:`, tc.tool, JSON.stringify(tc.args).slice(0, 200));
    });
    const TOOL_GLOBAL_TIMEOUT = 120_000;
    const toolStartTime = Date.now();

    let loadingMsgEl: HTMLElement | null = null;
    function showToolLoading(text: string) {
      removeToolLoading();
      loadingMsgEl = addMessageToChat('ai', '');
      const c = loadingMsgEl.querySelector('.message-content') as HTMLElement;
      if (c) {
        c.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${text}</span>`;
      }
    }
    function removeToolLoading() {
      if (loadingMsgEl) {
        loadingMsgEl.remove();
        loadingMsgEl = null;
      }
    }

    for (const tc of toolCalls) {
      if (Date.now() - toolStartTime > TOOL_GLOBAL_TIMEOUT) {
        removeToolLoading();
        await addMessageToChat('ai', '⚠️ 工具执行总时长超限，剩余工具已跳过');
        await saveChatHistory();
        break;
      }
      try {
        showToolLoading(tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews'
          ? '主题正在生成中，请稍后'
          : `⚙️ 正在执行 ${tc.tool}...`);

        const result = await executeTool(tc, (event) => {
          if (tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews') {
            if (event.type === 'image_generating') {
              const d = event.data as { current?: number; total?: number; label?: string } | undefined;
              const cur = d?.current ?? 1;
              const tot = d?.total ?? 3;
              const label = d?.label ?? '';
              showToolLoading(`🎨 正在生成预览图 ${cur}/${tot}${label ? ` · ${label}` : ''}，请稍候...`);
            } else if (event.type === 'image_generated') {
              const d = event.data as { current?: number; total?: number } | undefined;
              const cur = d?.current ?? 1;
              const tot = d?.total ?? 3;
              if (cur < tot) {
                showToolLoading(`✅ 第 ${cur} 张完成，正在生成第 ${cur + 1} 张...`);
              } else {
                removeToolLoading();
                addMessageToChat('ai', `🖼️ ${tot} 张预览图全部生成完毕，正在准备展示...`);
                showToolLoading('📋 正在整理预览...');
                void saveChatHistory();
              }
            }
          }
        });
        removeToolLoading();
        if (result.success) {
          if (tc.tool === 'generate_theme_previews') {
            const prevData = result.data as {
              previews?: ThemePreview[];
              themeAgentDebug?: ThemeAgentDebugState;
              intent?: { category?: string };
              preferredHueHint?: string;
            };
            latestThemeAgentDebugState = prevData?.themeAgentDebug ?? null;
            latestThemePreviews = prevData?.previews ?? null;
            const previews = prevData?.previews ?? [];
            if (previews.length > 0) {
              const imageCards = previews.map((p, i) =>
                `<div style="flex:1;min-width:0;text-align:center;">` +
                `<img src="${p.url}" style="width:100%;border-radius:8px;border:2px solid #333;cursor:pointer;" onclick="window.__selectThemePreview(${i})" />` +
                `<div style="margin-top:4px;font-size:13px;color:#ddd;font-weight:600;">${p.directionLabel ?? `图 ${i + 1}`}</div>` +
                (p.directionDescription ? `<div style="margin-top:2px;font-size:11px;color:#888;">${p.directionDescription}</div>` : '') +
                `</div>`
              ).join('');
              const previewHtml = `<div style="display:flex;gap:8px;margin:8px 0;">${imageCards}</div>`;
              await addMessageToChat('ai', `🎨 已生成 ${previews.length} 张预览图，请点击选择或描述您的偏好：${previewHtml}`);
              await saveChatHistory();
            } else {
              await addMessageToChat('ai', '⚠️ 预览图生成失败，请重试。');
            }
          } else if (tc.tool === 'apply_selected_theme') {
            const appliedData = result.data as {
              imageUrl?: string;
              primaryColor?: string;
              fallbackUsed?: boolean;
              preferredHueHint?: string;
              dominantColors?: string[];
              generationReport?: { checks?: Array<{ label: string; passed: boolean }> };
              contrastValidation?: { passed?: boolean; failures?: string[] };
              enforcementReason?: string;
            };
            const colorTag = appliedData?.primaryColor
              ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${appliedData.primaryColor};vertical-align:middle;margin:0 2px;"></span>`
              : '';
            const contrastPassed = appliedData?.contrastValidation?.passed ?? false;
            await addMessageToChat('ai', [
              `🎨 主题已应用！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
              appliedData?.dominantColors?.length ? `识别到的候选主色 ${appliedData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              appliedData?.fallbackUsed ? '本次提色未稳定完成，已回退应用默认主色。' : '',
              appliedData?.enforcementReason ?? '',
              `对比度校验：${contrastPassed ? '通过' : '存在风险'}。`,
            ].filter(Boolean).join(' '));
            await saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            latestThemePreviews = null;
            deps.expandPreview();
            deps.collapseProjectSidebar();
            deps.setChatPanelWidth(372);
            await saveChatHistory();
          } else if (tc.tool === 'save_colors') {
            const saveData = tc.args as { name?: string; nameEn?: string };
            const pid = getCurrentProjectId();
            if (pid && saveData?.name) {
              const proj = await loadProject(pid);
              if (proj) {
                proj.themeName = saveData.name;
                const normalizedNameEn = normalizeNameEn(saveData.nameEn);
                const derivedNameEn = deriveNameEnFromText(`${saveData.name} ${conversationHistory.find((m) => m.role === 'user')?.content || ''}`);
                if (normalizedNameEn || derivedNameEn !== 'project') {
                  proj.nameEn = normalizedNameEn || derivedNameEn;
                }
                await saveProject(proj);
                updateProjectNameDisplay(proj);
              }
            }
            await saveChatHistory();
          } else if (tc.tool === 'update_colors') {
            await saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            deps.expandPreview();
            await saveChatHistory();
          }
        } else {
          await addMessageToChat('ai', `⚠️ ${tc.tool}: ${result.error ?? '未知错误'}`);
          await saveChatHistory();
        }
      } catch (e) {
        removeToolLoading();
        await addMessageToChat('ai', `❌ ${tc.tool} 执行失败：${(e as Error).message}`);
        await saveChatHistory();
      }
    }

    const presetKeys = parsePresetRecommendations(fullResponse);
    if (presetKeys.length > 0) {
      const cards = presetKeys
        .filter(k => PRESET_DISPLAY[k])
        .map(k => ({ key: k, ...PRESET_DISPLAY[k] }));
      if (cards.length > 0) addPresetCardsMessage(cards, addMessageToChat, deps.expandPreview);
    }

    const bgKeys = parseBackgroundRecommendations(fullResponse);
    if (bgKeys.length > 0) addBackgroundCardsMessage(bgKeys, addMessageToChat, deps.expandPreview);

    const guideOptions = parseGuideOptions(fullResponse);
    if (guideOptions.length > 0) addGuideCardsMessage(guideOptions, sendUserMessage);

    activeAbortController = null;
    setSendBtnStop(false);
  }
}
