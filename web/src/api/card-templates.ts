import { apiFetch, resolveApiUrl } from '../api-base';

const BASE = resolveApiUrl('/api/card-templates');

export interface CardFieldSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'image' | 'link' | 'list' | 'select' | 'boolean';
  aiWritable: boolean;
  required?: boolean;
  options?: string[];
  itemSchema?: Record<string, string>;
}

export interface CardTemplateListItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  configurable?: boolean;
  defaultW?: number;
  defaultH?: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  defaultProps?: Record<string, unknown>;
  previewImageUrl?: string;
  industryTags?: string[];
  capabilityTags?: string[];
  scenarioTags?: string[];
  fields?: CardFieldSchemaItem[];
}

export async function listCardTemplates(): Promise<CardTemplateListItem[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) return [];
  return res.json();
}

export async function getCardTemplate(id: string): Promise<CardTemplateListItem | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createCardTemplate(data: Partial<CardTemplateListItem>): Promise<{ id: string } | null> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateCardTemplate(id: string, data: Partial<CardTemplateListItem>): Promise<{ id: string } | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function toggleCardTemplate(id: string): Promise<{ id: string } | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}
