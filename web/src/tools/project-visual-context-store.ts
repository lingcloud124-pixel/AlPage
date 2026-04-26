import type { ThemeScenePlan } from './theme-scene-planner';

export interface ProjectVisualContext {
  projectId: string;
  mustHaveElements: string[];
  avoidElements: string[];
  latestAcceptedScenePlan?: ThemeScenePlan;
  temporaryAdjustments: string[];
  imageInput?: {
    dataUrl: string;
    role: 'primary' | 'reference';
    sourceText?: string;
    explicitReason?: string;
    updatedAt: number;
  };
  updatedAt: number;
}

const STORAGE_KEY = 'theme-agent-project-visual-contexts';
const runtimeImageDataUrls = new Map<string, string>();

function sanitizeForStorage(context: ProjectVisualContext): ProjectVisualContext {
  const imageInput = context.imageInput
    ? {
        ...context.imageInput,
        dataUrl: '',
      }
    : undefined;

  return {
    ...context,
    imageInput,
  };
}

function readAllContexts(): Record<string, ProjectVisualContext> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ProjectVisualContext>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllContexts(contexts: Record<string, ProjectVisualContext>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contexts));
  } catch (error) {
    console.warn('[project-visual-context-store] Failed to persist visual contexts:', error);
  }
}

export function createDefaultProjectVisualContext(projectId: string): ProjectVisualContext {
  return {
    projectId,
    mustHaveElements: [],
    avoidElements: [],
    latestAcceptedScenePlan: undefined,
    temporaryAdjustments: [],
    imageInput: undefined,
    updatedAt: Date.now(),
  };
}

export function loadProjectVisualContext(projectId: string): ProjectVisualContext {
  const contexts = readAllContexts();
  const persisted = contexts[projectId] ?? createDefaultProjectVisualContext(projectId);
  const runtimeDataUrl = runtimeImageDataUrls.get(projectId);
  if (!persisted.imageInput || !runtimeDataUrl) return persisted;
  return {
    ...persisted,
    imageInput: {
      ...persisted.imageInput,
      dataUrl: runtimeDataUrl,
    },
  };
}

export function saveProjectVisualContext(context: ProjectVisualContext): ProjectVisualContext {
  const contexts = readAllContexts();
  const next: ProjectVisualContext = {
    ...context,
    updatedAt: Date.now(),
  };
  if (next.imageInput?.dataUrl) {
    runtimeImageDataUrls.set(next.projectId, next.imageInput.dataUrl);
  } else {
    runtimeImageDataUrls.delete(next.projectId);
  }
  contexts[next.projectId] = sanitizeForStorage(next);
  writeAllContexts(contexts);
  return next;
}

export function updateProjectVisualContext(
  projectId: string,
  patch: Partial<Omit<ProjectVisualContext, 'projectId' | 'updatedAt'>>,
): ProjectVisualContext {
  const current = loadProjectVisualContext(projectId);
  const next: ProjectVisualContext = {
    ...current,
    ...patch,
    projectId,
    updatedAt: Date.now(),
  };
  return saveProjectVisualContext(next);
}

export function deleteProjectVisualContext(projectId: string): void {
  const contexts = readAllContexts();
  if (!contexts[projectId]) return;
  delete contexts[projectId];
  runtimeImageDataUrls.delete(projectId);
  writeAllContexts(contexts);
}
