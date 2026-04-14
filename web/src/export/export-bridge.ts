import type { ExportJobRequest } from './export-job';

export interface ThemeStudioExportBridge {
  enqueueExportJob?: (payload: ExportJobRequest) => Promise<{ accepted?: boolean; jobId?: string } | void> | { accepted?: boolean; jobId?: string } | void;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ExportDispatchResult {
  accepted: boolean;
  jobId?: string;
  mode: 'bridge' | 'api' | 'none';
}

export function getExportBridge(source: unknown): ThemeStudioExportBridge | null {
  if (!source || typeof source !== 'object') return null;

  const bridge = (source as { themeStudioExportBridge?: ThemeStudioExportBridge }).themeStudioExportBridge
    ?? (source as ThemeStudioExportBridge);

  if (!bridge || typeof bridge !== 'object') return null;
  if (typeof bridge.enqueueExportJob !== 'function') return null;

  return bridge;
}

function getFetchBridge(source: unknown): ThemeStudioExportBridge | null {
  const fetchImpl = (source as { fetch?: FetchLike } | undefined)?.fetch;
  if (typeof fetchImpl !== 'function') return null;

  return {
    async enqueueExportJob(payload: ExportJobRequest) {
      const response = await fetchImpl('/api/export/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`导出桥接请求失败 (${response.status})`);
      }

      return await response.json() as { accepted?: boolean; jobId?: string };
    },
  };
}

export async function dispatchExportJobToBridge(source: unknown, request: ExportJobRequest): Promise<ExportDispatchResult> {
  const bridge = getExportBridge(source) ?? getFetchBridge(source);
  if (!bridge?.enqueueExportJob) return { accepted: false, mode: 'none' };

  const result = await bridge.enqueueExportJob(request);
  const mode = getExportBridge(source) ? 'bridge' : 'api';
  return {
    accepted: true,
    jobId: result && typeof result === 'object' && 'jobId' in result && typeof result.jobId === 'string'
      ? result.jobId
      : request.batch.id,
    mode,
  };
}
