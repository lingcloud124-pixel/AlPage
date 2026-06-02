import {
  fetchProjectWorkspace,
  initializeProjectWorkspace,
  updateProjectWorkspaceItems,
  updateProjectWorkspaceSettings,
} from '../api/workspace';

import type { WorkspaceConfig } from '../types';

const WORKSPACE_STORAGE_KEY_PREFIX = 'theme-studio-workspace-';

function getWorkspaceStorageKey(projectId: string): string {
  return `${WORKSPACE_STORAGE_KEY_PREFIX}${projectId}`;
}

export function readWorkspaceFromLocal(projectId: string): WorkspaceConfig | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const raw = localStorage.getItem(getWorkspaceStorageKey(projectId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkspaceConfig;
  } catch {
    return null;
  }
}

export function persistWorkspaceToLocal(projectId: string, workspace: WorkspaceConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  localStorage.setItem(getWorkspaceStorageKey(projectId), JSON.stringify(workspace));
}

export async function syncWorkspaceToServer(projectId: string, workspace: WorkspaceConfig): Promise<boolean> {
  const [settingsOk, itemsOk] = await Promise.all([
    updateProjectWorkspaceSettings(projectId, workspace.settings),
    updateProjectWorkspaceItems(projectId, workspace.items),
  ]);
  return settingsOk && itemsOk;
}

export async function ensureProjectWorkspaceReady(
  projectId: string,
  currentWorkspace?: WorkspaceConfig | null,
): Promise<WorkspaceConfig | null> {
  if (currentWorkspace) {
    persistWorkspaceToLocal(projectId, currentWorkspace);
    void syncWorkspaceToServer(projectId, currentWorkspace);
    return currentWorkspace;
  }

  const localWorkspace = readWorkspaceFromLocal(projectId);
  if (localWorkspace) {
    void syncWorkspaceToServer(projectId, localWorkspace);
    return localWorkspace;
  }

  const remoteWorkspace = await fetchProjectWorkspace(projectId);
  if (remoteWorkspace) {
    persistWorkspaceToLocal(projectId, remoteWorkspace);
    return remoteWorkspace;
  }

  const initializedWorkspace = await initializeProjectWorkspace(projectId);
  if (initializedWorkspace) {
    persistWorkspaceToLocal(projectId, initializedWorkspace);
    return initializedWorkspace;
  }

  return null;
}
