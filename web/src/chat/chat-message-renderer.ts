/**
 * chat-message-renderer.ts
 *
 * 纯 UI 渲染辅助函数：消息渲染、思考过程折叠、消息容器获取。
 * 从 chat-manager.ts 中提取，无状态依赖。
 */
import { marked } from 'marked';

/**
 * 获取聊天消息容器 DOM 元素
 */
export function getConversationMessagesContainer(): HTMLElement | null {
  return document.getElementById('messagesContainer') as HTMLElement | null;
}

/**
 * 渲染一条聊天消息（用户 / AI）到消息容器中
 */
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

/**
 * 创建可折叠的思考过程区块
 */
export function buildThinkingToggle(text: string): HTMLElement {
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
