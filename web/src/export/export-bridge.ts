import type { ExportJobRequest } from './export-job';

export interface ThemeStudioExportBridge {
  enqueueExportJob?: (payload: ExportJobRequest) => Promise<{ accepted?: boolean; jobId?: string } | void> | { accepted?: boolean; jobId?: string } | void;
  pickDirectory?: () => Promise<{ path?: string } | void> | { path?: string } | void;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ExportDispatchResult {
  accepted: boolean;
  jobId?: string;
  mode: 'bridge' | 'api' | 'none';
  status?: number;
  error?: string;
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
      const apiPayload = {
        projectId: payload.batch.projectSnapshot.projectId,
        selectedProducts: payload.batch.selectedProducts,
      };
      
      if (!apiPayload.projectId || typeof apiPayload.projectId !== 'string' || apiPayload.projectId.trim() === '') {
        throw new Error('projectId is required and must be a non-empty string');
      }
      
      const trimmedProjectId = apiPayload.projectId.trim();
      const confirmedVersionResponse = await fetchImpl(`/api/theme/projects/${trimmedProjectId}/confirmed-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ projectSnapshot: payload.batch.projectSnapshot }),
      });

      if (!confirmedVersionResponse.ok) {
        let message = `确认版本创建失败 (${confirmedVersionResponse.status})`;
        try {
          const errorData = await confirmedVersionResponse.json() as { error?: string };
          if (errorData?.error) message = errorData.error;
        } catch {
          // ignore non-JSON error responses
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = confirmedVersionResponse.status;
        throw error;
      }

      const confirmedVersion = await confirmedVersionResponse.json() as { id?: string };
      if (!confirmedVersion.id) {
        throw new Error('确认版本创建成功，但未返回 version id');
      }
      
      if (typeof confirmedVersion.id !== 'string' || confirmedVersion.id.trim() === '') {
        throw new Error('确认版本创建成功，但返回的 version id 无效');
      }
      
      const trimmedConfirmedVersionId = confirmedVersion.id.trim();
      const response = await fetchImpl('/api/theme/export-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          projectId: trimmedProjectId,
          confirmedVersionId: trimmedConfirmedVersionId,
          selectedProducts: apiPayload.selectedProducts,
        }),
      });

      if (!response.ok) {
        let message = `导出桥接请求失败 (${response.status})`;
        try {
          const errorData = await response.json() as { error?: string };
          if (errorData?.error) {
            message = errorData.error;
          }
        } catch {
          // ignore non-JSON error responses
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return await response.json() as { accepted?: boolean; jobId?: string };
    },
    async pickDirectory() {
      const response = await fetchImpl('/api/theme/pick-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        let message = `目录选择请求失败 (${response.status})`;
        try {
          const errorData = await response.json() as { error?: string };
          if (errorData?.error) {
            message = errorData.error;
          }
        } catch {
          // ignore non-JSON error responses
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return await response.json() as { path?: string };
    },
  };
}

export async function dispatchExportJobToBridge(source: unknown, request: ExportJobRequest): Promise<ExportDispatchResult> {
  const bridge = getExportBridge(source) ?? getFetchBridge(source);
  if (!bridge?.enqueueExportJob) return { accepted: false, mode: 'none' };

  try {
    const result = await bridge.enqueueExportJob(request);
    const mode = getExportBridge(source) ? 'bridge' : 'api';
    return {
      accepted: true,
      jobId: result && typeof result === 'object' && 'jobId' in result && typeof result.jobId === 'string'
        ? result.jobId
        : request.batch.id,
      mode,
    };
  } catch (error) {
    return {
      accepted: false,
      mode: getExportBridge(source) ? 'bridge' : 'api',
      status: (error as Error & { status?: number }).status,
      error: (error as Error).message,
    };
  }
}

export async function pickDirectoryViaBridge(source: unknown): Promise<string | null> {
  const bridge = getExportBridge(source) ?? getFetchBridge(source);
  if (!bridge?.pickDirectory) return null;
  const result = await bridge.pickDirectory();
  return result && typeof result === 'object' && 'path' in result && typeof result.path === 'string'
    ? result.path
    : null;
}
