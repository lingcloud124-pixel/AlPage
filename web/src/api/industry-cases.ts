export interface IndustryCaseSummary {
  id: string;
  customerName: string;
  industry: string;
  keywords: string[];
  projectId: string;
  summary: string;
  highlights: string[];
  coverImageUrl?: string;
  displayEnabled: boolean;
  referenceEnabled: boolean;
  anonymizedRequirement?: string;
  sourcePortalId: string;
  caseTitle: string;
  createdAt: number;
  updatedAt: number;
}

export interface IndustryCaseDetail extends IndustryCaseSummary {
  portalPlan: Record<string, unknown>;
}

function resolveApiUrl(path: string): string {
  return `/api/industry-cases${path}`;
}

export async function listIndustryCases(params?: { industry?: string; keyword?: string; limit?: number; offset?: number; referenceOnly?: boolean }): Promise<{ total: number; items: IndustryCaseSummary[] }> {
  const qs = new URLSearchParams();
  if (params?.industry) qs.set('industry', params.industry);
  if (params?.keyword) qs.set('keyword', params.keyword);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  if (params?.referenceOnly) qs.set('referenceOnly', 'true');
  const resp = await fetch(`${resolveApiUrl('')}?${qs.toString()}`, { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`listIndustryCases failed: ${resp.status}`);
  return resp.json();
}

export async function getIndustryCase(id: string): Promise<IndustryCaseDetail> {
  const resp = await fetch(resolveApiUrl(`/${encodeURIComponent(id)}`), { credentials: 'same-origin' });
  if (!resp.ok) throw new Error(`getIndustryCase failed: ${resp.status}`);
  return resp.json();
}
