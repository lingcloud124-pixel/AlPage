import { apiFetch, resolveApiUrl } from '../api-base';

const BASE = resolveApiUrl('/api/card-templates');

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
}

export async function listCardTemplates(): Promise<CardTemplateListItem[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) return [];
  return res.json();
}
