import type { Project } from './project-manager';

export interface WorkspaceRecoveryDeps {
  listProjects: () => Promise<Project[]>;
  createProject: (name: string, templateType: 'light-ui' | 'dark-ui') => Promise<Project | null>;
}

export interface WorkspaceRecoveryResult {
  project: Project | null;
  reason: 'fallback' | 'created' | 'missing';
}

export async function pickFallbackWorkspaceProject(
  missingProjectId: string,
  deps: WorkspaceRecoveryDeps,
): Promise<WorkspaceRecoveryResult> {
  const projects = await deps.listProjects();
  const fallbackProject = projects.find((item) => item.id !== missingProjectId) ?? null;

  if (fallbackProject) {
    return {
      project: fallbackProject,
      reason: 'fallback',
    };
  }

  const createdProject = await deps.createProject('未命名项目', 'light-ui');
  if (createdProject) {
    return {
      project: createdProject,
      reason: 'created',
    };
  }

  return {
    project: null,
    reason: 'missing',
  };
}
