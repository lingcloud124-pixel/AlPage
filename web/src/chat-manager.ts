import { marked } from 'marked';
import {
  chatCompletion,
  loadSettings,
  parseToolCallsFromContent,
} from './agent/chat-client';
import { redirectToLogin } from './auth';
import { enrichToolCallsWithColorHints } from './agent/tool-call-utils';
import { getSystemPrompt } from './agent/system-prompt';
import { loadUserPreferences, extractPreferencesFromMessage, saveUserPreferences } from './agent/user-preferences';
import { analyzeImageAsync, executeTool } from './tools/executor';
import type { ChatMessage } from './types';
import type { PortalCustomerProfile } from './types';
import { deriveNameEnFromText, normalizeNameEn } from './project-naming';
import {
  applyPortalDraftToProject,
  createProject,
  getCurrentProjectId,
  loadProject,
  saveProject,
  setCurrentProjectId,
  updateProjectNameDisplay,
} from './project-manager';
import type { Project } from './project-manager';
import { setThemeVar, applyThemeImageAssignments, applyTemplateSpecificThemeVars, saveCurrentColorsToProject, getCurrentColors, getThemeTarget } from './theme-engine';
import { syncColorEditorFromTheme } from './components/color-editor';
import { parseThemeFeedback } from './tools/theme-feedback-refiner';
import { decidePreferenceUpdate } from './tools/theme-preference-updater';
import { updateProjectVisualContext, loadProjectVisualContext } from './tools/project-visual-context-store';
import { updateCustomerVisualProfile, loadCustomerVisualProfile } from './tools/customer-visual-profile-store';
import type { ThemePreview } from './tools/executor';
import { classifyImageIntent } from './image-intent';
import { applyPrimaryImageToProject } from './primary-image-flow';
import { showNotificationWithOptions } from './utils/notification';
import { createConversation, updateConversation } from './api/conversations';
import type { ConversationCreatePayload, ConversationUpdatePayload, ConversationImageData } from './types';
import { setActiveConversation, getActiveConversationId, refreshSidebar } from './components/sidebar';
import {
  buildPortalCollectionPrompt,
  buildPortalDraft,
  buildPortalSummary,
  buildPortalSummaryPrompt,
  createPortalGenerationPrompt,
  didPortalProfileChange,
  extractPortalProfileFromMessage,
  getPortalWorkflowState,
  isPortalSummaryConfirmationMessage,
  mergePortalProfile,
} from './portal-agent';
import {
  applyPortalPlanToProject,
  createPortalPlanFromProject,
  setPortalPlanStatus,
} from './portal-plan';
import { renderWorkspaceEditorShell } from './workspace/runtime';
import { renderWorkspacePreview } from './workspace/preview';
import { ensureWorkspaceTemplateCache, getWorkspaceTemplateCache } from './workspace/runtime';
import { persistWorkspaceToLocal, syncWorkspaceToServer } from './workspace/store';
import {
  showPortalConfirmForm,
  onPortalConfirmSubmit,
} from './components/portal-confirm-form';

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

interface SendUserMessageOptions {
  displayMessage?: string;
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

function highlightResultActions(): void {
  const actions = document.getElementById('workspaceResultActions');
  if (!actions) return;
  actions.classList.add('result-actions-highlight');
  setTimeout(() => { actions.classList.remove('result-actions-highlight'); }, 4000);
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
  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) messagesContainer.innerHTML = '';
  showDefaultChatView();
  setCurrentProjectId(null);
  _chatDeps?.collapsePreview?.();
  _chatDeps?.setChatPanelWidth(null);
  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = '开始新创作';
  setActiveConversationId(null);
}

  function extractThemeTitle(text: string): string {
    let name = '';
    let m: RegExpMatchArray | null;

    m = text.match(/生成(?:一个|一款)?[「"「]?(\S{1,12}?)[」"」]?(?:门户|主题|风格|界面)/);
    if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');

    if (!name) {
      m = text.match(/(?:做一个|做个|设计一个|创建一个|弄一个|来一个|来个)[「"「]?(\S{1,12}?)[」"」]?(?:门户|主题|风格|界面)/);
      if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name && /主题包/.test(text)) {
      const sub = text.match(/(?:一个|一款)\s*(\S{1,8}?)主题包/);
      if (sub) name = sub[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name) {
      m = text.match(/以[「"「]?(\S{1,12}?)[」"」]?为(?:门户|主题|基调|风格|背景|核心)/);
      if (m) name = m[1].replace(/[的啊吧呢呀哦嘛]+$/, '');
    }

    if (!name) {
      m = text.match(/(\S{1,8})(?:风格|色系)/);
      if (m && !/^(做|想|要|帮|给|用|我|请|能|可|把|让)/.test(m[1])) name = m[1];
    }

    if (!name) {
      m = text.match(/门户[是叫为：:]\s*[「"「]?(\S{1,12}?)[」"」]?\s*$/);
      if (m) name = m[1];
    }

    if (!name) {
      const cleaned = text.replace(/^(帮我|请|麻烦|我想|能不能|可以|用这|这个|那张|这张)[^\u4e00\u5e00-\u9fff]*/u, '').trim();
      name = cleaned.length > 10 ? cleaned.substring(0, 10) + '...' : cleaned;
    }

    return /门户$/.test(name) ? name : `${name}门户`;
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

function hasPortalProfilePatch(patch: Partial<PortalCustomerProfile>): boolean {
  return Object.values(patch).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}

async function syncProjectWorkspaceSnapshot(project: Project): Promise<void> {
  if (!project.workspace) return;
  persistWorkspaceToLocal(project.id, project.workspace);
  await syncWorkspaceToServer(project.id, project.workspace);
}

async function ensureNeedsDrivenWorkspace(project: Project): Promise<Project> {
  if (!project.portalProfile) return project;
  if (project.workspace?.meta?.source !== 'default' && project.portalPlanStatus === 'editing') return project;

  const portalSummary = project.portalSummary ?? buildPortalSummary(project.portalProfile);
  const portalDraft = buildPortalDraft(portalSummary);
  Object.assign(project, applyPortalDraftToProject(project, portalDraft));
  project.portalSummary = project.portalSummary?.confirmedAt
    ? { ...portalSummary, confirmedAt: project.portalSummary.confirmedAt }
    : portalSummary;
  const portalPlan = createPortalPlanFromProject(project);
  portalPlan.status = project.portalPlanStatus === 'editing' ? 'editing' : 'generated';
  portalPlan.updatedAt = Date.now();
  Object.assign(project, applyPortalPlanToProject(project, portalPlan));
  await saveProject(project);
  await syncProjectWorkspaceSnapshot(project);
  return project;
}

async function refreshNeedsDrivenWorkspacePreview(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  const project = await loadProject(projectId);
  if (!project) return;
  const hydratedProject = await ensureNeedsDrivenWorkspace(project);
  await ensureWorkspaceTemplateCache();
  renderWorkspaceEditorShell(hydratedProject.workspace ?? null);
  renderWorkspacePreview(document.getElementById('mainPage'), hydratedProject.workspace ?? null, getWorkspaceTemplateCache());
}

async function resolvePortalWorkflowForMessage(project: Project, userMessage: string): Promise<{
  project: Project;
}> {
  const extracted = extractPortalProfileFromMessage(userMessage);
  const previousProfile = project.portalProfile;
  const nextProfile = hasPortalProfilePatch(extracted)
    ? mergePortalProfile(previousProfile, extracted, 'chat')
    : previousProfile;
  const profileChanged = didPortalProfileChange(previousProfile, nextProfile);

  if (nextProfile) {
    project.portalProfile = nextProfile;
    if (!project.portalPlanStatus) {
      Object.assign(project, setPortalPlanStatus(project, 'collecting'));
    }
    if (project.name === '未命名项目' && nextProfile.customerName) {
      project.name = `${nextProfile.customerName}门户`;
      project.themeName = project.name;
      updateProjectNameDisplay(project);
    }
  }

  if (profileChanged && project.portalSummary?.confirmedAt) {
    project.portalSummary = undefined;
    project.portalDraft = undefined;
  }

  if (profileChanged && nextProfile) {
    project.portalSummary = buildPortalSummary(nextProfile);
    Object.assign(project, setPortalPlanStatus(project, 'summary_pending'));
  }

  await saveProject(project);
  await refreshNeedsDrivenWorkspacePreview();

  return { project };
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
  async function generatePortalPlanFromConfirmedProject(project: Project): Promise<void> {
    if (!project.portalProfile) return;
    const portalSummary = buildPortalSummary(project.portalProfile);
    const portalDraft = buildPortalDraft(portalSummary);
    Object.assign(project, applyPortalDraftToProject(project, portalDraft));
    project.portalSummary = {
      ...portalSummary,
      confirmedAt: Date.now(),
    };
    const portalPlan = createPortalPlanFromProject(project);
    portalPlan.status = 'generated';
    portalPlan.updatedAt = Date.now();
    Object.assign(project, applyPortalPlanToProject(project, portalPlan));
    await saveProject(project);
    await syncProjectWorkspaceSnapshot(project);
    await ensureWorkspaceTemplateCache();
    renderWorkspaceEditorShell(project.workspace ?? null);
    renderWorkspacePreview(document.getElementById('mainPage'), project.workspace ?? null, getWorkspaceTemplateCache());
    const prompt = createPortalGenerationPrompt(project.portalSummary);
    await callAI(prompt);
  }

  onPortalConfirmSubmit(async (project) => {
    await generatePortalPlanFromConfirmedProject(project);
  });
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
      const chatPanel = document.getElementById('chatPanel');
      chatPanel?.classList.remove('landing-mode');
      chatPanel?.classList.remove('is-full-landing');
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

  const openImagePicker = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
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
    const currentProjectId = hasImages
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
            ? '已识别为主图，将直接用于生成门户预览'
            : '已识别为参考图，将作为门户风格参考',
        );
      }
      await saveChatHistory();

      if (finalRole === 'primary' && currentProjectId) {
        const statusEl = addStatusMessage('正在根据主图提取门户主色并生成预览...');
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
            '已将当前参考图升级为主图并生成门户预览。',
          ].filter(Boolean).join(' ')
        : `⚠️ ${primaryResult.message}`);
      if (primaryResult.success) {
        deps.expandPreview();
              deps.setChatPanelWidth(372);
      }
    }

    let activeProjectId = getCurrentProjectId();
    if (!activeProjectId && content) {
      const newProject = await createProject('未命名项目', 'light-ui');
      if (newProject) {
        setCurrentProjectId(newProject.id);
        (globalThis as any).__themeStudioCurrentProjectId = newProject.id;
        activeProjectId = newProject.id;
      }
    }

    if (activeProjectId) {
      const activeProject = await loadProject(activeProjectId);
      if (activeProject) {
        await resolvePortalWorkflowForMessage(activeProject, content);
        const workflow = getPortalWorkflowState(activeProject.portalProfile, activeProject.portalSummary ?? null);
        if (content && isPortalSummaryConfirmationMessage(content) && workflow.status === 'ready_to_generate') {
          await generatePortalPlanFromConfirmedProject(activeProject);
          return;
        }
      }
    }

    if ((content) && !shouldSkipAiForPrimaryImage && !shouldUpgradeExistingReference) {
      await callAI(content);
    }
    if (!content && hasImages && currentImageRole !== 'primary') {
      addMessageToChat('ai', '已收到这张参考图。继续输入一句描述，比如“参考这张图做一个春日门户”，我就会开始生成。');
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

  async function callAI(userMessage: string) {
    const priorAssistantMessage = [...conversationHistory]
      .reverse()
      .find((message) => message.role === 'assistant')?.content ?? '';
    const priorUserMessage = [...conversationHistory]
      .reverse()
      .find((message) => message.role === 'user' && message.content.trim() !== userMessage.trim())?.content ?? '';

    const settings = loadSettings();
    // API key check removed - server holds the key now

    const prefs = loadUserPreferences();
    const currentProject = getCurrentProjectId() ? await loadProject(getCurrentProjectId()!) : null;
    const templateType = currentProject?.templateType || 'light-ui';
    const systemPrompt = getSystemPrompt({
      templateType,
      currentColors: getCurrentColors(),
      availablePresets: [],
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

    const toolCalls = enrichToolCallsWithColorHints(parseToolCallsFromContent(cleanedResponse), {
      userMessage,
      assistantMessage: fullResponse,
      priorAssistantMessage,
      priorUserMessage,
      templateType,
      latestThemeAgentDebugState,
      latestThemePreviews,
      currentColors: getCurrentColors(),
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
        const timeoutMsg = '⚠️ 工具执行总时长超限，剩余工具已跳过';
        await addMessageToChat('ai', timeoutMsg);
        pushToolResultToHistory(timeoutMsg);
        await saveChatHistory();
        break;
      }
      try {
        showToolLoading(tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews'
          ? '门户正在生成中，请稍后'
          : `⚙️ 正在执行 ${tc.tool}...`);

        const result = await executeTool(tc, (event) => {
          if (tc.tool === 'generate_theme_pipeline' || tc.tool === 'generate_theme_previews') {
            if (event.type === 'image_generating') {
              const d = event.data as { current?: number; total?: number; label?: string } | undefined;
              const cur = d?.current ?? 1;
              const tot = d?.total ?? 1;
              const label = d?.label ?? '';
              showToolLoading(`🎨 正在生成预览图 ${cur}/${tot}${label ? ` · ${label}` : ''}，请稍候...`);
            } else if (event.type === 'image_generated') {
              const d = event.data as { current?: number; total?: number } | undefined;
              const cur = d?.current ?? 1;
              const tot = d?.total ?? 1;
              if (cur < tot) {
                showToolLoading(`✅ 第 ${cur} 张完成，正在生成第 ${cur + 1} 张...`);
              } else {
                removeToolLoading();
                addMessageToChat('ai', `🖼️ 预览图已生成，正在准备展示...`);
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
            };
            const colorTag = appliedData?.primaryColor
              ? ` <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${appliedData.primaryColor};vertical-align:middle;margin:0 2px;"></span>`
              : '';
            const contrastPassed = appliedData?.contrastValidation?.passed ?? false;
            const appliedMsg = [
          `🎨 门户预览已更新！主色调${colorTag}已应用到当前门户，您可以在右侧查看效果。`,
              appliedData?.dominantColors?.length ? `识别到的候选主色 ${appliedData.dominantColors.slice(0, 3).join(' / ')}。` : '',
              appliedData?.fallbackUsed ? '本次提色未稳定完成，已回退应用默认主色。' : '',
              `对比度校验：${contrastPassed ? '通过' : '存在风险'}。`,
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
            await refreshNeedsDrivenWorkspacePreview();
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
              deps.expandPreview();
              deps.setChatPanelWidth(372);
              highlightResultActions();
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
          } else if (tc.tool === 'update_portal_profile') {
            const toolProfile = (result.data as { profile?: Partial<import('./types').PortalCustomerProfile> }).profile;
            if (toolProfile) {
              const pid = getCurrentProjectId();
              if (pid) {
                const proj = await loadProject(pid);
                if (proj) {
                  const previousProfile = proj.portalProfile;
                  const nextProfile = mergePortalProfile(previousProfile, toolProfile, 'chat');
                  proj.portalProfile = nextProfile;
                  if (proj.name === '未命名项目' && nextProfile.customerName) {
                    proj.name = `${nextProfile.customerName}门户`;
                    proj.themeName = proj.name;
                    updateProjectNameDisplay(proj);
                  }
                  await saveProject(proj);
                  const workflow = getPortalWorkflowState(proj.portalProfile, proj.portalSummary);
                  if (workflow.status === 'ready_to_generate' && !proj.portalSummary) {
                    proj.portalSummary = buildPortalSummary(proj.portalProfile);
                    await saveProject(proj);
                    const confirmMsg = '📋 已完整收集客户信息，请确认后开始生成门户。';
                    await addMessageToChat('ai', confirmMsg);
                    pushToolResultToHistory(confirmMsg);
                    showPortalConfirmForm(proj);
                  }
                }
              }
            }
            await saveChatHistory();
          }
        } else {
          if (tc.tool === 'generate_theme_previews') {
            const errMsg = `⚠️ ${result.error ?? '预览图生成失败，请重试。'}`;
            await addMessageToChat('ai', errMsg);
            pushToolResultToHistory(errMsg);
          } else {
            const errMsg = `⚠️ ${tc.tool}: ${result.error ?? '未知错误'}`;
            await addMessageToChat('ai', errMsg);
            pushToolResultToHistory(errMsg);
          }
          await saveChatHistory();
        }
      } catch (e) {
        removeToolLoading();
        const errMsg = `❌ ${tc.tool} 执行失败：${(e as Error).message}`;
        await addMessageToChat('ai', errMsg);
        pushToolResultToHistory(errMsg);
        await saveChatHistory();
      }
    }

    activeAbortController = null;
    setSendBtnStop(false);
  }
}
