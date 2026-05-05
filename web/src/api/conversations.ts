import { apiFetch, resolveApiUrl } from '../api-base';

import type {
  ConversationListItem,
  ConversationDetail,
  ConversationCreatePayload,
  ConversationUpdatePayload,
} from '../types';

const BASE = resolveApiUrl('/api/theme/conversations');

export async function listConversations(): Promise<ConversationListItem[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) return [];
  return res.json();
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createConversation(payload: ConversationCreatePayload): Promise<ConversationDetail | null> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateConversation(id: string, payload: ConversationUpdatePayload): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function toggleStar(id: string): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/star`, {
    method: 'PUT',
  });
  return res.ok;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.ok;
}
