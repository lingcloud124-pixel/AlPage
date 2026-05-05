
import { resolveApiUrl } from '../api-base';

import type { ExportBatch } from '../types';

export function buildExportJobStatusUrl(jobId: string): string {
  return resolveApiUrl(`/api/theme/export-jobs/${jobId}`);
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchExportJobStatus(fetchImpl: FetchLike, jobId: string): Promise<ExportBatch | null> {
  const response = await fetchImpl(buildExportJobStatusUrl(jobId), {
    credentials: 'include',
  });
  if (!response.ok) return null;

  const payload = await response.json();
  return (payload.job ?? payload) as ExportBatch | null;
}
