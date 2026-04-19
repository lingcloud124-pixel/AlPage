import type { ThemeScenePlan } from './theme-scene-planner';

export interface ProjectVisualContext {
  projectId: string;
  mustHaveElements: string[];
  avoidElements: string[];
  latestAcceptedScenePlan?: ThemeScenePlan;
  temporaryAdjustments: string[];
  updatedAt: number;
}

const STORAGE_KEY = 'theme-agent-project-visual-contexts';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contexts));
}

export function createDefaultProjectVisualContext(projectId: string): ProjectVisualContext {
  return {
    projectId,
    mustHaveElements: [],
    avoidElements: [],
    latestAcceptedScenePlan: undefined,
    temporaryAdjustments: [],
    updatedAt: Date.now(),
  };
}

export function loadProjectVisualContext(projectId: string): ProjectVisualContext {
  const contexts = readAllContexts();
  return contexts[projectId] ?? createDefaultProjectVisualContext(projectId);
}

export function saveProjectVisualContext(context: ProjectVisualContext): ProjectVisualContext {
  const contexts = readAllContexts();
  const next: ProjectVisualContext = {
    ...context,
    updatedAt: Date.now(),
  };
  contexts[next.projectId] = next;
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
  writeAllContexts(contexts);
}
