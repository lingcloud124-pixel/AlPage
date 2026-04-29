import type { ConfirmedProjectSnapshot, ConfirmedProjectVersion, ServerExportJob } from '../types';
import type { Project } from '../project-manager';
import { buildProjectExportNameEn } from '../project-naming';

function resolveConfirmedSnapshotImageUrl(project: Project, imageUrl: string | undefined): string | undefined {
  if (imageUrl && !imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  const visualContextImage = project.visualContext?.imageInput?.dataUrl?.trim();
  if (visualContextImage) {
    return visualContextImage;
  }
  return undefined;
}

export interface CreateServerExportJobInput {
  projectId: string;
  confirmedVersionId: string;
  selectedProducts: string[];
}

export function buildConfirmedProjectSnapshot(project: Project, now: number = Date.now()): ConfirmedProjectSnapshot {
  return {
    projectId: project.id,
    name: project.themeName || project.name || '未命名主题',
    nameEn: buildProjectExportNameEn(project),
    templateType: project.templateType,
    colors: { ...project.colors },
    bgImageUrl: resolveConfirmedSnapshotImageUrl(project, project.bgImageUrl),
    headerBgImageUrl: resolveConfirmedSnapshotImageUrl(project, project.headerBgImageUrl),
    visualContext: project.visualContext,
    sourceUpdatedAt: project.updatedAt,
    confirmedAt: now,
  };
}

async function themeApiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`/api/theme${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function createConfirmedVersion(projectId: string, snapshot: ConfirmedProjectSnapshot): Promise<ConfirmedProjectVersion> {
  const response = await themeApiFetch(`/projects/${projectId}/confirmed-versions`, {
    method: 'POST',
    body: JSON.stringify({ projectSnapshot: snapshot }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create confirmed version: ${response.status}`);
  }

  return response.json() as Promise<ConfirmedProjectVersion>;
}

export async function listConfirmedVersions(projectId: string): Promise<ConfirmedProjectVersion[]> {
  const response = await themeApiFetch(`/projects/${projectId}/confirmed-versions`);
  if (!response.ok) {
    throw new Error(`Failed to list confirmed versions: ${response.status}`);
  }
  return response.json() as Promise<ConfirmedProjectVersion[]>;
}

export async function createServerExportJob(input: CreateServerExportJobInput): Promise<ServerExportJob> {
  const response = await themeApiFetch('/export-jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create export job: ${response.status}`);
  }

  return response.json() as Promise<ServerExportJob>;
}

export async function listServerExportJobs(projectId: string): Promise<ServerExportJob[]> {
  const response = await themeApiFetch(`/projects/${projectId}/export-jobs`);
  if (!response.ok) {
    throw new Error(`Failed to list export jobs: ${response.status}`);
  }
  return response.json() as Promise<ServerExportJob[]>;
}

export async function getServerExportJob(jobId: string): Promise<ServerExportJob> {
  const response = await themeApiFetch(`/export-jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to get export job: ${response.status}`);
  }
  return response.json() as Promise<ServerExportJob>;
}
