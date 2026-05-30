import { apiFetch, resolveApiUrl } from '../api-base';

import type { WorkspaceConfig, WorkspaceItem, WorkspaceSettings } from '../types';

const BASE = resolveApiUrl('/api/theme/projects');

export async function initializeProjectWorkspace(projectId: string): Promise<WorkspaceConfig | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(projectId)}/workspace/initialize`, {
    method: 'POST',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProjectWorkspace(projectId: string): Promise<WorkspaceConfig | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(projectId)}/workspace`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateProjectWorkspaceSettings(projectId: string, settings: WorkspaceSettings): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(projectId)}/workspace/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.ok;
}

export async function updateProjectWorkspaceItems(projectId: string, items: WorkspaceItem[]): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(projectId)}/workspace/items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  return res.ok;
}
