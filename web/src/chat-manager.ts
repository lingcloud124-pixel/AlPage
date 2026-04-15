import { marked } from 'marked';
import {
  chatCompletion,
  loadSettings,
  parseToolCallsFromContent,
} from './agent/chat-client';
import { getSystemPrompt } from './agent/system-prompt';
import { loadUserPreferences, extractPreferencesFromMessage, saveUserPreferences, trackPresetUsage } from './agent/user-preferences';
import { analyzeImageAsync, executeTool } from './tools/executor';
import type { ChatMessage } from './types';
import { getCurrentProjectId, loadProject, saveProject, updateProjectNameDisplay, PRESET_DISPLAY, getAvailablePresets } from './project-manager';
import type { Project } from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, saveCurrentColorsToProject, getCurrentColors, applyPresetBackground, getThemeTarget } from './theme-engine';
import { PRESET_BACKGROUNDS } from './project-manager';
import { syncColorEditorFromTheme } from './components/color-editor';

const conversationHistory: ChatMessage[] = [];
let activeAbortController: AbortController | null = null;

export function getConversationHistory() { return conversationHistory; }
export function getActiveAbortController() { return activeAbortController; }

export function renderMessage(role: 'user' | 'ai', content: string): HTMLElement {
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
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
  messagesContainer.innerHTML = '';
  conversationHistory.length = 0;
  const history = loadChatHistory();
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
  if (history.length === 0) {
    renderMessage('ai', '👋 欢迎使用主题工作室！我是您的 AI 助手，可以帮您生成配色方案、调整主题样式。请告诉我您想要什么样的主题风格？');
  }
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
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
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
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
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
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
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
      const input = document.getElementById('messageInput') as HTMLInputElement;
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
  const messageInput = document.getElementById('messageInput') as HTMLInputElement;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;

  if (!messageInput || !sendBtn || !messagesContainer) {
    console.error('Chat elements not found');
    return;
  }

  sendBtn.addEventListener('click', sendUserMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
  });

  const pendingImages: string[] = [];
  const imagePreviewBar = document.getElementById('imagePreviewBar') as HTMLElement;

  const plusBtn = document.getElementById('plusBtn');
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
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
    });
  }

  function renderImagePreviewBar() {
    if (!imagePreviewBar) return;
    imagePreviewBar.innerHTML = '';
    if (pendingImages.length === 0) {
      imagePreviewBar.classList.remove('has-images');
      return;
    }
    imagePreviewBar.classList.add('has-images');
    pendingImages.forEach((src, idx) => {
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
      imagePreviewBar.appendChild(thumb);
    });
  }

  function addMessageToChat(role: 'user' | 'ai', content: string): HTMLElement {
    const messageEl = renderMessage(role, content);
    saveChatHistory();
    return messageEl;
  }

  function sendUserMessage() {
    if (activeAbortController) return;
    const hasText = messageInput && messageInput.value.trim() !== '';
    const hasImages = pendingImages.length > 0;
    if (!hasText && !hasImages) return;
    const content = messageInput ? messageInput.value.trim() : '';

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

    if (messageInput) messageInput.value = '';
    if (content) callAI(content);

    if (content && getCurrentProjectId()) {
      const project = loadProject(getCurrentProjectId()!);
      if (project && project.name === '未命名项目') {
        const autoName = content.length > 20 ? content.substring(0, 20) + '...' : content;
        project.name = autoName;
        saveProject(project);
        const chatProjectName = document.getElementById('chatProjectName');
        if (chatProjectName) chatProjectName.textContent = autoName;
        const projectNameEl = document.getElementById('projectName');
        if (projectNameEl) projectNameEl.textContent = autoName;
        deps.populateSidebarProjects();
      }
    }
  }

  async function callAI(userMessage: string) {
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

    const btn = document.getElementById('sendBtn');
    const setSendBtnStop = (isStop: boolean) => {
      if (!btn) return;
      if (isStop) { btn.classList.add('stop-mode'); btn.title = '停止生成'; }
      else { btn.classList.remove('stop-mode'); btn.title = '发送'; }
    };

    activeAbortController = new AbortController();
    setSendBtnStop(true);

    const stopHandler = () => { activeAbortController?.abort(); setSendBtnStop(false); };
    btn?.addEventListener('click', stopHandler);

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
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        },
        activeAbortController.signal,
      );
    } catch (e) {
      btn?.removeEventListener('click', stopHandler);
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

    btn?.removeEventListener('click', stopHandler);
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

    const toolCalls = parseToolCallsFromContent(fullResponse);
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
        showToolLoading(tc.tool === 'generate_theme_pipeline'
          ? '🎨 正在生成背景图，请稍候...'
          : `⚙️ 正在执行 ${tc.tool}...`);

        const result = await executeTool(tc, (event) => {
          if (tc.tool === 'generate_theme_pipeline') {
            if (event.type === 'image_generating') {
              showToolLoading('🎨 正在生成背景图，请稍候...');
            } else if (event.type === 'image_generated') {
              removeToolLoading();
              const imgData = event.data as { imageUrl: string };
              addMessageToChat('ai', '🖼️ 背景图已生成，正在分析配色...');
              const imgMsg = addMessageToChat('ai', '');
              const imgEl = document.createElement('img');
              imgEl.src = imgData.imageUrl;
              imgEl.style.cssText = 'max-width:100%;border-radius:8px;margin-top:4px;';
              imgEl.crossOrigin = 'anonymous';
              const c = imgMsg.querySelector('.message-content') as HTMLElement;
              if (c) c.appendChild(imgEl);
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
              generationReport?: { checks?: Array<{ label: string; passed: boolean }> };
              contrastValidation?: { passed?: boolean; failures?: string[] };
              dominantColors?: string[];
            };
            const colorTag = imgData?.primaryColor
              ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${imgData.primaryColor};vertical-align:middle;margin:0 2px;"></span>`
              : '';
            const rulePassed = imgData.generationReport?.checks?.every(check => check.passed) ?? false;
            const contrastPassed = imgData.contrastValidation?.passed ?? false;
            const summaryParts = [
              `🎨 配色方案已生成！主色调${colorTag}已应用到预览，您可以在右侧查看效果。`,
              imgData.dominantColors?.length ? `识别到的候选主色 ${imgData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              `生成规则校验：${rulePassed ? '通过' : '有待微调'}。`,
              `对比度校验：${contrastPassed ? '通过' : '存在风险'}。`,
            ].filter(Boolean);
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
          } else if (tc.tool === 'save_colors') {
            const saveData = tc.args as { name?: string };
            const pid = getCurrentProjectId();
            if (pid && saveData?.name) {
              const proj = loadProject(pid);
              if (proj) { proj.themeName = saveData.name; saveProject(proj); updateProjectNameDisplay(proj); }
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
