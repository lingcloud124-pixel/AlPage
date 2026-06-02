export interface SavedPortalSummary {
  id: string;
  projectId: string;
  conversationId?: string;
  name: string;
  templateType: string;
  status: string;
  curatedCaseCount?: number;
  publishedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SavedPortalDetail extends SavedPortalSummary {
  colors: Record<string, string>;
  workspace: Record<string, unknown>;
  portalPlan: Record<string, unknown>;
  projectSnapshot?: Record<string, unknown>;
  conversationSnapshot?: Record<string, unknown>;
}

export class SavedPortalNotFoundError extends Error {
  constructor(id: string) {
    super(`Saved portal not found: ${id}`);
    this.name = 'SavedPortalNotFoundError';
  }
}

interface SavedPortalPayload {
  name: string;
  templateType: string;
  colors: Record<string, string>;
  workspace: Record<string, unknown>;
  portalPlan: Record<string, unknown>;
  projectId: string;
  conversationId?: string;
  projectSnapshot?: Record<string, unknown>;
  conversationSnapshot?: Record<string, unknown>;
  status?: string;
}

function resolveApiUrl(path: string): string {
  return `/api/saved-portals${path}`;
}

export async function listSavedPortals(params?: { limit?: number; offset?: number }): Promise<{ total: number; items: SavedPortalSummary[] }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const resp = await fetch(`${resolveApiUrl('')}?${qs.toString()}`, { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`listSavedPortals failed: ${resp.status}`);
  return resp.json();
}

export async function getSavedPortal(id: string): Promise<SavedPortalDetail> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`getSavedPortal failed: ${resp.status}`);
  return resp.json();
}

export async function createSavedPortal(data: SavedPortalPayload): Promise<{ id: string }> {
  const resp = await fetch(resolveApiUrl(''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`createSavedPortal failed: ${resp.status}`);
  return resp.json();
}

export async function updateSavedPortal(id: string, data: Partial<SavedPortalPayload>): Promise<void> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (resp.status === 404) throw new SavedPortalNotFoundError(id);
  if (!resp.ok) throw new Error(`updateSavedPortal failed: ${resp.status}`);
}

export async function deleteSavedPortal(id: string): Promise<void> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!resp.ok) throw new Error(`deleteSavedPortal failed: ${resp.status}`);
}

export async function publishSavedPortal(id: string): Promise<{ ok: boolean; publishedAt: number }> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}/publish`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  });
  if (!resp.ok) throw new Error(`publishSavedPortal failed: ${resp.status}`);
  return resp.json();
}

export async function getPublishedPortal(id: string): Promise<{
  name: string;
  templateType: string;
  colors: Record<string, string>;
  workspace: Record<string, unknown>;
  portalPlan: Record<string, unknown>;
  publishedAt: number;
}> {
  const resp = await fetch(resolveApiUrl(`/published/${encodeURIComponent(id)}`));
  if (!resp.ok) throw new Error(`getPublishedPortal failed: ${resp.status}`);
  return resp.json();
}
