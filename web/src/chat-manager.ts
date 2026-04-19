import { marked } from 'marked';
import {
  chatCompletion,
  loadSettings,
  parseToolCallsFromContent,
} from './agent/chat-client';
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

const conversationHistory: ChatMessage[] = [];
let activeAbortController: AbortController | null = null;

export interface ThemeAgentDebugState {
  toolCallPrompt?: string;
  feedbackRegenerated?: boolean;
  intent?: import('./tools/theme-intent-parser').ThemeIntent;
  scenePlan?: import('./tools/theme-scene-planner').ThemeScenePlan;
  scenePlans?: import('./tools/theme-scene-planner').ThemeScenePlan[];
  planCheck?: { passed?: boolean; checks?: Array<{ label: string; passed: boolean; reason?: string }> };
  planChecks?: Array<{ passed?: boolean; checks?: Array<{ label: string; passed: boolean; reason?: string }> }>;
  directedPrompt?: string;
  directedPrompts?: string[];
  finalPrompt?: string;
  finalPrompts?: string[];
  preferredHueHint?: string;
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

export function saveChatHistory(): void {
  if (!getCurrentProjectId()) return;
  const key = `theme-studio-chat-${getCurrentProjectId()}`;
  const history = conversationHistory.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
}

export function loadChatHistory(): Array<{ role: string; content: string; timestamp: number }> {
  const pid = getCurrentProjectId();
  if (!pid) return [];
  try {
    const raw = localStorage.getItem(`theme-studio-chat-${pid}`);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ role: string; content: string; timestamp: number }>;
  } catch (error) {
    console.warn('[chat-manager] 聊天历史读取失败，已回退为空记录:', {
      projectId: pid,
      message: (error as Error).message,
    });
    return [];
  }
}

export function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): void {
  if (!messagesContainer) return;
  conversationHistory.length = 0;
  const history = loadChatHistory();
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
            const project = loadProject(pid);
            if (project) {
              project.colors = { ...project.colors, ...mappedColors };
              project.templateType = preset.type === 'dark-ui' ? 'dark-ui' : 'light-ui';
              saveProject(project);
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
    const styleLabels: Record<string, string> = { original: 'A', photorealistic: 'B', abstract: 'C' };
    const label = styleLabels[selected.style] ?? `${index + 1}`;
    const input = document.getElementById('conversationMessageInput') as HTMLTextAreaElement | null
      ?? document.getElementById('messageInput') as HTMLTextAreaElement | null;
    if (input) {
      input.value = `我选择第${label}张图`;
      input.dispatchEvent(new Event('input'));
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
      input.multiple = true;
      input.onchange = () => {
        const files = input.files;
        if (!files) return;
        for (const file of Array.from(files)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) return;
            pendingImages.push(dataUrl);
            renderImagePreviewBar();
          };
          reader.readAsDataURL(file);
        }
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
    saveChatHistory();
    return messageEl;
  }

  function sendUserMessage(source: 'default' | 'conversation' = 'conversation') {
    if (activeAbortController) return;
    const activeInput = source === 'default' ? defaultMessageInput : conversationMessageInput;
    const fallbackInput = source === 'default' ? conversationMessageInput : defaultMessageInput;
    const hasText = activeInput && activeInput.value.trim() !== '';
    const hasImages = pendingImages.length > 0;
    if (!hasText && !hasImages) return;
    const content = activeInput ? activeInput.value.trim() : '';

    showConversationChatView();
    (globalThis as any).__themeStudioCurrentProjectId = getCurrentProjectId() ?? undefined;

    if (hasImages) {
      const imagesToSend = [...pendingImages];
      pendingImages.length = 0;
      renderImagePreviewBar();
      const msgEl = addMessageToChat('user', content || '上传了参考图片');
      const contentEl = msgEl.querySelector('.message-content') as HTMLElement;
      if (contentEl) {
        imagesToSend.forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.style.cssText = 'max-width:200px;border-radius:8px;margin-top:4px;display:block;';
          contentEl.appendChild(img);
        });
      }
      saveChatHistory();
      imagesToSend.forEach(async (dataUrl) => {
        try {
          const result = await analyzeImageAsync(dataUrl);
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
      });
    } else {
      addMessageToChat('user', content);
    }

    if (activeInput) {
      activeInput.value = '';
      resizeMessageInput(activeInput, source === 'default' ? defaultComposerInner : conversationComposerInner);
    }
    if (fallbackInput && content) {
      fallbackInput.value = '';
      resizeMessageInput(fallbackInput, source === 'default' ? conversationComposerInner : defaultComposerInner);
    }
    if (content) callAI(content);

    if (content && getCurrentProjectId()) {
      const projectId = getCurrentProjectId()!;
      const activatedProject = activateProject(projectId);
      const project = activatedProject ?? loadProject(projectId);
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
          saveProject(project);
          deps.populateSidebarProjects();
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

    conversationHistory.push({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    const settings = loadSettings();
    if (!settings.apiKey) {
      addMessageToChat('ai', '⚠️ 请先点击右上角 ⚙ 设置按钮，填入您的 API Key 后再开始对话。');
      return;
    }

    const availablePresets = getAvailablePresets();
    const prefs = loadUserPreferences();
    const currentProject = getCurrentProjectId() ? loadProject(getCurrentProjectId()!) : null;
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
                const indicator = contentEl.querySelector('.thinking-indicator');
                if (indicator) indicator.remove();
                const thinkEl = contentEl.querySelector('.thinking-content');
                if (thinkEl) thinkEl.remove();
                contentEl.textContent += token;
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
    activeAbortController = null;
    setSendBtnStop(false);

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
    saveChatHistory();

    const toolCalls = enrichToolCallsWithColorHints(parseToolCallsFromContent(fullResponse), {
      userMessage,
      assistantMessage: fullResponse,
      priorAssistantMessage,
      priorUserMessage,
      latestThemeAgentDebugState,
      latestThemePreviews,
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
        addMessageToChat('ai', '⚠️ 工具执行总时长超限，剩余工具已跳过');
        saveChatHistory();
        break;
      }
      try {
        showToolLoading(tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews'
          ? '主题正在生成中，请稍后'
          : `⚙️ 正在执行 ${tc.tool}...`);

        const result = await executeTool(tc, (event) => {
          if (tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews') {
            if (event.type === 'image_generating') {
              showToolLoading('主题正在生成中，请稍后');
            } else if (event.type === 'image_generated') {
              removeToolLoading();
              addMessageToChat('ai', '🖼️ 背景图已生成，正在分析配色...');
              showToolLoading('🎨 正在分析配色方案...');
              saveChatHistory();
            }
          }
        });
        removeToolLoading();
        if (result.success) {
          if (tc.tool === 'generate_theme_pipeline') {
            const imgData = result.data as {
              imageUrl?: string;
              primaryColor?: string;
              originalPrompt?: string;
              directedPrompt?: string;
              finalPrompt?: string;
              scenePlan?: { sceneSentence?: string; styleKeywords?: string };
              intent?: { category?: string; subCategory?: string; styleHints?: string[]; toneHints?: string[]; colorHints?: string[]; uiUseCase?: string };
              planCheck?: { passed?: boolean; checks?: Array<{ label: string; passed: boolean; reason?: string }> };
              themeAgentDebug?: ThemeAgentDebugState;
              preferredHueHint?: string;
              fallbackUsed?: boolean;
              fallbackReason?: string;
              enforcedPreferredHue?: boolean;
              enforcementReason?: string;
              generationReport?: { checks?: Array<{ label: string; passed: boolean }> };
              contrastValidation?: { passed?: boolean; failures?: string[] };
              dominantColors?: string[];
              imageReview?: { score: number; acceptable: boolean; summary: string };
            };
            const colorTag = imgData?.primaryColor
              ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${imgData.primaryColor};vertical-align:middle;margin:0 2px;"></span>`
              : '';
            const rulePassed = imgData.generationReport?.checks?.every(check => check.passed) ?? false;
            const contrastPassed = imgData.contrastValidation?.passed ?? false;
            const summaryParts = [
              `🎨 配色方案已生成！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
              imgData.scenePlan?.sceneSentence ? `视觉方向：${imgData.scenePlan.sceneSentence.substring(0, 60)}...` : '',
              imgData.dominantColors?.length ? `识别到的候选主色 ${imgData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              imgData.fallbackUsed
                ? `本次提色未稳定完成，已按${imgData.preferredHueHint || '已确认'}主色方向回退应用。`
                : '',
              imgData.enforcedPreferredHue && !imgData.fallbackUsed
                ? `检测到图片主色与已确认的${imgData.preferredHueHint || '目标'}方向不一致，已强制校正到确认色。`
                : '',
              `生成规则校验：${rulePassed ? '通过' : '有待微调'}。`,
              imgData.fallbackReason ? `回退原因：${imgData.fallbackReason}。` : '',
              imgData.enforcementReason ? `${imgData.enforcementReason}` : '',
              `对比度校验：${contrastPassed ? '通过' : '存在风险'}。`,
              imgData.imageReview ? imgData.imageReview.summary : '',
              imgData.planCheck?.checks?.length ? `Theme Agent 计划校验：${imgData.planCheck.checks.map((check) => `${check.label}${check.passed ? '✅' : '❌'}`).join(' / ')}。` : '',
              imgData.themeAgentDebug ? `

[Theme Agent Debug]
toolCallPrompt: ${imgData.themeAgentDebug.toolCallPrompt ?? ''}
feedbackRegenerated: ${imgData.themeAgentDebug.feedbackRegenerated ? 'yes' : 'no'}
intent.category: ${imgData.themeAgentDebug.intent?.category ?? ''}
intent.subCategory: ${imgData.themeAgentDebug.intent?.subCategory ?? ''}
intent.categoryScores: ${imgData.themeAgentDebug.intent?.categoryScores ? JSON.stringify(imgData.themeAgentDebug.intent.categoryScores) : ''}
intent.styleHints: ${(imgData.themeAgentDebug.intent?.styleHints ?? []).join(', ')}
intent.toneHints: ${(imgData.themeAgentDebug.intent?.toneHints ?? []).join(', ')}
intent.colorHints: ${(imgData.themeAgentDebug.intent?.colorHints ?? []).join(', ')}
scene.sentence: ${imgData.themeAgentDebug.scenePlan?.sceneSentence?.substring(0, 80) ?? ''}
scene.styleKeywords: ${imgData.themeAgentDebug.scenePlan?.styleKeywords ?? ''}
planCheck: ${(imgData.themeAgentDebug.planCheck?.checks ?? []).map((check) => `${check.label}:${check.passed ? 'pass' : 'fail'}`).join(' | ')}
directedPrompt: ${imgData.themeAgentDebug.directedPrompt ?? ''}
finalPrompt: ${imgData.themeAgentDebug.finalPrompt ?? ''}` : '',
            ].filter(Boolean);
            latestThemeAgentDebugState = imgData.themeAgentDebug ?? null;
            // ── Preference memory: update project context and customer profile from feedback ──
            if (imgData.themeAgentDebug?.feedbackRegenerated && imgData.themeAgentDebug.intent && imgData.themeAgentDebug.scenePlan) {
              try {
                const pid = getCurrentProjectId();
                if (pid) {
                  const priorUserMsg = conversationHistory.length >= 2
                    ? conversationHistory[conversationHistory.length - 2]
                    : undefined;
                  const feedbackText = priorUserMsg?.role === 'user' ? priorUserMsg.content : '';
                  
                  if (feedbackText) {
                    const adjustment = parseThemeFeedback(feedbackText);
                    const decision = decidePreferenceUpdate({
                      adjustment,
                      currentCustomerProfile: loadCustomerVisualProfile('default'),
                      currentProjectContext: loadProjectVisualContext(pid),
                    });
                    
                    if (decision.projectPatch) {
                      updateProjectVisualContext(pid, decision.projectPatch);
                    }
                    if (decision.customerPatch) {
                      updateCustomerVisualProfile('default', decision.customerPatch);
                    }
                  }
                }
              } catch { /* non-critical — don't block UI */ }
            }
            addMessageToChat('ai', summaryParts.join(' '));
            saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            const pid = getCurrentProjectId();
            if (pid) {
              const proj = loadProject(pid);
              if (proj && !proj.themeName && conversationHistory.length > 0) {
                const firstUserMsg = conversationHistory.find(m => m.role === 'user');
                if (firstUserMsg) {
                  const raw = firstUserMsg.content.replace(/[\n\r]/g, ' ').trim();
                  proj.themeName = raw.length > 15 ? raw.substring(0, 15) + '...' : raw;
                  ensureProjectNameEn(proj, `${proj.themeName} ${raw}`);
                  saveProject(proj);
                  updateProjectNameDisplay(proj);
                }
              }
            }
            deps.expandPreview();
            const indicator = document.querySelector('.topbar-tabs .tab-indicator') as HTMLElement;
            const loginBtn = document.getElementById('loginTab') as HTMLElement;
            document.getElementById('loginTab')?.classList.add('active-tab');
            document.getElementById('loginPage')?.classList.add('active-preview');
            if (indicator && loginBtn) {
              indicator.style.left = loginBtn.offsetLeft + 'px';
              indicator.style.width = loginBtn.offsetWidth + 'px';
            }
            deps.collapseProjectSidebar();
            deps.setChatPanelWidth(372);
          } else if (tc.tool === 'generate_theme_previews') {
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
              addMessageToChat('ai', `🎨 已生成 ${previews.length} 张预览图，请点击选择或描述您的偏好：${previewHtml}`);
            } else {
              addMessageToChat('ai', '⚠️ 预览图生成失败，请重试。');
            }
            saveChatHistory();
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
            addMessageToChat('ai', [
              `🎨 主题已应用！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
              appliedData?.dominantColors?.length ? `识别到的候选主色 ${appliedData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              appliedData?.fallbackUsed ? '本次提色未稳定完成，已回退应用默认主色。' : '',
              appliedData?.enforcementReason ?? '',
              `对比度校验：${contrastPassed ? '通过' : '存在风险'}。`,
            ].filter(Boolean).join(' '));
            saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            latestThemePreviews = null;
            deps.expandPreview();
            deps.collapseProjectSidebar();
            deps.setChatPanelWidth(372);
            requestAnimationFrame(() => {
              const desktopTab = document.getElementById('desktopTab') as HTMLElement;
              const desktopPage = document.getElementById('desktopPage') as HTMLElement;
              const loginTab = document.getElementById('loginTab') as HTMLElement;
              const loginPage = document.getElementById('loginPage') as HTMLElement;
              if (desktopTab) desktopTab.classList.add('active-tab');
              if (desktopPage) desktopPage.classList.add('active-preview');
              if (loginTab) loginTab.classList.remove('active-tab');
              if (loginPage) loginPage.classList.remove('active-preview');
              const indicator = document.querySelector('.topbar-tabs .tab-indicator') as HTMLElement;
              if (indicator && desktopTab) {
                indicator.style.left = desktopTab.offsetLeft + 'px';
                indicator.style.width = desktopTab.offsetWidth + 'px';
              }
            });
          } else if (tc.tool === 'save_colors') {
            const saveData = tc.args as { name?: string; nameEn?: string };
            const pid = getCurrentProjectId();
            if (pid && saveData?.name) {
              const proj = loadProject(pid);
              if (proj) {
                proj.themeName = saveData.name;
                const normalizedNameEn = normalizeNameEn(saveData.nameEn);
                const derivedNameEn = deriveNameEnFromText(`${saveData.name} ${conversationHistory.find((m) => m.role === 'user')?.content || ''}`);
                if (normalizedNameEn || derivedNameEn !== 'project') {
                  proj.nameEn = normalizedNameEn || derivedNameEn;
                }
                saveProject(proj);
                updateProjectNameDisplay(proj);
              }
            }
          } else if (tc.tool === 'update_colors') {
            saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            deps.expandPreview();
          }
        } else {
          addMessageToChat('ai', `⚠️ ${tc.tool}: ${result.error ?? '未知错误'}`);
        }
        saveChatHistory();
      } catch (e) {
        removeToolLoading();
        addMessageToChat('ai', `❌ ${tc.tool} 执行失败：${(e as Error).message}`);
        saveChatHistory();
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
  }
}
