import type { ExportBatch } from '../types';

export function buildExportJobStatusUrl(jobId: string): string {
  return `/api/export/jobs/${jobId}`;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchExportJobStatus(fetchImpl: FetchLike, jobId: string): Promise<ExportBatch | null> {
  const response = await fetchImpl(buildExportJobStatusUrl(jobId));
  if (!response.ok) return null;

  const payload = await response.json() as { job?: ExportBatch };
  return payload.job ?? null;
}

