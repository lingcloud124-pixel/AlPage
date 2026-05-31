export interface IndustryCaseSummary {
  id: string;
  customerName: string;
  industry: string;
  keywords: string[];
  projectId: string;
  createdAt: number;
  updatedAt: number;
}

export interface IndustryCaseDetail extends IndustryCaseSummary {
  portalPlan: Record<string, unknown>;
}

function resolveApiUrl(path: string): string {
  return `/api/industry-cases${path}`;
}

export async function listIndustryCases(params?: { industry?: string; keyword?: string; limit?: number; offset?: number }): Promise<{ total: number; items: IndustryCaseSummary[] }> {
  const qs = new URLSearchParams();
  if (params?.industry) qs.set('industry', params.industry);
  if (params?.keyword) qs.set('keyword', params.keyword);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const resp = await fetch(`${resolveApiUrl('')}?${qs.toString()}`, { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`listIndustryCases failed: ${resp.status}`);
  return resp.json();
}

export async function getIndustryCase(id: string): Promise<IndustryCaseDetail> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`getIndustryCase failed: ${resp.status}`);
  return resp.json();
}

export async function createIndustryCase(data: { customerName: string; industry: string; keywords: string[]; portalPlan: Record<string, unknown>; projectId: string }): Promise<{ id: string }> {
  const resp = await fetch(resolveApiUrl(''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`createIndustryCase failed: ${resp.status}`);
  return resp.json();
}

export async function deleteIndustryCase(id: string): Promise<void> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!resp.ok) throw new Error(`deleteIndustryCase failed: ${resp.status}`);
}
