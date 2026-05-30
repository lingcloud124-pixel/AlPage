import type {
  ExportBatch,
  PortalCustomerProfile,
  PortalDraft,
  PortalPlan,
  PortalPlanStatus,
  PortalResultState,
  PortalSummary,
  ServerExportJob,
  WorkspaceConfig,
  WorkspaceItem,
  WorkspaceSettings,
} from './types';
import { DEFAULT_LIGHT_UI_PRIMARY, deriveColorsFromPrimary, toCssVarRecord } from './theme/color-utils';
import type { ProjectVisualContext } from './tools/project-visual-context-store';
import { ensureProjectWorkspaceReady } from './workspace/store';

const _projects = new Map<string, Project>();

export interface Project {
  id: string;
  name: string;
  nameEn?: string;
  themeName?: string;
  lifecycle?: 'draft' | 'active';
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: ProjectVisualContext;
  portalProfile?: PortalCustomerProfile;
  portalSummary?: PortalSummary;
  portalDraft?: PortalDraft;
  portalResult?: PortalResultState;
  portalPlan?: PortalPlan;
  portalPlanStatus?: PortalPlanStatus;
  workspace?: WorkspaceConfig;
  serverExportJobs?: ServerExportJob[];
  exportBatches?: ExportBatch[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  columns: 4,
  rowHeight: 24,
  gapX: 16,
  gapY: 16,
  paddingX: 20,
  paddingY: 20,
  maxWidth: 1440,
  backgroundMode: 'theme',
};

export const DEFAULT_WORKSPACE_ITEMS: WorkspaceItem[] = [
  { id: 'workspace-card-message-todo', templateId: 'message-todo', x: 0, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { id: 'workspace-card-news-carousel', templateId: 'news-carousel', x: 2, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { id: 'workspace-card-my-schedule', templateId: 'my-schedule', x: 0, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
  { id: 'workspace-card-quick-access', templateId: 'quick-access', x: 2, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
];

const DEFAULT_WORKSPACE_LAYOUT_SLOTS = [
  { x: 0, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { x: 2, y: 0, w: 2, h: 14, minW: 2, minH: 12 },
  { x: 0, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
  { x: 2, y: 14, w: 2, h: 12, minW: 1, minH: 12 },
] as const;

export function createWorkspaceConfigFromPortalDraft(portalDraft: PortalDraft): WorkspaceConfig {
  const now = Date.now();
  return {
    settings: DEFAULT_WORKSPACE_SETTINGS,
    items: portalDraft.workspaceSeed.map((seed, index) => ({
      id: `workspace-card-${seed.templateId}-${index + 1}`,
      templateId: seed.templateId,
      ...DEFAULT_WORKSPACE_LAYOUT_SLOTS[index % DEFAULT_WORKSPACE_LAYOUT_SLOTS.length],
      instanceProps: {
        ...(seed.title ? { title: seed.title } : {}),
        ...(seed.summary ? { summary: seed.summary } : {}),
        ...(seed.badge ? { badge: seed.badge } : {}),
        ...(seed.headline ? { headline: seed.headline } : {}),
        ...(typeof seed.itemCount === 'number' ? { itemCount: seed.itemCount } : {}),
        ...(seed.items ? { items: seed.items } : {}),
        ...(seed.links ? { links: seed.links } : {}),
      },
    })),
    meta: {
      initializedAt: now,
      updatedAt: now,
      source: 'portal-draft',
    },
  };
}

function createDefaultWorkspaceConfig(portalDraft?: PortalDraft | null): WorkspaceConfig {
  if (portalDraft?.workspaceSeed?.length) {
    return createWorkspaceConfigFromPortalDraft(portalDraft);
  }
  const now = Date.now();
  return {
    settings: DEFAULT_WORKSPACE_SETTINGS,
    items: DEFAULT_WORKSPACE_ITEMS.map((item) => ({ ...item })),
    meta: {
      initializedAt: now,
      updatedAt: now,
      source: 'default',
    },
  };
}

export function applyPortalDraftToProject(project: Project, portalDraft: PortalDraft): Project {
  const workspace = createWorkspaceConfigFromPortalDraft(portalDraft);
  return {
    ...project,
    portalDraft,
    workspace,
    updatedAt: Date.now(),
  };
}

export interface ProjectMutationError {
  status?: number;
  code?: string;
  message: string;
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
let _lastProjectMutationError: ProjectMutationError | null = null;
export function getCurrentProjectId() {
  return _currentProjectId ?? localStorage.getItem('theme-studio-current-project');
}
export function setCurrentProjectId(id: string | null) {
  _currentProjectId = id;
  if (id) localStorage.setItem('theme-studio-current-project', id);
  else localStorage.removeItem('theme-studio-current-project');
}

export function getLastProjectMutationError(): ProjectMutationError | null {
  return _lastProjectMutationError;
}

export function getProjectThemeLabel(project: Pick<Project, 'themeName' | 'name'>): string {
  return project.themeName?.trim() || project.name?.trim() || '未命名门户';
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

export async function createProject(name: string, templateType: 'light-ui' | 'dark-ui', trackProjectCreated?: () => void): Promise<Project | null> {
  const id = Date.now().toString();
  const newProject: Project = {
    id,
    name,
    lifecycle: 'draft',
    templateType,
    colors: {},
    workspace: createDefaultWorkspaceConfig(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  trackProjectCreated?.();
  const hydratedWorkspace = await ensureProjectWorkspaceReady(newProject.id, newProject.workspace);
  newProject.workspace = hydratedWorkspace ?? newProject.workspace;
  _projects.set(id, newProject);
  return newProject;
}

export async function createProjectWithPreset(name: string, templateType: 'light-ui' | 'dark-ui', presetColors: Record<string, string>, presetId: string): Promise<Project | null> {
  const id = Date.now().toString();
  const defaultColors = getDefaultColors();
  const colors = { ...defaultColors, ...presetColors };

  const newProject: Project = {
    id,
    name,
    lifecycle: 'active',
    templateType,
    colors,
    workspace: createDefaultWorkspaceConfig(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  localStorage.setItem(`theme-studio-colors-${presetId}`, JSON.stringify(presetColors));
  const hydratedWorkspace = await ensureProjectWorkspaceReady(newProject.id, newProject.workspace);
  newProject.workspace = hydratedWorkspace ?? newProject.workspace;
  _projects.set(id, newProject);
  return newProject;
}

export function markPortalResultSaved(project: Project): Project {
  const savedAt = Date.now();
  return {
    ...project,
    portalPlan: project.portalPlan
      ? {
          ...project.portalPlan,
          status: 'saved',
          updatedAt: savedAt,
        }
      : project.portalPlan,
    portalPlanStatus: 'saved',
    portalResult: {
      ...project.portalResult,
      savedAt,
    },
    updatedAt: savedAt,
  };
}

export function markPortalResultShared(project: Project): Project {
  return {
    ...project,
    portalResult: {
      ...project.portalResult,
      sharedAt: Date.now(),
    },
    updatedAt: Date.now(),
  };
}

export function markPortalResultFullscreenViewed(project: Project): Project {
  return {
    ...project,
    portalResult: {
      ...project.portalResult,
      fullscreenViewedAt: Date.now(),
    },
    updatedAt: Date.now(),
  };
}

export async function loadProject(id: string): Promise<Project | null> {
  return _projects.get(id) ?? null;
}

export async function saveProject(project: Project): Promise<Project | null> {
  if (!project.lifecycle) {
    project.lifecycle = 'draft';
  }
  project.updatedAt = Date.now();
  _projects.set(project.id, project);
  return project;
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
  'dragon-boat': { label: '🐉 端午节', primary: '#2F6B45', type: 'light-ui' },
  'dragon-boat-fresh': { label: '🌿 端午清新', primary: '#4FA56B', type: 'light-ui' },
  'football-match': { label: '⚽ 足球赛', primary: '#2E7D32', type: 'light-ui' },
  'gaokao': { label: '📝 高考', primary: '#1565C0', type: 'light-ui' },
  'ice-wonderland': { label: '❄️ 冰雪世界', primary: '#00ACC1', type: 'light-ui' },
  'interstellar': { label: '🚀 星际', primary: '#311B92', type: 'dark-ui' },
  'mid-autumn': { label: '🌕 中秋', primary: '#FF9800', type: 'light-ui' },
  'mount-tai-summit': { label: '🏔️ 泰山', primary: '#5D4037', type: 'light-ui' },
  'national-day': { label: '🇨🇳 国庆节', primary: '#C62828', type: 'light-ui' },
  'national-day-dark': { label: '🇨🇳 国庆暗色', primary: '#8B1A1A', type: 'dark-ui' },
  'qingming': { label: '🍃 清明', primary: '#5F9B78', type: 'light-ui' },
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
  const allPresets = [...KNOWN_PRESETS, ...saved];
  return Array.from(new Set(allPresets));
}

export function restoreFromSnapshot(snapshot: Record<string, unknown>): void {
  if (!snapshot || !snapshot.id) return;
  const project = snapshot as unknown as Project;
  project.workspace ??= createDefaultWorkspaceConfig(project.portalDraft);
  project.updatedAt = Date.now();
  _projects.set(project.id, project);
  setCurrentProjectId(project.id);
  updateProjectNameDisplay(project);
}
