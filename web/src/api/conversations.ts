import type {
  ConversationListItem,
  ConversationDetail,
  ConversationCreatePayload,
  ConversationUpdatePayload,
} from '../types';

const BASE = '/api/theme/conversations';

export async function listConversations(): Promise<ConversationListItem[]> {
  const res = await fetch(BASE, { credentials: 'same-origin' });
  if (!res.ok) return [];
  return res.json();
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

export async function createConversation(payload: ConversationCreatePayload): Promise<ConversationDetail | null> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateConversation(id: string, payload: ConversationUpdatePayload): Promise<boolean> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function toggleStar(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/star`, {
    method: 'PUT',
    credentials: 'same-origin',
  });
  return res.ok;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return res.ok;
}
