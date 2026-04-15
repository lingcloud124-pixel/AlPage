import type { ChatMessage, ExportBatch } from './types';
import { DEFAULT_LIGHT_UI_PRIMARY, deriveColorsFromPrimary, toCssVarRecord } from './theme/color-utils';

export interface Project {
  id: string;
  name: string;
  nameEn?: string;
  themeName?: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  exportBatches?: ExportBatch[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

let _currentProjectId: string | null = null;
export function getCurrentProjectId() { return _currentProjectId; }
export function setCurrentProjectId(id: string | null) {
  _currentProjectId = id;
  if (id) localStorage.setItem('theme-studio-current-project', id);
  else localStorage.removeItem('theme-studio-current-project');
}

export function getProjectThemeLabel(project: Pick<Project, 'themeName' | 'name'>): string {
  return project.themeName?.trim() || 'AI主题';
}

export function updateProjectNameDisplay(project: Project): void {
  const projectNameEl = document.getElementById('projectName');
  if (projectNameEl) projectNameEl.textContent = getProjectThemeLabel(project);
  const chatProjectName = document.getElementById('chatProjectName');
  if (chatProjectName) chatProjectName.textContent = project.name;
}

export function getDefaultColors(): Record<string, string> {
  return toCssVarRecord(deriveColorsFromPrimary(DEFAULT_LIGHT_UI_PRIMARY, 'light-ui'));
}

export function createProject(name: string, templateType: 'light-ui' | 'dark-ui', trackProjectCreated?: () => void): Project | null {
  const id = Date.now().toString();
  const newProject: Project = {
    id,
    name,
    templateType,
    colors: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  trackProjectCreated?.();
  return saveProject(newProject);
}

export function createProjectWithPreset(name: string, templateType: 'light-ui' | 'dark-ui', presetColors: Record<string, string>, presetId: string): Project | null {
  const id = Date.now().toString();
  const defaultColors = getDefaultColors();
  const colors = { ...defaultColors, ...presetColors };
  const primaryColor = colors['--primary-color'] || '#2C615C';

  const newProject: Project = {
    id,
    name,
    templateType,
    colors,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  localStorage.setItem(`theme-studio-colors-${presetId}`, JSON.stringify(presetColors));
  return saveProject(newProject);
}

export function loadProject(id: string): Project | null {
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
  return projects.find(p => p.id === id) || null;
}

export function saveProject(project: Project): Project | null {
  project.updatedAt = Date.now();
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
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

export function listProjects(): Project[] {
  const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteProject(id: string): boolean {
  try {
    const projects = safeJsonParse<Project[]>(localStorage.getItem('theme-studio-projects'), []);
    const filteredProjects = projects.filter(p => p.id !== id);
    localStorage.setItem('theme-studio-projects', JSON.stringify(filteredProjects));
    const cur = localStorage.getItem('theme-studio-current-project');
    if (cur === id) localStorage.removeItem('theme-studio-current-project');
    return true;
  } catch (e) {
    console.error('Failed to delete project:', e);
    return false;
  }
}

export const KNOWN_PRESETS = [
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

export const PRESET_DISPLAY: Record<string, { label: string; primary: string; type: string }> = {
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

export const PRESET_BACKGROUNDS: Record<string, string> = {
  'cherry-blossom': '/backgrounds/cherry-blossom-bg.png',
  'peach-blossom': '/backgrounds/cherry-blossom-bg.png',
  'ice-wonderland': '/backgrounds/ice-wonderland-bg.png',
  'interstellar': '/backgrounds/interstellar-bg.png',
  'maldives-vacation': '/backgrounds/maldives-vacation-bg.png',
  'mount-tai-summit': '/backgrounds/mount-tai-summit-bg.png',
  'national-day': '/backgrounds/national-day-bg.png',
  'national-day-dark': '/backgrounds/national-day-bg.png',
  'national-day-generated': '/backgrounds/national-day-bg.png',
  'overtime-worker': '/backgrounds/overtime-worker-bg.png',
  'panda-night': '/backgrounds/panda-night-bg.png',
  'winter-solstice': '/backgrounds/winter-solstice-bg.jpg',
  'qingming': '/backgrounds/qingming-bg.png',
  'work-hard': '/backgrounds/work-hard-bg.jpg',
  'gaokao': '/backgrounds/gaokao-bg.png',
  'childrens-day': '/backgrounds/childrens-day-bg.png',
  'summer-cool': '/backgrounds/maldives-vacation-bg.png',
  'dark-ui-spring': '/backgrounds/panda-night-bg.png',
  'dragon-boat': '/backgrounds/qingming-bg.png',
  'dragon-boat-fresh': '/backgrounds/qingming-bg.png',
  'spring-festival': '/backgrounds/national-day-bg.png',
  'basketball-match': '/backgrounds/work-hard-bg.jpg',
  'football-match': '/backgrounds/work-hard-bg.jpg',
  'watermelon-harvest': '/backgrounds/maldives-vacation-bg.png',
  'sanya': '/backgrounds/maldives-vacation-bg.png',
  'happy-xishuangbanna': '/backgrounds/maldives-vacation-bg.png',
  'women-day': '/backgrounds/cherry-blossom-bg.png',
  'superman-superhero': '/backgrounds/interstellar-bg.png',
  'corporate-blue': '/backgrounds/mount-tai-summit-bg.png',
  'shenergy-enterprise': '/backgrounds/mount-tai-summit-bg.png',
  '20th-anniversary': '/backgrounds/winter-solstice-bg.jpg',
  '1024': '/backgrounds/interstellar-bg.png',
  'yellow-duck': '/backgrounds/childrens-day-bg.png',
};

export function getAvailablePresets(): string[] {
  const saved = Object.keys(localStorage)
    .filter(k => k.startsWith('theme-studio-colors-'))
    .map(k => k.replace('theme-studio-colors-', ''));
  return [...new Set([...KNOWN_PRESETS, ...saved])];
}

export interface SidebarDeps {
  showWorkspace: (projectId: string) => void;
  createProject: (name: string, templateType: 'light-ui' | 'dark-ui') => Project | null;
}

export function populateSidebarProjects(deps: SidebarDeps) {
  const sidebarProjectList = document.getElementById('sidebarProjectList');
  if (!sidebarProjectList) return;
  sidebarProjectList.innerHTML = '';
  const projects = listProjects();

  if (projects.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = '暂无历史项目';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.color = 'rgba(255,255,255,0.5)';
    emptyMessage.style.fontStyle = 'italic';
    emptyMessage.style.margin = '20px 0';
    sidebarProjectList.appendChild(emptyMessage);
    return;
  }

  const pinned = projects.filter(p => p.pinned);
  const unpinned = projects.filter(p => !p.pinned);

  if (pinned.length > 0) {
    const pinnedHeader = document.createElement('div');
    pinnedHeader.className = 'sidebar-section-label';
    pinnedHeader.textContent = '置顶项目';
    sidebarProjectList.appendChild(pinnedHeader);
    pinned.forEach(p => sidebarProjectList.appendChild(createProjectItem(p, deps)));
  }
  if (unpinned.length > 0) {
    const historyHeader = document.createElement('div');
    historyHeader.className = 'sidebar-section-label';
    historyHeader.textContent = '历史项目';
    sidebarProjectList.appendChild(historyHeader);
    unpinned.forEach(p => sidebarProjectList.appendChild(createProjectItem(p, deps)));
  }
}

function createProjectItem(project: Project, deps: SidebarDeps): HTMLElement {
  const projectItem = document.createElement('div');
  projectItem.className = 'sidebar-project-item';
  projectItem.title = project.name;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'sidebar-project-name';
  nameSpan.textContent = project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name;

  const menuBtn = document.createElement('button');
  menuBtn.className = 'sidebar-project-menu-btn';
  menuBtn.textContent = '⋯';
  menuBtn.title = '更多操作';

  const currentPid = localStorage.getItem('theme-studio-current-project');
  if (currentPid === project.id) {
    projectItem.classList.add('active');
  }

  nameSpan.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-project-item').forEach(item => item.classList.remove('active'));
    projectItem.classList.add('active');
    closeAllProjectMenus();
    deps.showWorkspace(project.id);
  });

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllProjectMenus();
    const existing = projectItem.querySelector('.sidebar-project-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.className = 'sidebar-project-menu';

    const pinToggle = document.createElement('div');
    pinToggle.className = 'sidebar-project-menu-item';
    pinToggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 22"/><path d="M17 7L7 7"/><path d="M15 2L9 2"/><path d="M18 22L6 22"/></svg> ${project.pinned ? '取消置顶' : '置顶'}`;
    pinToggle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      project.pinned = !project.pinned;
      saveProject(project);
      closeAllProjectMenus();
      populateSidebarProjects(deps);
    });

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'sidebar-project-menu-item sidebar-project-menu-delete';
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 删除`;
    deleteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (confirm(`确定删除「${project.name}」吗？`)) {
        deleteProject(project.id);
        closeAllProjectMenus();
        if (currentPid === project.id) {
          const remaining = listProjects();
          if (remaining.length > 0) {
            deps.showWorkspace(remaining[0].id);
          } else {
            const newProj = deps.createProject('未命名项目', 'light-ui');
            if (newProj) deps.showWorkspace(newProj.id);
          }
        }
        populateSidebarProjects(deps);
      }
    });

    menu.appendChild(pinToggle);
    menu.appendChild(deleteBtn);
    projectItem.appendChild(menu);
  });

  projectItem.appendChild(nameSpan);
  projectItem.appendChild(menuBtn);
  return projectItem;
}

export function closeAllProjectMenus() {
  document.querySelectorAll('.sidebar-project-menu').forEach(m => m.remove());
}
