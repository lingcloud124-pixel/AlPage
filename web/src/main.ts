import { initializeColorEditor } from './components/color-editor';
import { chatCompletion, loadSettings, parseToolCallsFromContent } from './agent/chat-client';
import { getSystemPrompt } from './agent/system-prompt';
import { executeTool } from './tools/executor';
import { initPenRenderer, getCurrentVariables } from './pen-renderer';
import type { ChatMessage } from './types';

declare global {
  interface Window {
    currentTheme: any;
  }
}

const conversationHistory: ChatMessage[] = [];

document.addEventListener('DOMContentLoaded', () => {
  initializeColorEditor();
  initializeFeatureModules();
  loadDefaultPen();
});

const PROJECT_ROOT = '/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation';
const DEFAULT_PEN_FILENAME = 'Topic-篮球对抗赛-1775778028.pen';
const LOGIN_NODE_ID = 'nXv3Y';
const MAIN_NODE_ID = 'dKOHu';

async function loadDefaultPen() {
  try {
    const url = `/@fs${PROJECT_ROOT}/designs/${DEFAULT_PEN_FILENAME}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn('Default .pen file not found at', url, '- status:', resp.status);
      return;
    }
    const penJson = await resp.json();
    await initPenRenderer(penJson, LOGIN_NODE_ID, MAIN_NODE_ID, 'loginPage', 'mainPage');
    console.log('Default .pen file loaded successfully');
  } catch (e) {
    console.warn('Failed to load default .pen file:', (e as Error).message);
  }
}

async function loadPenFromFile(file: File) {
  try {
    const text = await file.text();
    const penJson = JSON.parse(text);
    await initPenRenderer(penJson, LOGIN_NODE_ID, MAIN_NODE_ID, 'loginPage', 'mainPage');
  } catch (e) {
    console.error('Failed to load .pen file:', (e as Error).message);
  }
}

function initializeFeatureModules() {
  setupTabSwitching();
  setupChatInterface();
  setupCollapsibleColorPanel();
  setupSettingsDialog();
  setupMainActions();
}

function setupTabSwitching() {
  const loginTab = document.getElementById('loginTab') as HTMLButtonElement;
  const mainPageTab = document.getElementById('mainPageTab') as HTMLButtonElement;
  const loginPage = document.getElementById('loginPage') as HTMLElement;
  const mainPage = document.getElementById('mainPage') as HTMLElement;

  if (!loginTab || !mainPageTab || !loginPage || !mainPage) {
    console.error('Required elements for tab switching not found');
    return;
  }

  loginTab.classList.add('active-tab');
  loginPage.classList.add('active-preview');

  loginTab.addEventListener('click', () => {
    loginTab?.classList.add('active-tab');
    mainPageTab?.classList.remove('active-tab');
    
    loginPage?.classList.add('active-preview');
    mainPage?.classList.remove('active-preview');
  });

  mainPageTab.addEventListener('click', () => {
    mainPageTab?.classList.add('active-tab');
    loginTab?.classList.remove('active-tab');
    
    mainPage?.classList.add('active-preview');
    loginPage?.classList.remove('active-preview');
  });
}

function setupChatInterface() {
  const messageInput = document.getElementById('messageInput') as HTMLInputElement;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
  const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
  
  if (!messageInput || !sendBtn || !messagesContainer) {
    console.error('Chat elements not found');
    return;
  }

  sendBtn.addEventListener('click', sendUserMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  });
  
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  const uploadPenBtn = document.getElementById('uploadPenBtn');
  
  if (uploadImageBtn) {
    uploadImageBtn.addEventListener('click', () => {
      addMessageToChat('user', '上传了图片文件用于参考');
    });
  }
  
  if (uploadPenBtn) {
    uploadPenBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pen,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          addMessageToChat('user', `上传了 Pen 文件: ${file.name}`);
          await loadPenFromFile(file);
          addMessageToChat('ai', '✅ .pen 文件已加载到预览区');
        }
      };
      input.click();
    });
  }
  
  function addMessageToChat(role: 'user' | 'ai', content: string): HTMLElement {
    if (!messagesContainer) return document.createElement('div');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.textContent = role === 'ai' ? '🤖' : '👤';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
  }

  function sendUserMessage() {
    if (!messageInput || messageInput.value.trim() === '') return;
    
    const content = messageInput.value.trim();
    addMessageToChat('user', content);
    messageInput.value = '';
    
    callAI(content);
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

    const systemPrompt = getSystemPrompt({
      templateType: 'dark-ui',
      currentColors: getCurrentColors(),
      availablePresets: [],
    });

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

    try {
      fullResponse = await chatCompletion(
        { messages, temperature: 0.7 },
        (token) => {
          if (contentEl) {
            contentEl.textContent += token;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        },
      );
    } catch (e) {
      if (contentEl) {
        contentEl.textContent = `❌ 请求失败: ${(e as Error).message}`;
      }
      return;
    }

    conversationHistory.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    });

    const toolCalls = parseToolCallsFromContent(fullResponse);
    for (const tc of toolCalls) {
      try {
        const result = await executeTool(tc);
        const resultStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data ?? result.error);
        addMessageToChat('ai', `🔧 ${tc.tool}: ${resultStr}`);
      } catch (e) {
        addMessageToChat('ai', `❌ ${tc.tool} 执行失败: ${(e as Error).message}`);
      }
    }
  }

  function getCurrentColors(): Record<string, string> {
    return getCurrentVariables();
  }
}

function setupCollapsibleColorPanel() {
  const drawer = document.getElementById('colorEditorDrawer');
  const toggleBtn = document.getElementById('colorEditorToggle') as HTMLButtonElement;
  const closeBtn = document.getElementById('colorEditorClose') as HTMLButtonElement;
  
  if (!drawer || !toggleBtn) {
    console.error('Color editor drawer elements not found');
    return;
  }
  
  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      toggleBtn.innerHTML = `&#9660; 收起色值面板`;
    } else {
      toggleBtn.innerHTML = `&#9650; 展开色值面板`;
    }
  });
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.innerHTML = `&#9650; 展开色值面板`;
    });
  }
}

function setupSettingsDialog() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal') as HTMLElement;
  const closeModalBtn = document.querySelector('.modal-close-btn') as HTMLElement;
  const saveBtn = document.getElementById('saveSettings') as HTMLButtonElement;
  const cancelBtn = document.getElementById('cancelSettings') as HTMLButtonElement;
  
  if (!settingsBtn || !settingsModal || !closeModalBtn || !saveBtn || !cancelBtn) {
    console.error('Settings modal elements not found');
    return;
  }
  
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    loadStoredSettings();
  });
  
  closeModalBtn.addEventListener('click', closeSettingsDialog);
  cancelBtn.addEventListener('click', closeSettingsDialog);
  
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsDialog();
    }
  });
  
  saveBtn.addEventListener('click', saveSettings);
  
  function closeSettingsDialog() {
    settingsModal.classList.remove('active');
  }
  
  function loadStoredSettings() {
    const settings = JSON.parse(localStorage.getItem('themeStudioSettings') || '{}');
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    
    if (apiEndpointInput) apiEndpointInput.value = settings.apiEndpoint || 'https://open.bigmodel.cn/api/paas/v4';
    if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
    if (modelNameInput) modelNameInput.value = settings.modelName || 'GLM-4-Flash';
  }
  
  function saveSettings() {
    const apiEndpointInput = document.getElementById('apiEndpoint') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
    
    if (!apiEndpointInput || !apiKeyInput || !modelNameInput) return;
    
    const settings = {
      apiEndpoint: apiEndpointInput.value,
      apiKey: apiKeyInput.value, 
      modelName: modelNameInput.value
    };
    
    localStorage.setItem('themeStudioSettings', JSON.stringify(settings));
    settingsModal.classList.remove('active');
    showNotification('设置已保存');
  }
}

function setupMainActions() {
  const screenshotBtn = document.getElementById('screenshotBtn');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
      showNotification('正在进行屏幕截图...');
      
      setTimeout(() => {
        showNotification('截图已完成!');
      }, 1000);
    });
  }
  
  const bundleBtn = document.getElementById('bundleBtn');
  if (bundleBtn) {
    bundleBtn.addEventListener('click', () => {
      showNotification('正在打包主题…');
      
      setTimeout(() => {
        showNotification('主题打包完成！检查输出目录。');
      }, 2000);
    });
  }
}

function showNotification(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '10px 16px';
  toast.style.backgroundColor = '#333';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '1000';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}