import { marked } from 'marked';
import {
  chatCompletion,
  loadSettings,
  parseToolCallsFromContent,
} from './agent/chat-client';
import { redirectToLogin } from './auth';
import { enrichToolCallsWithColorHints } from './agent/tool-call-utils';
import { getSystemPrompt } from './agent/system-prompt';
import { loadUserPreferences, extractPreferencesFromMessage, saveUserPreferences, trackPresetUsage } from './agent/user-preferences';
import { analyzeImageAsync, executeTool } from './tools/executor';
import type { ChatMessage } from './types';
import { deriveNameEnFromText, normalizeNameEn } from './project-naming';
import { getCurrentProjectId, loadProject, saveProject, updateProjectNameDisplay, PRESET_DISPLAY, getAvailablePresets, createProject, setCurrentProjectId } from './project-manager';
import type { Project } from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, saveCurrentColorsToProject, getCurrentColors, applyPresetBackground, getThemeTarget, resetThemeTargetStyles } from './theme-engine';
import { PRESET_BACKGROUNDS } from './project-manager';
import { syncColorEditorFromTheme } from './components/color-editor';
import { parseThemeFeedback } from './tools/theme-feedback-refiner';
import { decidePreferenceUpdate } from './tools/theme-preference-updater';
import { updateProjectVisualContext, loadProjectVisualContext } from './tools/project-visual-context-store';
import { updateCustomerVisualProfile, loadCustomerVisualProfile } from './tools/customer-visual-profile-store';
import type { ThemePreview } from './tools/executor';
import { classifyImageIntent } from './image-intent';
import { applyPrimaryImageToProject } from './primary-image-flow';
import { showNotificationWithOptions } from './package-manager';
import { renderLandingPromptButtonsAsync, resolveLegacyLandingPreset } from './landing-prompts';
import { createConversation, updateConversation } from './api/conversations';
import type { ConversationCreatePayload, ConversationUpdatePayload, ConversationImageData } from './types';
import { setActiveConversation, getActiveConversationId, refreshSidebar } from './components/sidebar';

const conversationHistory: ChatMessage[] = [];
let activeAbortController: AbortController | null = null;
const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;

let _activeConversationId: string | null = null;
let _saveQueue: Promise<void> = Promise.resolve();
let _chatDeps: ChatDeps | null = null;

export interface ThemeAgentDebugState {
  toolCallPrompt?: string;
  feedbackRegenerated?: boolean;
  finalPrompt?: string;
  preferredHueHint?: string;
  directions?: Array<{ label: string; prompt: string }>;
}

let latestThemeAgentDebugState: ThemeAgentDebugState | null = null;
let latestThemePreviews: Array<{
  url: string;
  style: string;
  prompt: string;
  directionLabel?: string;
  directionDescription?: string;
}> | null = null;

const TASK_SUBMITTED_TEXT = '1️⃣ 任务提交成功：已提交生成任务';
const TASK_QUEUEING_TEXT = '排队中：当前任务较多，正在排队处理中';
const TASK_GENERATING_TEXT = '生成中：正在生成主题画面…';
const TASK_STOPPED_TEXT = '当前操作已停止，可重新发起对话';

interface SendUserMessageOptions {
  displayMessage?: string;
  directPreviewPrompt?: string;
  directPreviewPrimaryHint?: string;
}

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
  const prev = _saveQueue;
  let resolve: () => void = () => {};
  _saveQueue = new Promise(r => { resolve = r; });
  await prev;
  try {
    await doSaveConversation();
  } finally {
    resolve();
  }
}

async function doSaveConversation(): Promise<void> {
  const histLen = conversationHistory.length;
  if (histLen === 0) return;
  const projectId = getCurrentProjectId();
  let projectSnapshot: Record<string, unknown> = {};
  let imageData: ConversationImageData | undefined;
  if (projectId) {
    const project = await loadProject(projectId);
    if (project) {
      projectSnapshot = JSON.parse(JSON.stringify(project));
      const images: ConversationImageData = {};
      if (project.bgImageUrl) images.primaryImage = project.bgImageUrl;
      if (project.headerBgImageUrl) images.headerImage = project.headerBgImageUrl;
      if (Object.keys(images).length > 0) imageData = images;
    }
  }
  const messages = conversationHistory.map(m => {
    let content = m.content;
    if (content && imageData?.primaryImage) {
      content = content.replace(
        /(<img[^>]+src=")(https?:\/\/[^"]+)("[^>]*>)/g,
        (match, prefix, url, suffix) => url.startsWith('data:') ? match : `${prefix}${imageData!.primaryImage}${suffix}`,
      );
    }
    return {
      id: m.id, role: m.role, content, timestamp: m.timestamp,
      toolCalls: m.toolCalls, toolResults: m.toolResults, attachments: m.attachments,
    };
  });

  try {
    if (!_activeConversationId) {
      const id = crypto.randomUUID();
      const title = deriveConversationTitle();
      const payload: ConversationCreatePayload = { id, title, messages, projectSnapshot, imageData, hasGeneratedTheme: !!projectId };
      const result = await createConversation(payload);
      if (result) {
        _activeConversationId = result.id;
        setActiveConversation(_activeConversationId);
      }
    } else {
      const payload: ConversationUpdatePayload = { messages, projectSnapshot, imageData, hasGeneratedTheme: !!projectId };
      await updateConversation(_activeConversationId, payload);
    }
    refreshSidebar();
  } catch (err) {
    console.error('[conversation] Save error:', err);
  }
}

function deriveConversationTitle(): string {
  const first = conversationHistory.find(m => m.role === 'user');
  if (!first) return '未命名项目';
  const text = first.content.slice(0, 40).replace(/\n/g, ' ').trim();
  return text || '未命名项目';
}

export async function loadChatHistory(): Promise<Array<{ role: string; content: string; timestamp: number }>> {
  return [];
}

export async function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): Promise<void> {
  if (!messagesContainer) return;
  conversationHistory.length = 0;
  showDefaultChatView();
  messagesContainer.innerHTML = '';
}

export function setActiveConversationId(id: string | null): void {
  _activeConversationId = id;
  setActiveConversation(id);
}

export function getConversationId(): string | null {
  return _activeConversationId;
}

export function startNewConversation(): void {
  conversationHistory.length = 0;
  _activeConversationId = null;
  latestThemePreviews = null;
  latestThemeAgentDebugState = null;
  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) messagesContainer.innerHTML = '';
  showDefaultChatView();
  setCurrentProjectId(null);
  resetThemeTargetStyles();
  _chatDeps?.collapsePreview?.();
  _chatDeps?.setChatPanelWidth(null);
  const previewPanel = document.getElementById('previewPanel');
  const appContainer = document.querySelector('.app-container');
  previewPanel?.classList.remove('expanded');
  appContainer?.classList.remove('preview-open');
  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = '开始新创作';
  setActiveConversationId(null);
}

  function extractThemeTitle(text: string): string {
    let name = '';
    let m: RegExpMatchArray | null;

    m = text.match(/生成(?:一个|一款)?[「"「]?(\S{1,12}?)[」"」]?(?:主题|风格|界面)/);
    if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');

    if (!name) {
      m = text.match(/(?:做一个|做个|设计一个|创建一个|弄一个|来一个|来个)[「"「]?(\S{1,12}?)[」"」]?(?:主题|风格|界面)/);
      if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name && /主题包/.test(text)) {
      const sub = text.match(/(?:一个|一款)\s*(\S{1,8}?)主题包/);
      if (sub) name = sub[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name) {
      m = text.match(/以[「"「]?(\S{1,12}?)[」"」]?为(?:主题|基调|风格|背景|核心)/);
      if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name) {
      m = text.match(/(\S{1,8})(?:风格|色系)/);
      if (m && !/^(做|想|要|帮|给|用|我|请|能|可|把|让)/.test(m[1])) name = m[1];
    }

    if (!name) {
      m = text.match(/主题[是叫为：:]\s*[「"「]?(\S{1,12}?)[」"」]?\s*$/);
      if (m) name = m[1];
    }

    if (!name) {
      const cleaned = text.replace(/^(帮我|请|麻烦|我想|能不能|可以|用这|这个|那张|这张)[^\u4e00\u5e00-\u9fff]*/u, '').trim();
      name = cleaned.length > 10 ? cleaned.substring(0, 10) + '...' : cleaned;
    }

    return /主题$/.test(name) ? name : `${name}主题`;
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

function pushToolResultToHistory(content: string): void {
  conversationHistory.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  });
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
          setTimeout(() => (window as any).resizePreview?.(), 600);
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
  collapsePreview?: () => void;
  syncLayout: (hasPreview: boolean, activeTabId: 'loginTab' | 'mainPageTab') => void;
  setChatPanelWidth: (width: number | null) => void;
  showWorkspace?: (projectId: string) => Promise<void>;
}

export function setupChatInterface(deps: ChatDeps) {
  _chatDeps = deps;
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

  const setConversationSendBtnStop = (isStop: boolean) => {
    if (isStop) {
      conversationSendBtn.classList.add('stop-mode');
      conversationSendBtn.title = '停止生成';
    } else {
      conversationSendBtn.classList.remove('stop-mode');
      conversationSendBtn.title = '发送';
    }
  };

  defaultSendBtn.addEventListener('click', () => sendUserMessage('default'));
  conversationSendBtn.addEventListener('click', () => sendUserMessage('conversation'));
  const resizeMessageInput = (input: HTMLTextAreaElement, composerInner: HTMLElement | null) => {
    input.style.height = '40px';
    const scrollable = input.scrollHeight > 72;
    const nextHeight = Math.min(input.scrollHeight, 72);
    const resolvedHeight = Math.max(40, nextHeight);
    input.style.height = `${resolvedHeight}px`;
    input.dataset.scrollLocked = String(input.scrollHeight <= 72);
    input.classList.toggle('is-scrollable', scrollable);
    input.scrollTop = scrollable ? input.scrollHeight : 0;
    if (composerInner) composerInner.style.minHeight = `${resolvedHeight + 56}px`;
  };

  const refreshLandingPromptButtons = async () => {
    const landingPromptContainer = document.querySelector<HTMLElement>('.landing-starter-pills.theme-suggestions');
    if (!landingPromptContainer) return;
    await renderLandingPromptButtonsAsync(landingPromptContainer);

    landingPromptContainer.onclick = (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>('.landing-prompt-trigger[data-prompt]');
      const displayPrompt = button?.dataset.prompt?.trim();
      if (!displayPrompt || !defaultMessageInput) return;

      const preset = resolveLegacyLandingPreset(displayPrompt);
      defaultMessageInput.value = displayPrompt;
      resizeMessageInput(defaultMessageInput, defaultComposerInner);
      void sendUserMessage('default', {
        displayMessage: displayPrompt,
        directPreviewPrompt: preset.prompt,
        directPreviewPrimaryHint: preset.primaryHint,
      });
    };
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

  window.addEventListener('sidebar:new-conversation', () => {
    startNewConversation();
  });

  window.addEventListener('sidebar:restore-conversation', ((e: CustomEvent) => {
    const detail = e.detail;
    if (detail && detail.messages) {
      const restoredImageUrl = detail.imageData?.primaryImage || '';
      conversationHistory.length = 0;
      conversationHistory.push(...detail.messages);
      _activeConversationId = detail.id;
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) messagesContainer.innerHTML = '';
      for (const msg of conversationHistory) {
        let displayContent = msg.role === 'assistant'
          ? stripToolCallsFromDisplay(msg.content)
          : msg.content;
        if (restoredImageUrl && displayContent) {
          displayContent = displayContent.replace(
            /(<img[^>]+src=")(https?:\/\/[^"]+)("[^>]*>)/g,
            (_match: string, prefix: string, url: string, suffix: string) => url.startsWith('data:') ? _match : `${prefix}${restoredImageUrl}${suffix}`,
          );
        }
        renderMessage(msg.role === 'assistant' ? 'ai' : msg.role, displayContent);
      }
      showConversationChatView();
      setActiveConversationId(detail.id);
      pendingImages.length = 0;
      renderImagePreviewBar();
      if (restoredImageUrl) {
        const restoredProjectId = (detail.projectSnapshot as any)?.id as string | undefined;
        if (restoredProjectId) {
          try { updateProjectVisualContext(restoredProjectId, { imageInput: { dataUrl: restoredImageUrl, role: 'primary', updatedAt: Date.now() } }); } catch { /* non-critical */ }
        }
      }
      if (detail.hasGeneratedTheme && detail.projectSnapshot && Object.keys(detail.projectSnapshot).length > 0) {
        window.dispatchEvent(new CustomEvent('sidebar:restore-project', { detail: detail.projectSnapshot }));
        const proj = detail.projectSnapshot as any;
        const chatProjectName = document.getElementById('chatProjectName');
        if (chatProjectName && proj.themeName) chatProjectName.textContent = proj.themeName;
        else if (chatProjectName && proj.name && proj.name !== '未命名项目') chatProjectName.textContent = proj.name;
      }
    }
  }) as EventListener);

  const pendingImages: string[] = [];
  const defaultImagePreviewBar = document.getElementById('imagePreviewBar') as HTMLElement | null;
  const conversationImagePreviewBar = document.getElementById('conversationImagePreviewBar') as HTMLElement | null;

  const openImagePicker = (autoSend = false) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const files = input.files;
        if (!files) return;
        const file = files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
          const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
          showNotificationWithOptions(
            `上传图片不能超过 2MB，当前图片约 ${fileSizeMb}MB，请重新上传`,
            {
              variant: 'critical',
              position: 'top-center',
              durationMs: 3600,
            },
          );
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) return;
          pendingImages.splice(0, pendingImages.length, dataUrl);
          renderImagePreviewBar();
          if (autoSend) {
            try {
              await ensureActiveProjectForImageUpload();
              showConversationChatView();
              await sendUserMessage('default');
            } catch (error) {
              console.warn('[chat-manager] 图片上传自动发送失败:', error);
            }
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
  };

  document.getElementById('plusBtn')?.addEventListener('click', () => openImagePicker(true));
  document.getElementById('conversationPlusBtn')?.addEventListener('click', () => openImagePicker(false));

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

  async function setLandingGalleryImage(imageSrc: string, themeName: string, primaryHint?: string) {
    if (!defaultMessageInput) return;
    try {
      const resolvedImageUrl = new URL(imageSrc, window.location.origin).toString();
      const response = await fetch(resolvedImageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string | null;
          if (!result) {
            reject(new Error('Failed to read image as data URL'));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
        reader.readAsDataURL(blob);
      });

      pendingImages.splice(0, pendingImages.length, dataUrl);
      renderImagePreviewBar();
      defaultMessageInput.value = `用这张图，生成一个${themeName}主题包`;
      resizeMessageInput(defaultMessageInput, defaultComposerInner);
      if (primaryHint) {
        defaultMessageInput.dataset.primaryHint = primaryHint;
      } else {
        delete defaultMessageInput.dataset.primaryHint;
      }
    } catch (error) {
      console.warn('[chat-manager] 推荐图资源加载失败:', error);
      showNotificationWithOptions('推荐图加载失败，请稍后重试', {
        variant: 'critical',
        position: 'top-center',
        durationMs: 2400,
      });
      return;
    }

    try {
      await ensureActiveProjectForImageUpload();
      showConversationChatView();
      await sendUserMessage('default');
    } catch (error) {
      console.warn('[chat-manager] 推荐图应用失败:', error);
      showNotificationWithOptions('推荐图应用失败，请稍后重试', {
        variant: 'critical',
        position: 'top-center',
        durationMs: 2400,
      });
    }
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

  async function ensureActiveProjectForImageUpload(): Promise<string | null> {
    const existingProjectId = getCurrentProjectId();
    if (existingProjectId) {
      return existingProjectId;
    }

    const newProject = await createProject('未命名项目', 'light-ui');
    if (!newProject) {
      return null;
    }

    setCurrentProjectId(newProject.id);

    if (deps.showWorkspace) {
      await deps.showWorkspace(newProject.id);
    }

    await Promise.resolve();
    return newProject.id;
  }

  function appendImageRoleBadge(contentEl: HTMLElement | null, label: string) {
    if (!contentEl) return;
    const badge = document.createElement('div');
    badge.textContent = label;
    badge.style.cssText = 'margin-top:6px;font-size:12px;color:var(--auxiliary-gray);';
    contentEl.appendChild(badge);
  }

  async function sendUserMessage(source: 'default' | 'conversation' = 'conversation', options?: SendUserMessageOptions) {
    if (activeAbortController) return;
    const activeInput = source === 'default' ? defaultMessageInput : conversationMessageInput;
    const fallbackInput = source === 'default' ? conversationMessageInput : defaultMessageInput;
    const displayMessage = options?.displayMessage?.trim() ?? '';
    const directPreviewPrompt = options?.directPreviewPrompt?.trim() ?? '';
    const directPreviewPrimaryHint = options?.directPreviewPrimaryHint?.trim() ?? '';
    const inputContent = activeInput ? activeInput.value.trim() : '';
    const content = displayMessage || inputContent;
    const hasText = Boolean(content);
    const hasImages = pendingImages.length > 0;
    if (!hasText && !hasImages) return;
    let uploadedImageRole: 'primary' | 'reference' | null = null;

    showConversationChatView();
    if (hasImages) deps.collapsePreview?.();
    (globalThis as any).__themeStudioCurrentProjectId = getCurrentProjectId() ?? undefined;

    const userMessageTimestamp = Date.now();
    const userMessageId = userMessageTimestamp.toString();
    const currentProjectId = hasImages || directPreviewPrompt
      ? await ensureActiveProjectForImageUpload()
      : getCurrentProjectId();
    showConversationChatView();
    if (hasImages) deps.collapsePreview?.();
    const currentProject = currentProjectId ? await loadProject(currentProjectId) : null;
    const visualContext = currentProject?.visualContext ?? (currentProjectId ? loadProjectVisualContext(currentProjectId) : null);

    if (hasImages) {
      const imagesToSend = [...pendingImages];
      pendingImages.length = 0;
      renderImagePreviewBar();
      const imageIntent = classifyImageIntent(content || '');
      const finalRole = imageIntent.role;
      uploadedImageRole = finalRole;
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
        const lockedPrimaryHint = activeInput?.dataset.primaryHint?.trim() ?? '';
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
          primaryHint: lockedPrimaryHint,
        });
        if (activeInput?.dataset.primaryHint) {
          delete activeInput.dataset.primaryHint;
        }
        statusEl.remove();
        if (primaryResult.success) {
          addMessageToChat('ai', [
            primaryResult.message,
          ].filter(Boolean).join(' '));
          deps.expandPreview();
                  deps.setChatPanelWidth(372);
        } else {
          addMessageToChat('ai', `⚠️ ${primaryResult.message}`);
        }
      } else if (finalRole === 'primary') {
        addMessageToChat('ai', '⚠️ 当前未能创建可用项目，主图暂时无法直接生成预览。');
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
    const shouldSkipAiForPrimaryImage = hasImages && uploadedImageRole === 'primary';
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
          ].filter(Boolean).join(' ')
        : `⚠️ ${primaryResult.message}`);
      if (primaryResult.success) {
        deps.expandPreview();
              deps.setChatPanelWidth(372);
      }
    }

    if (directPreviewPrompt) {
      const toolLoadingEl = addStatusMessage(TASK_SUBMITTED_TEXT);
      const toolLoadingContentEl = toolLoadingEl.querySelector('.message-content') as HTMLElement | null;
      if (toolLoadingContentEl) {
        toolLoadingContentEl.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${TASK_SUBMITTED_TEXT}</span>`;
      }

      activeAbortController = new AbortController();
      setConversationSendBtnStop(true);
      const stopHandler = () => {
        activeAbortController?.abort();
        setConversationSendBtnStop(false);
      };
      conversationSendBtn?.addEventListener('click', stopHandler);

      const updateDirectPreviewLoading = (text: string) => {
        if (toolLoadingContentEl) {
          toolLoadingContentEl.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${text}</span>`;
        }
      };

      let toolResult;
      try {
        toolResult = await executeTool({
          tool: 'generate_theme_pipeline',
          args: {
            prompt: directPreviewPrompt,
            templateType: 'light-ui',
            ...(directPreviewPrimaryHint ? { primaryHint: directPreviewPrimaryHint } : {}),
          },
        }, (event) => {
          if (event.type === 'task_submitted') {
            updateDirectPreviewLoading(TASK_SUBMITTED_TEXT);
          } else if (event.type === 'queueing') {
            updateDirectPreviewLoading(TASK_QUEUEING_TEXT);
          } else if (event.type === 'image_generating') {
            updateDirectPreviewLoading(TASK_GENERATING_TEXT);
          }
        }, activeAbortController.signal);
      } catch (error) {
        toolResult = {
          success: false,
          error: (error as Error).name === 'AbortError' ? '用户已停止当前操作' : (error as Error).message,
        };
      }

      conversationSendBtn?.removeEventListener('click', stopHandler);
      setConversationSendBtnStop(false);
      activeAbortController = null;
      toolLoadingEl.remove();

      if (!toolResult.success && toolResult.error === '用户已停止当前操作') {
        await addMessageToChat('ai', TASK_STOPPED_TEXT);
        pushToolResultToHistory(TASK_STOPPED_TEXT);
        await saveChatHistory();
        return;
      }

      if (toolResult.success) {
        const data = toolResult.data as {
          primaryColor?: string;
          imageUrl?: string;
          dominantColors?: string[];
          contrastValidation?: { passed?: boolean };
          enforcementReason?: string;
          derivedColors?: Record<string, string>;
        };
        const appliedPrimaryColor = data?.derivedColors?.['primary-color'] ?? data?.primaryColor;
        const colorTag = appliedPrimaryColor
          ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${appliedPrimaryColor};vertical-align:middle;margin:0 2px;"></span>`
          : '';
        const toolResultMsg = [
          `🎨 主题已应用！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
          data?.dominantColors?.length ? `识别到的候选主色 ${data.dominantColors.slice(0, 3).join(' / ')}。` : '',
        ].filter(Boolean).join(' ');
        await addMessageToChat('ai', toolResultMsg);
        pushToolResultToHistory(toolResultMsg);
        await saveCurrentColorsToProject();
        syncColorEditorFromTheme();
        deps.expandPreview();
        deps.setChatPanelWidth(372);
        await saveChatHistory();
      } else {
        const errMsg = `⚠️ ${toolResult.error ?? '预览图生成失败，请重试。'}`;
        await addMessageToChat('ai', errMsg);
        pushToolResultToHistory(errMsg);
        await saveChatHistory();
      }
    } else if (content && !shouldSkipAiForPrimaryImage && !shouldUpgradeExistingReference) {
      if (!getCurrentProjectId()) {
        const newProject = await createProject('未命名项目', 'light-ui');
        if (newProject) {
          setCurrentProjectId(newProject.id);
          (globalThis as any).__themeStudioCurrentProjectId = newProject.id;
        }
      }
      await callAI(content);
    }
    if (!content && hasImages && currentImageRole !== 'primary') {
      addMessageToChat('ai', '已收到这张参考图。继续输入一句描述，比如“参考这张图做一个春日主题”，我就会开始生成。');
      await saveChatHistory();
    }

    if (content && getCurrentProjectId()) {
      const projectId = getCurrentProjectId()!;
      const project = await loadProject(projectId);
      if (project) {
        if (project.lifecycle !== 'active') {
          project.lifecycle = 'active';
          await saveProject(project);
        }

        if (project.name === '未命名项目') {
          const themeTitle = extractThemeTitle(content);
          project.name = themeTitle;
          project.themeName = themeTitle;
          const chatProjectName = document.getElementById('chatProjectName');
          if (chatProjectName) chatProjectName.textContent = themeTitle;
          await saveProject(project);
        }

        const projectNameEl = document.getElementById('projectName');
        if (projectNameEl) projectNameEl.textContent = project.themeName || project.name;

        const nameEnChanged = ensureProjectNameEn(project, `${project.themeName || ''} ${content}`);

        if (nameEnChanged) {
          await saveProject(project);
        }

        await saveChatHistory();
      }
    }
  }

  const landingPromptContainer = document.querySelector<HTMLElement>('.landing-starter-pills.theme-suggestions');
  if (landingPromptContainer) {
    refreshLandingPromptButtons();
  }

  const landingGalleryCards = document.querySelectorAll<HTMLElement>('.landing-gallery-trigger[data-image-src][data-theme-name]');
  landingGalleryCards.forEach((card) => {
    const triggerSelection = () => {
      const imageSrc = card.dataset.imageSrc?.trim();
      const themeName = card.dataset.themeName?.trim();
      const primaryHint = card.dataset.primaryHint?.trim();
      if (!imageSrc || !themeName) return;
      setLandingGalleryImage(imageSrc, themeName, primaryHint);
    };

    card.addEventListener('click', triggerSelection);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerSelection();
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
      contentEl.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${TASK_SUBMITTED_TEXT}</span>`;
    }

    activeAbortController = new AbortController();
    setConversationSendBtnStop(true);

    const stopHandler = () => { activeAbortController?.abort(); setConversationSendBtnStop(false); };
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
              contentEl.innerHTML = `<span class="tool-loading-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${TASK_QUEUEING_TEXT}</span>`;
              firstToken = false;
            }
            if (token) {
              if (token.startsWith('\u200B')) {
                thinkingText += token.slice(1);
                const indicator = contentEl.querySelector('.tool-loading-indicator');
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
                  const indicator = contentEl.querySelector('.tool-loading-indicator');
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
      setConversationSendBtnStop(false);
      if (contentEl) {
        contentEl.classList.remove('typing', 'streaming');
        if ((e as Error).name === 'AbortError' || (e as Error).message?.includes('aborted')) {
          contentEl.innerHTML = '';
          contentEl.textContent = TASK_STOPPED_TEXT;
        } else {
          contentEl.textContent = `❌ 请求失败: ${(e as Error).message}`;
        }
      }
      return;
    }

    conversationSendBtn?.removeEventListener('click', stopHandler);

    conversationHistory.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    });
    await saveChatHistory();

    if (contentEl) {
      try {
        contentEl.classList.remove('streaming');
        const cleaned = stripToolCallsFromDisplay(fullResponse);
        contentEl.innerHTML = '';
        if (thinkingText) contentEl.appendChild(buildThinkingToggle(thinkingText));
        const mdSpan = document.createElement('span');
        mdSpan.innerHTML = marked.parse(cleaned || '') as string;
        contentEl.appendChild(mdSpan);
      } catch (renderErr) {
        console.error('[callAI] Render error (saved already):', renderErr);
        try {
          contentEl.textContent = fullResponse.slice(0, 500);
        } catch { /* ignore */ }
      }
    }

    const cleanedResponse = fullResponse.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '');

    const parsedToolCalls = parseToolCallsFromContent(cleanedResponse);
    let toolCalls = enrichToolCallsWithColorHints(parsedToolCalls, {
      userMessage,
      assistantMessage: fullResponse,
      priorAssistantMessage,
      priorUserMessage,
      templateType,
      latestThemeAgentDebugState,
      latestThemePreviews,
      currentColors: getCurrentColors(),
    });
    if (
      toolCalls.length === 0
      && /现在为您生成(?:一张)?预览图|我来为您生成|接下来为您生成/u.test(cleanedResponse)
    ) {
      const normalizedPlan = cleanedResponse
        .replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const planMatch = normalizedPlan.match(/好的，我先为您整理一个方案[：:，,]?\s*([\s\S]*?)(?:现在为您生成(?:一张)?预览图|我来为您生成|接下来为您生成)/u);
      const fallbackPrompt = planMatch?.[1]?.trim() || userMessage.trim();
      if (fallbackPrompt) {
        toolCalls = [{
          tool: 'generate_theme_pipeline',
          args: {
            prompt: fallbackPrompt,
            templateType,
          },
        }];
      }
    }
    console.log('[chat-manager] tool calls', {
      parsed: parsedToolCalls.map((toolCall) => toolCall.tool),
      enriched: toolCalls.map((toolCall) => toolCall.tool),
    });
    const TOOL_GLOBAL_TIMEOUT = 120_000;
    const toolStartTime = Date.now();
    let shouldAbortRemainingTools = false;

    let loadingMsgEl: HTMLElement | null = null;
    function showToolLoading(text: string) {
      if (!loadingMsgEl) {
        loadingMsgEl = addMessageToChat('ai', '');
      }
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
      if (shouldAbortRemainingTools) {
        const skipMsg = `⚠️ 前序步骤失败，已跳过 ${tc.tool}`;
        await addMessageToChat('ai', skipMsg);
        pushToolResultToHistory(skipMsg);
        await saveChatHistory();
        continue;
      }
      if (Date.now() - toolStartTime > TOOL_GLOBAL_TIMEOUT) {
        removeToolLoading();
        const timeoutMsg = '⚠️ 工具执行总时长超限，剩余工具已跳过';
        await addMessageToChat('ai', timeoutMsg);
        pushToolResultToHistory(timeoutMsg);
        await saveChatHistory();
        break;
      }
      try {
        showToolLoading(tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews'
          ? TASK_SUBMITTED_TEXT
          : `⚙️ 正在执行 ${tc.tool}...`);

        const result = await executeTool(tc, (event) => {
          if (tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews') {
            if (event.type === 'task_submitted') {
              showToolLoading(TASK_SUBMITTED_TEXT);
            } else if (event.type === 'queueing') {
              showToolLoading(TASK_QUEUEING_TEXT);
            } else if (event.type === 'image_generating') {
              const d = event.data as { current?: number; total?: number; label?: string } | undefined;
              const cur = d?.current;
              const tot = d?.total;
              const label = d?.label ?? '';
              const suffix = cur && tot && tot > 1 ? ` ${cur}/${tot}${label ? ` · ${label}` : ''}` : '';
              showToolLoading(`${TASK_GENERATING_TEXT}${suffix}`);
            } else if (event.type === 'image_generated') {
              const d = event.data as { current?: number; total?: number } | undefined;
              const cur = d?.current ?? 1;
              const tot = d?.total ?? 1;
              if (cur < tot) {
                showToolLoading(`${TASK_GENERATING_TEXT} ${cur + 1}/${tot}`);
              } else {
                removeToolLoading();
                addMessageToChat('ai', `🖼️ 预览图已生成，正在准备展示...`);
                showToolLoading('📋 正在整理预览...');
                void saveChatHistory();
              }
            }
          }
        }, activeAbortController?.signal);
        removeToolLoading();
        if (!result.success && result.error === '用户已停止当前操作') {
          await addMessageToChat('ai', TASK_STOPPED_TEXT);
          pushToolResultToHistory(TASK_STOPPED_TEXT);
          await saveChatHistory();
          break;
        }
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
              if (previews.length === 1 && previews[0]?.url) {
                applyThemeImageAssignments('login', previews[0].url);
                applyThemeImageAssignments('desktop', previews[0].url);
                deps.expandPreview();
                deps.setChatPanelWidth(372);
              }
              const imageCards = previews.map((p, i) =>
                `<div style="flex:1;min-width:0;text-align:center;">` +
                `<img src="${p.url}" style="width:100%;border-radius:8px;border:1px solid #ccc;cursor:pointer;" onclick="window.__selectThemePreview(${i})" />` +
                `<div style="margin-top:4px;font-size:13px;color:#ddd;font-weight:600;">${p.directionLabel ?? `图 ${i + 1}`}</div>` +
                (p.directionDescription ? `<div style="margin-top:2px;font-size:11px;color:#888;">${p.directionDescription}</div>` : '') +
                `</div>`
              ).join('');
              const previewHtml = `<div style="display:flex;gap:8px;margin:8px 0;">${imageCards}</div>`;
              const prevMsg = `🎨 已生成 ${previews.length} 张预览图，请点击选择或描述您的偏好：${previewHtml}`;
              await addMessageToChat('ai', prevMsg);
              pushToolResultToHistory(prevMsg);
              await saveChatHistory();
            } else {
              const failMsg = '⚠️ 预览图生成失败，请重试。';
              await addMessageToChat('ai', failMsg);
              pushToolResultToHistory(failMsg);
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
              derivedColors?: Record<string, string>;
            };
            const appliedPrimaryColor = appliedData?.derivedColors?.['primary-color'] ?? appliedData?.primaryColor;
            const colorTag = appliedPrimaryColor
              ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${appliedPrimaryColor};vertical-align:middle;margin:0 2px;"></span>`
              : '';
            const appliedMsg = [
              `🎨 主题已应用！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
              appliedData?.dominantColors?.length ? `识别到的候选主色 ${appliedData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              appliedData?.fallbackUsed ? '本次提色未稳定完成，已回退应用默认主色。' : '',
            ].filter(Boolean).join(' ');
            await addMessageToChat('ai', appliedMsg);
            pushToolResultToHistory(appliedMsg);
            await saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            latestThemePreviews = null;
            deps.expandPreview();
                      deps.setChatPanelWidth(372);
            await saveChatHistory();
          } else if (tc.tool === 'generate_theme_pipeline') {
            const pipelineData = result.data as {
              imageUrl?: string;
              preferredHueHint?: string;
              themeAgentDebug?: ThemeAgentDebugState | null;
            };
            latestThemeAgentDebugState = pipelineData?.themeAgentDebug ?? null;
            latestThemePreviews = pipelineData?.imageUrl ? [{
              url: pipelineData.imageUrl,
              style: 'single-direction',
              prompt: '',
              directionLabel: '当前方案',
              directionDescription: '',
            }] : null;
            await saveCurrentColorsToProject();
            syncColorEditorFromTheme();
            if (pipelineData?.imageUrl) {
              const previewHtml =
                `<div style="display:flex;gap:8px;margin:8px 0;">` +
                `<div style="flex:1;min-width:0;text-align:center;">` +
                `<img src="${pipelineData.imageUrl}" style="width:100%;border-radius:8px;border:1px solid #ccc;" />` +
                `<div class="theme-preview-confirm-hint">如果满意，请回复"确认"或"就这样"；如果不满意，直接告诉我想怎么改。</div>` +
                `</div></div>`;
              const pipelineMsg = `🎨 我先给您生成了 1 个方案，请先看这张图：${previewHtml}`;
              await addMessageToChat('ai', pipelineMsg);
              pushToolResultToHistory(pipelineMsg);
              await saveChatHistory();
            } else {
              const failMsg = '⚠️ 预览图生成失败，请重试。';
              await addMessageToChat('ai', failMsg);
              pushToolResultToHistory(failMsg);
              await saveChatHistory();
            }
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
          latestThemePreviews = null;
          if (tc.tool === 'generate_theme_previews') {
            const errMsg = `⚠️ ${result.error ?? '预览图生成失败，请重试。'}`;
            await addMessageToChat('ai', errMsg);
            pushToolResultToHistory(errMsg);
          } else {
            const errMsg = `⚠️ ${tc.tool}: ${result.error ?? '未知错误'}`;
            await addMessageToChat('ai', errMsg);
            pushToolResultToHistory(errMsg);
          }
          shouldAbortRemainingTools = true;
          await saveChatHistory();
        }
      } catch (e) {
        removeToolLoading();
        latestThemePreviews = null;
        const errMsg = `❌ ${tc.tool} 执行失败：${(e as Error).message}`;
        await addMessageToChat('ai', errMsg);
        pushToolResultToHistory(errMsg);
        shouldAbortRemainingTools = true;
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
    setConversationSendBtnStop(false);
  }
}
