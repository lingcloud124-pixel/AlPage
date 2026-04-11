import { initializeColorEditor } from './components/color-editor';
import { chatCompletion, loadSettings, parseToolCallsFromContent } from './agent/chat-client';
import { getSystemPrompt } from './agent/system-prompt';
import { executeTool } from './tools/executor';
import { renderTemplate } from './templates/loader';
import type { ChatMessage } from './types';

declare global {
  interface Window {
    currentTheme: any;
  }
}

interface Project {
  id: string;
  name: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImage?: string;
  createdAt: number;
  updatedAt: number;
}

const conversationHistory: ChatMessage[] = [];

document.addEventListener('DOMContentLoaded', () => {
  initializeColorEditor();
  initializeFeatureModules();
  initializeRoutingModule();
  loadDefaultTemplates();
});

const PROJECT_ROOT = '/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation';

function initializeRoutingModule() {
  const currentProjectId = localStorage.getItem('theme-studio-current-project');
  
  if (currentProjectId) {
    showWorkspace(currentProjectId);
  } else {
    showHomePage();
  }
  
  const newProjectCard = document.getElementById('newProjectCard');
  if (newProjectCard) {
    newProjectCard.addEventListener('click', () => {
      showNewProjectDialog();
    });
  }
  
  const projectSwitcherBtn = document.getElementById('projectSwitcherBtn');
  if (projectSwitcherBtn) {
    projectSwitcherBtn.addEventListener('click', () => {
      showHomePage();
    });
  }
  
  populateHistoryProjects();
}

function showHomePage() {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  
  if (homePage) homePage.classList.remove('view-hidden');
  if (workspaceView) workspaceView.classList.add('view-hidden');
  
  populateHistoryProjects();
}

function showWorkspace(projectId: string) {
  const homePage = document.getElementById('homePage');
  const workspaceView = document.getElementById('workspaceView');
  
  if (homePage) homePage.classList.add('view-hidden');
  if (workspaceView) workspaceView.classList.remove('view-hidden');
  
  localStorage.setItem('theme-studio-current-project', projectId);
  
  const project = loadProject(projectId);
  if (project) {
    const projectNameElement = document.getElementById('projectName');
    if (projectNameElement) {
      projectNameElement.textContent = project.name;
      
      projectNameElement.setAttribute('contenteditable', 'true');
      projectNameElement.addEventListener('blur', () => {
        project.name = projectNameElement.textContent || projectNameElement.textContent || '未命名项目';
        saveProject(project);
      });
      projectNameElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          projectNameElement.blur();
        }
      });
    }
  }
}

function showNewProjectDialog() {
  let modal = document.getElementById('newProjectModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newProjectModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建新项目</h3>
          <button class="modal-close-btn" id="closeNewProjectModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="projectNameInput">项目名称：</label>
            <input type="text" id="projectNameInput" placeholder="请输入项目名称" />
          </div>
          <div class="form-field">
            <label>模板类型：</label>
            <div class="radio-options">
              <label>
                <input type="radio" name="templateType" value="light-ui" checked /> 
                Light-UI
              </label>
              <label>
                <input type="radio" name="templateType" value="dark-ui" /> 
                Dark-UI
              </label>
            </div>
          </div>
          <div class="form-field">
            <label>快速配色：</label>
            <div class="preset-filter">
              <button class="preset-filter-btn active" data-filter="all">全部</button>
              <button class="preset-filter-btn" data-filter="light-ui">Light-UI</button>
              <button class="preset-filter-btn" data-filter="dark-ui">Dark-UI</button>
            </div>
            <div class="preset-grid" id="presetGrid">
              <!-- JS 动态生成 -->
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="createProjectBtn">创建</button>
          <button id="cancelNewProject">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const closeBtn = document.getElementById('closeNewProjectModal');
  const cancelBtn = document.getElementById('cancelNewProject');
  const createBtn = document.getElementById('createProjectBtn');
  const presetGrid = document.getElementById('presetGrid');
  const presetFilterBtns = document.querySelectorAll('.preset-filter-btn');
  
  // 记录当前选中预设
  let selectedPreset: string | null = null;
  
  // 渲染预设选项
  function renderPresets(filter: string = 'all') {
    if (!presetGrid) return;
    
    presetGrid.innerHTML = '';
    
    const presets = Object.entries(PRESET_DISPLAY).filter(([_, preset]) => {
      if (filter === 'all') return true;
      return preset.type === filter;
    });
    
    presets.forEach(([key, preset]) => {
      const presetCard = document.createElement('div');
      presetCard.className = 'preset-card';
      presetCard.dataset.preset = key;
      presetCard.innerHTML = `
        <div class="preset-color" style="background: ${preset.primary};"></div>
        <span class="preset-label">${preset.label}</span>
      `;
      
      presetCard.addEventListener('click', () => {
        // 移除之前的选中状态
        document.querySelectorAll('.preset-card').forEach(card => {
          card.classList.remove('selected');
        });
        
        // 添加新的选中状态
        presetCard.classList.add('selected');
        
        // 设置所选的预设
        selectedPreset = key;
        
        // 自动切换模板类型(如果预设类型与当前类型不符)
        const selectedType = preset.type;
        const typeRadios = document.querySelectorAll('input[name="templateType"]') as NodeListOf<HTMLInputElement>;
        typeRadios.forEach(radio => {
          if (radio.value === selectedType) {
            radio.checked = true;
          }
        });
      });
      
      presetGrid.appendChild(presetCard);
    });
  }
  
  // 渲染初始预设
  renderPresets('all');
  
  // 绑定筛选事件
  presetFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetFilterBtns.forEach(b => b.classList.remove('active'));
      (btn as HTMLElement).classList.add('active');
      
      const filter = (btn as HTMLElement).dataset.filter;
      if (filter) {
        renderPresets(filter);
      }
    });
  });
  
  const closeModal = () => {
    modal!.classList.remove('active');
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  createBtn?.addEventListener('click', async () => {
    const nameInput = document.getElementById('projectNameInput') as HTMLInputElement;
    const projectName = nameInput?.value.trim();
    
    if (!projectName) {
      alert('请输入项目名称');
      return;
    }
    
    const templateType = document.querySelector('input[name="templateType"]:checked') as HTMLInputElement;
    if (!templateType) {
      alert('请选择模板类型');
      return;
    }
    
    // 创建项目时应用选中的预设
    let project;
    if (selectedPreset) {
      // 从colors/目录获取预设配色
      try {
        const response = await fetch(`/colors/${selectedPreset}.json`);
        if (response.ok) {
          const presetColors = await response.json();
          
          // 创建带预设配色的项目
          project = createProjectWithPreset(
            projectName, 
            templateType.value as 'light-ui' | 'dark-ui',
            presetColors,
            selectedPreset
          );
        } else {
          // 获取失败时使用默认配色
          project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
        }
      } catch {
        // 错误处理：使用默认项目
        project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
      }
    } else {
      project = createProject(projectName, templateType.value as 'light-ui' | 'dark-ui');
    }
    
    if (project) {
      closeModal();
      showWorkspace(project.id);
    }
  });
  
  modal.classList.add('active');
}

function getDefaultColors(): Record<string, string> {
  return {
    '--primary-color': '#2C615C',
    '--primary-color-hover': '#B2FFE6',
    '--alter-color': '#144E48',
    '--header-font-color': '#333333',
    '--auxiliary-gray': '#999999',
    '--body-bg-color': '#F8F8F8'
  };
}

function createProjectWithPreset(name: string, templateType: 'light-ui' | 'dark-ui', presetColors: Record<string, string>, presetId: string): Project | null {
  const id = Date.now().toString();
  
  // 合并默认颜色与预设颜色
  const defaultColors = getDefaultColors();
  const colors = { ...defaultColors, ...presetColors };
  
  // 从预设中获取主色调更新页面样式
  const primaryColor = colors['--primary-color'] || '#2C615C';
  document.documentElement.style.setProperty('--primary-color', primaryColor);
  
  const newProject: Project = {
    id,
    name,
    templateType,
    colors,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 同时保存为对应的预设（可重用）
  localStorage.setItem(`theme-studio-colors-${presetId}`, JSON.stringify(presetColors));
  
  return saveProject(newProject);
}

function createProject(name: string, templateType: 'light-ui' | 'dark-ui'): Project | null {
  const id = Date.now().toString();
  const newProject: Project = {
    id,
    name,
    templateType,
    colors: getDefaultColors(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  return saveProject(newProject);
}

function loadProject(id: string): Project | null {
  const projects = JSON.parse(localStorage.getItem('theme-studio-projects') || '[]') as Project[];
  return projects.find(p => p.id === id) || null;
}

function saveProject(project: Project): Project | null {
  project.updatedAt = Date.now();
  
  const projects = JSON.parse(localStorage.getItem('theme-studio-projects') || '[]') as Project[];
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  try {
    localStorage.setItem('theme-studio-projects', JSON.stringify(projects));
    return project;
  } catch (e) {
    console.error('Failed to save project:', e);
    return null;
  }
}

function listProjects(): Project[] {
  const projects = JSON.parse(localStorage.getItem('theme-studio-projects') || '[]') as Project[];
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteProject(id: string): boolean {
  try {
    const projects = JSON.parse(localStorage.getItem('theme-studio-projects') || '[]') as Project[];
    const filteredProjects = projects.filter(p => p.id !== id);
    localStorage.setItem('theme-studio-projects', JSON.stringify(filteredProjects));
    
    const currentProjectId = localStorage.getItem('theme-studio-current-project');
    if (currentProjectId === id) {
      localStorage.removeItem('theme-studio-current-project');
    }
    
    return true;
  } catch (e) {
    console.error('Failed to delete project:', e);
    return false;
  }
}

function populateHistoryProjects() {
  const projectsList = document.getElementById('projectsList');
  if (!projectsList) return;
  
  projectsList.innerHTML = '';
  
  const projects = listProjects();
  
  if (projects.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = '暂无历史项目';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.color = 'var(--auxiliary-gray)';
    emptyMessage.style.fontStyle = 'italic';
    emptyMessage.style.margin = '20px 0';
    projectsList.appendChild(emptyMessage);
    return;
  }
  
  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.innerHTML = `
      <div class="project-name">
        <span>🎨</span>
        <span>${project.name}</span>
      </div>
      <div class="project-date">${new Date(project.updatedAt).toLocaleString('zh-CN')}</div>
    `;
    
    projectCard.addEventListener('click', () => {
      showWorkspace(project.id);
    });
    
    projectsList.appendChild(projectCard);
  });
}

async function loadDefaultTemplates() {
  try {
    const loginTarget = document.getElementById('loginPage');
    const mainTarget = document.getElementById('mainPage');

    if (loginTarget) {
      await renderTemplate('login', loginTarget);
    }
    if (mainTarget) {
      await renderTemplate('desktop', mainTarget);
    }

    requestAnimationFrame(() => {
      (window as any).resizePreview?.();
    });
  } catch (e) {
    console.error('Failed to load templates:', (e as Error).message);
  }
}

async function loadPenFromFile(file: File) {
  try {
    const text = await file.text();
    const penJson = JSON.parse(text);
    console.warn('Pen file import is deprecated. Use native templates instead.', penJson);
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
  setupResizableDivider();
}

function setupResizableDivider() {
  const divider = document.getElementById('resizeDivider');
  const chatPanel = document.getElementById('chatPanel');
  if (!divider || !chatPanel) return;

  const appContainer = document.querySelector('.app-container') as HTMLElement;
  if (!appContainer) return;

  let isDragging = false;

  function updateDividerPosition() {
    const panelWidth = chatPanel!.offsetWidth;
    divider!.style.left = (panelWidth - 3) + 'px';
  }

  updateDividerPosition();

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newWidth = Math.max(260, Math.min(e.clientX, window.innerWidth - 420));
    chatPanel!.style.width = newWidth + 'px';
    updateDividerPosition();
    requestAnimationFrame(() => {
      (window as any).resizePreview?.();
    });
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  window.addEventListener('resize', () => {
    updateDividerPosition();
  });
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
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          addMessageToChat('user', `上传了参考图片: ${file.name}`);
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            
            try {
              const { analyzeImageAsync } = await import('./tools/executor');
              const result = await analyzeImageAsync(dataUrl);
              if (result.success && result.data) {
                const colors = result.data as { dominantColors: string[] };
                addMessageToChat('ai', `🎨 图片分析完成，提取到主色调：${colors.dominantColors.join(', ')}\n\n请在对话中告诉 AI "基于这张图片生成配色方案"，AI 将自动计算完整的 OA 主题配色。`);
              }
            } catch {
              addMessageToChat('ai', '⚠️ 图片已接收，但颜色分析失败。请直接描述您想要的配色风格。');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
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

    const availablePresets = getAvailablePresets();
    const systemPrompt = getSystemPrompt({
      templateType: 'dark-ui',
      currentColors: getCurrentColors(),
      availablePresets,
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
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const vars: Record<string, string> = {};
    const varNames = [
      'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
      'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
      'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
      'body-bg-color', 'login-bg-color', 'panel-bg-color',
      'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
      'border-color', 'border-icon-color',
      'gradient-start', 'gradient-mid',
    ];
    for (const v of varNames) {
      const val = computed.getPropertyValue(`--${v}`).trim();
      if (val) vars[v] = val;
    }
    return vars;
  }
}

const KNOWN_PRESETS = [
  'cherry-blossom', 'basketball-match', 'christmas', 'corporate-blue',
  'dark-ui-spring', 'dragon-boat', 'football-match', 'gaokao',
  'ice-wonderland', 'interstellar', 'mid-autumn', 'mount-tai-summit',
  'national-day', 'qingming', 'spring-festival', 'summer-cool',
  'watermelon-harvest', 'winter-solstice', 'women-day', 'work-hard',
  'childrens-day', '1024', '20th-anniversary', 'dragon-boat-fresh',
  'happy-xishuangbanna', 'maldives-vacation', 'national-day-dark',
  'national-day-generated', 'overtime-worker', 'panda-night',
  'peach-blossom', 'sanya', 'shenergy-enterprise', 'superman-superhero',
  'yellow-duck',
];

const PRESET_DISPLAY: Record<string, { label: string; primary: string; type: string }> = {
  'basketball-match': { label: '🏀 篮球对抗赛', primary: '#F07828', type: 'light-ui' },
  'cherry-blossom': { label: '🌸 樱花', primary: '#E8B4C8', type: 'light-ui' },
  'christmas': { label: '🎄 圣诞节', primary: '#E53935', type: 'light-ui' },
  'corporate-blue': { label: '💼 企业蓝', primary: '#1565C0', type: 'light-ui' },
  'dark-ui-spring': { label: '🌙 暗夜春色', primary: '#4A3F6B', type: 'dark-ui' },
  'dragon-boat': { label: '🐉 端午节', primary: '#2E7D32', type: 'light-ui' },
  'dragon-boat-fresh': { label: '🌿 端午清新', primary: '#4CAF50', type: 'light-ui' },
  'football-match': { label: '⚽ 足球赛', primary: '#2E7D32', type: 'light-ui' },
  'gaokao': { label: '📝 高考', primary: '#1565C0', type: 'light-ui' },
  'ice-wonderland': { label: '❄️ 冰雪世界', primary: '#00ACC1', type: 'light-ui' },
  'interstellar': { label: '🚀 星际', primary: '#311B92', type: 'dark-ui' },
  'mid-autumn': { label: '🌕 中秋', primary: '#FF9800', type: 'light-ui' },
  'mount-tai-summit': { label: '🏔️ 泰山', primary: '#5D4037', type: 'light-ui' },
  'national-day': { label: '🇨🇳 国庆节', primary: '#C62828', type: 'light-ui' },
  'national-day-dark': { label: '🇨🇳 国庆暗色', primary: '#8B1A1A', type: 'dark-ui' },
  'qingming': { label: '🍃 清明', primary: '#7BA894', type: 'light-ui' },
  'spring-festival': { label: '🧨 春节', primary: '#D32F2F', type: 'light-ui' },
  'summer-cool': { label: '🌤️ 夏日清凉', primary: '#00ACC1', type: 'light-ui' },
  'watermelon-harvest': { label: '🍉 西瓜丰收', primary: '#388E3C', type: 'light-ui' },
  'winter-solstice': { label: '❄️ 冬至', primary: '#455A64', type: 'light-ui' },
  'women-day': { label: '💐 妇女节', primary: '#E91E63', type: 'light-ui' },
  'work-hard': { label: '💪 加油干', primary: '#F57C00', type: 'light-ui' },
  'childrens-day': { label: '🎈 儿童节', primary: '#FF9800', type: 'light-ui' },
  '1024': { label: '💻 程序员节', primary: '#6366F1', type: 'light-ui' },
  '20th-anniversary': { label: '🎂 廿周年', primary: '#B8860B', type: 'light-ui' },
  'happy-xishuangbanna': { label: '🌴 西双版纳', primary: '#2E7D32', type: 'light-ui' },
  'maldives-vacation': { label: '🏝️ 马尔代夫', primary: '#00ACC1', type: 'light-ui' },
  'national-day-generated': { label: '🇨🇳 国庆AI', primary: '#C62828', type: 'light-ui' },
  'overtime-worker': { label: '🏢 深夜加班', primary: '#2D3A4A', type: 'dark-ui' },
  'panda-night': { label: '🐼 熊猫夜晚', primary: '#4A3F6B', type: 'dark-ui' },
  'peach-blossom': { label: '🍑 桃花', primary: '#E8B4C8', type: 'light-ui' },
  'sanya': { label: '🏖️ 三亚', primary: '#00BCD4', type: 'light-ui' },
  'shenergy-enterprise': { label: '🏭 申能企业', primary: '#1565C0', type: 'light-ui' },
  'superman-superhero': { label: '🦸 超级英雄', primary: '#BF613F', type: 'light-ui' },
  'yellow-duck': { label: '🐥 小黄鸭', primary: '#FDD835', type: 'light-ui' },
};

function getAvailablePresets(): string[] {
  const saved = Object.keys(localStorage)
    .filter(k => k.startsWith('theme-studio-colors-'))
    .map(k => k.replace('theme-studio-colors-', ''));
  return [...new Set([...KNOWN_PRESETS, ...saved])];
}

function setupCollapsibleColorPanel() {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const panelToggleBtn = document.getElementById('panelToggleBtn') as HTMLButtonElement;
  const sidePanelClose = document.getElementById('sidePanelClose') as HTMLButtonElement;
  
  if (!appContainer || !sidePanel || !panelToggleBtn) {
    console.error('Panel toggle elements not found');
    return;
  }
  
  panelToggleBtn.addEventListener('click', () => {
    appContainer.classList.toggle('panel-open');
    sidePanel.classList.toggle('open');
    
    // 更新按钮文本
    if(appContainer.classList.contains('panel-open')) {
      panelToggleBtn.textContent = '收起面板';
    } else {
      panelToggleBtn.textContent = '面板';
    }
  });
  
  if (sidePanelClose) {
    sidePanelClose.addEventListener('click', () => {
      appContainer.classList.remove('panel-open');
      sidePanel.classList.remove('open');
      panelToggleBtn.textContent = '面板'; // 重置按钮文本
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
  // 设置打包按钮事件监听
  const packageBtn = document.getElementById('packageBtn');
  if (packageBtn) {
    packageBtn.addEventListener('click', showPackageModal);
  }
  
  // 初始化打包弹窗相关事件
  initializePackageModal();
}

// 打包弹窗常量
const PACKAGE_PRODUCTS = [
  { id: 'mk-theme', label: 'MK 主题包' },
  { id: 'mk-login', label: 'MK 登录包' },
  { id: 'v12-theme', label: 'EKP V12 主题包' },
  { id: 'v12-login', label: 'EKP V12 登录包' },
  { id: 'v13_5-theme', label: 'EKP V13.5 主题包' },
  { id: 'v13_5-login', label: 'EKP V13.5 登录包' },
  { id: 'v13_5-login-variant', label: 'EKP V13.5 登录包(变体)' },
  { id: 'v13_5-login-alt', label: 'EKP V13.5 登录包(备选)' },
  { id: 'v14_16-theme', label: 'EKP V14.16 主题包' },
  { id: 'v14-login', label: 'EKP V14 登录包' },
  { id: 'v15-login', label: 'EKP V15 登录包' },
  { id: 'v16-login', label: 'EKP V16 登录包' },
  { id: 'v14_16-login', label: 'EKP V14.16 登录包' },
  { id: 'v17-theme', label: 'EKP V17 主题包' },
  { id: 'v17-login', label: 'EKP V17 登录包' },
];

// 显示打包弹窗
function showPackageModal() {
  const modal = document.getElementById('packageModal');
  if (!modal) {
    console.error('Package modal not found');
    return;
  }
  
  // 生成产品选择复选框列表
  generateProductList();
  
  modal.classList.add('active');
}

// 生成产品列表
function generateProductList() {
  const productList = document.getElementById('packageProductList');
  if (!productList) {
    console.error('Product list container not found');
    return;
  }
  
  productList.innerHTML = '';
  
  PACKAGE_PRODUCTS.forEach(product => {
    const label = document.createElement('label');
    label.className = 'product-item';
    label.innerHTML = `
      <input type="checkbox" id="${product.id}_cb" value="${product.id}">
      <span>${product.label}</span>
    `;
    productList.appendChild(label);
  });
  
  // 绑定全选/不选事件
  bindSelectAllButtons();
}

// 绑定全选/取消全选按钮事件
function bindSelectAllButtons() {
  const selectAllBtn = document.getElementById('packageSelectAll');
  const deselectAllBtn = document.getElementById('packageDeselectAll');
  
  if (selectAllBtn) {
    selectAllBtn.removeEventListener('click', handleSelectAll); // 确保只添加一次listener
    selectAllBtn.addEventListener('click', handleSelectAll);
  }
  
  if (deselectAllBtn) {
    deselectAllBtn.removeEventListener('click', handleDeselectAll); // 确保只添加一次listener
    deselectAllBtn.addEventListener('click', handleDeselectAll);
  }
}

// 处理全选
function handleSelectAll() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]');
  checkboxes.forEach(cb => cb.checked = true);
}

// 处理取消全选
function handleDeselectAll() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]');
  checkboxes.forEach(cb => cb.checked = false);
}

// 初始化打包弹窗事件监听
function initializePackageModal() {
  // 关闭弹窗相关操作
  const modal = document.getElementById('packageModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('packageModalClose');
  const cancelBtn = document.getElementById('packageCancelBtn');
  const startBtn = document.getElementById('packageStartBtn');
  
  // 点击关闭按钮
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePackageModal();
    });
  }
  
  // 点击取消按钮
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closePackageModal();
    });
  }
  
  // 点击开始打包按钮
  if (startBtn) {
    startBtn.addEventListener('click', startPackagingProcess);
  }
  
  // 点击蒙层关闭弹窗
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePackageModal();
    }
  });
}

// 关闭打包弹窗
function closePackageModal() {
  const modal = document.getElementById('packageModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// 开始打包流程
async function startPackagingProcess() {
  const startBtn = document.getElementById('packageStartBtn') as HTMLButtonElement; 
  if(startBtn) {
    startBtn.textContent = '打包中...';
    startBtn.disabled = true;
  }
  
  try {
    // 获取选中的产品
    const selectedProducts: string[] = [];
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id$="_cb"]'); 
    
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedProducts.push(checkbox.value);
      }
    });
    
    if (selectedProducts.length === 0) {
      showNotification('请至少选择一个产品进行打包');
      return;
    }
    
    // 收集当前颜色配置
    const vars = getAllCSSVariables();
    const primary = vars['primary-color'] || '#2C615C';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // 生成构建YAML文件，使用自定义的产品列表
    const yamlContent = generateBuildYaml({
      name: '当前主题',
      nameEng: 'current-theme',
      themeColor: primary,
      vars,
      products: selectedProducts
    });
    
    // 生成颜色配置JSON
    const colorJson = JSON.stringify({
      name: '当前主题',
      nameEng: 'current-theme',
      templateType: 'dark-ui',
      ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v])),
    }, null, 2);
    
    // 创建并下载两个文件
    const yamlBlob = new Blob([yamlContent], { type: 'text/yaml' });
    const jsonBlob = new Blob([colorJson], { type: 'application/json' });
    
    downloadBlob(yamlBlob, `theme-build-request-${date}.yaml`);
    downloadBlob(jsonBlob, `color-config-${date}.json`);
    
    showNotification(`✅ 打包配置已完成！已导出${selectedProducts.length}个产品的配置`);
    
    // 延迟一点时间再关闭，让用户看到通知
    setTimeout(() => {
      closePackageModal();
      const btn = document.getElementById('packageStartBtn') as HTMLButtonElement;
      if(btn) {
        btn.textContent = '开始打包';
        btn.disabled = false;
      }
    }, 1000);
  } catch (e) {
    showNotification(`❌ 打包失败: ${(e as Error).message}`);
    const btn = document.getElementById('packageStartBtn') as HTMLButtonElement;
    if(btn) {
      btn.textContent = '开始打包';
      btn.disabled = false;
    }
  }
}

function getAllCSSVariables(): Record<string, string> {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const vars: Record<string, string> = {};
  const varNames = [
    'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
    'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
    'header-font-color', 'auxiliary-gray', 'auxiliary-gray-dark',
    'body-bg-color', 'login-bg-color', 'panel-bg-color',
    'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color',
    'border-color', 'border-icon-color',
    'gradient-start', 'gradient-mid',
  ];
  for (const v of varNames) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) vars[v] = val;
  }
  return vars;
}

function generateBuildYaml(opts: { name: string; nameEng: string; themeColor: string; vars: Record<string, string>; products?: string[] }): string {
  let yaml = '';
  yaml += `title: "${opts.name}"\n`;
  yaml += `subtitle: "${opts.name}"\n`;
  yaml += `buttonText: "立即进入"\n`;
  yaml += `themeColor: "${opts.themeColor}"\n`;
  yaml += `products:\n`;
  
  // 使用传入的产品列表，如果未提供则使用默认列表
  const products = opts.products || [
    'mk',
    'ekp_v12',
    'ekp_v13_5', 
    'ekp_v14_16',
    'ekp_v17'
  ];
  
  for (const product of products) {
    yaml += `  - ${product}\n`;
  }
  
  yaml += `images:\n`;
  yaml += `  headerBanner: "header-banner.png"\n`;
  yaml += `  headerClassic: "header_complex_frame_bg.png"\n`;
  yaml += `  headerSimple: "header_tlayout_frame_bg.png"\n`;
  yaml += `  headerTabs: "header_tlayout_frame_bg.png"\n`;
  yaml += `  headerIcon: "header_tlayout_frame_bg.png"\n`;
  yaml += `  headerSideheader: "header-sideheader.png"\n`;
  yaml += `  loginBackground: "bg-login.jpg"\n`;
  yaml += `  loginLogo: ""\n`;
  yaml += `colors:\n`;

  for (const [key, value] of Object.entries(opts.vars)) {
    yaml += `  ${key}: "${value}"\n`;
  }

  return yaml;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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