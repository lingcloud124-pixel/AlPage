/**
 * chat-conversation-state.ts
 *
 * 从 chat-manager.ts 中提取的会话状态管理模块。
 * 包含会话历史数组、保存/加载/切换会话、视图模式切换等逻辑。
 */
import type { ChatMessage } from '../types';
import type { ConversationCreatePayload, ConversationUpdatePayload, ConversationImageData } from '../types';
import { createConversation, updateConversation } from '../api/conversations';
import { getCurrentProjectId, loadProject } from '../project-manager';
import { setActiveConversation, refreshSidebar } from '../components/sidebar';
import { renderMessage } from './chat-message-renderer';

// ─── 状态 ──────────────────────────────────────────────
/** 当前聊天历史消息列表 */
export const conversationHistory: ChatMessage[] = [];

/** 当前活跃会话 ID */
let _activeConversationId: string | null = null;

/** 保存队列，用于串行化异步保存操作 */
let _saveQueue: Promise<void> = Promise.resolve();

// ─── 对外暴露的 getter ──────────────────────────────────
/** 获取当前活跃会话 ID */
export function getConversationId(): string | null {
  return _activeConversationId;
}

/** 获取会话历史数组引用（只读访问用） */
export function getConversationHistory() {
  return conversationHistory;
}

// ─── 视图模式切换 ────────────────────────────────────────

/**
 * 切换聊天面板视图模式（默认欢迎页 / 对话页）
 */
function setChatViewMode(mode: 'default' | 'conversation'): void {
  const defaultView = document.getElementById('chatDefaultView');
  const conversationView = document.getElementById('chatConversationView');
  if (!defaultView || !conversationView) return;
  defaultView.classList.toggle('is-hidden', mode !== 'default');
  conversationView.classList.toggle('is-hidden', mode !== 'conversation');
}

/** 显示默认欢迎页 */
export function showDefaultChatView(): void {
  setChatViewMode('default');
}

/** 显示对话视图 */
export function showConversationChatView(): void {
  setChatViewMode('conversation');
}

// ─── 消息内容清理 ────────────────────────────────────────

/**
 * 清除消息内容中的工具调用 JSON 块和推理标签，
 * 以便在聊天界面中展示干净的文本。
 */
export function stripToolCallsFromDisplay(content: string): string {
  let cleaned = content;
  // 清除 MiniMax-M2.7 的 <thinkblocking> 推理输出标签
  cleaned = cleaned.replace(/<thinkblocking>[\s\S]*?<\/thinkblocking>/g, '');
  cleaned = cleaned.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '');
  cleaned = cleaned.replace(/\{"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

// ─── 会话历史操作 ────────────────────────────────────────

/**
 * 向历史记录追加一条用户消息
 */
export function pushUserMessage(content: string, timestamp?: number): void {
  conversationHistory.push({
    id: (timestamp ?? Date.now()).toString(),
    role: 'user',
    content,
    timestamp: timestamp ?? Date.now(),
  });
}

/**
 * 向历史记录追加一条 AI 回复消息
 */
export function pushAssistantMessage(content: string): void {
  conversationHistory.push({
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  });
}

/**
 * 清空当前会话历史记录
 */
export function clearConversationHistory(): void {
  conversationHistory.length = 0;
}

/**
 * 恢复会话历史（从持久化数据中还原）
 */
export function restoreConversationHistory(messages: ChatMessage[]): void {
  conversationHistory.length = 0;
  conversationHistory.push(...messages);
}

/**
 * 向历史记录追加一条工具执行结果消息（assistant 角色）
 */
export function pushToolResultToHistory(content: string): void {
  conversationHistory.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  });
}

// ─── 会话保存 ────────────────────────────────────────────

/**
 * 串行化保存会话历史到服务端。
 * 多次调用会排队依次执行，不会并发写入。
 */
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

/**
 * 实际执行会话保存：首次创建，后续更新。
 * 会附带当前项目快照和图片数据。
 */
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

/**
 * 从历史消息中提取会话标题。
 * 取第一条用户消息的前 40 个字符。
 */
function deriveConversationTitle(): string {
  const first = conversationHistory.find(m => m.role === 'user');
  if (!first) return '未命名项目';
  const text = first.content.slice(0, 40).replace(/\n/g, ' ').trim();
  return text || '未命名项目';
}

// ─── 会话加载 ────────────────────────────────────────────

/**
 * 加载聊天历史（占位实现，目前返回空数组）
 */
export async function loadChatHistory(): Promise<Array<{ role: string; content: string; timestamp: number }>> {
  return [];
}

/**
 * 加载并渲染聊天历史到界面（占位实现，清空后显示默认视图）
 */
export async function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): Promise<void> {
  if (!messagesContainer) return;
  conversationHistory.length = 0;
  showDefaultChatView();
  messagesContainer.innerHTML = '';
}

// ─── 会话切换 ────────────────────────────────────────────

/**
 * 设置当前活跃会话 ID，同步更新侧边栏高亮
 */
export function setActiveConversationId(id: string | null): void {
  _activeConversationId = id;
  setActiveConversation(id);
}

/**
 * 开始一个新会话：清空历史、重置 ID、重置界面
 *
 * @param collapsePreview - 可选的折叠预览面板回调
 * @param setChatPanelWidth - 可选的设置聊天面板宽度回调
 */
export function startNewConversation(opts?: {
  collapsePreview?: () => void;
  setChatPanelWidth?: (w: number | null) => void;
}): void {
  conversationHistory.length = 0;
  _activeConversationId = null;

  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) messagesContainer.innerHTML = '';
  showDefaultChatView();

  // 调用方传入的 UI 回调（原 _chatDeps 的部分功能）
  opts?.collapsePreview?.();
  opts?.setChatPanelWidth?.(null);

  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = '开始新创作';

  setActiveConversationId(null);
}

/**
 * 从持久化数据恢复会话 UI（消息渲染、侧边栏高亮、项目状态等）
 */
export function restoreConversationUI(
  detail: { messages: ChatMessage[]; id: string; imageData?: ConversationImageData; hasGeneratedTheme?: boolean; projectSnapshot?: Record<string, unknown> },
  setCurrentProjectId: (id: string | null) => void,
  updateProjectVisualContextFn: (projectId: string, ctx: Record<string, unknown>) => void,
  pendingImages: string[],
): void {
  const restoredImageUrl = detail.imageData?.primaryImage || '';
  restoreConversationHistory(detail.messages);
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

  if (restoredImageUrl) {
    const restoredProjectId = (detail.projectSnapshot as any)?.id as string | undefined;
    if (restoredProjectId) {
      try { updateProjectVisualContextFn(restoredProjectId, { imageInput: { dataUrl: restoredImageUrl, role: 'primary', updatedAt: Date.now() } }); } catch { /* non-critical */ }
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
