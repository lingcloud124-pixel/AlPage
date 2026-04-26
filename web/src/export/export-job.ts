import type { ExportBatch, ExportJobQueueEntry } from '../types';
import type { Project } from '../project-manager';
import { buildProjectExportNameEn } from '../project-naming';
import { buildExportRequestYaml } from './build-config';
import { buildExportAssetSnapshot, type ExportAssetSnapshot } from './asset-snapshot';
import { buildExportBatchPaths } from './export-paths';
import { buildLivePreviewProjectSnapshot } from './live-preview-snapshot';

export interface BuildExportJobRequestArgs {
  project: Project;
  selectedProducts: string[];
  cssVariables: Record<string, string>;
  exportRoot?: string;
  now?: number;
}

export interface ExportJobRequest {
  batch: ExportBatch;
  yaml: string;
  assetSnapshot: ExportAssetSnapshot;
  buildOptions: {
    name: string;
    nameEn: string;
    templateType: 'light-ui' | 'dark-ui';
    themeColor: string;
    cssVariables: Record<string, string>;
    themeImageUrl?: string;
    selectedProducts: string[];
  };
}

function toExportJobQueueEntry(request: ExportJobRequest): ExportJobQueueEntry {
  return {
    batchId: request.batch.id,
    projectId: request.batch.projectSnapshot.projectId,
    name: request.batch.projectSnapshot.name,
    nameEn: request.batch.projectSnapshot.nameEn,
    templateType: request.batch.projectSnapshot.templateType,
    selectedProducts: [...request.batch.selectedProducts],
    createdAt: request.batch.createdAt,
    status: request.batch.status,
  };
}

function getProjectExportName(project: Project): string {
  return project.themeName || project.name || '未命名主题';
}

function getProjectExportNameEn(project: Project): string {
  return buildProjectExportNameEn(project);
}

export function buildExportJobRequest(args: BuildExportJobRequestArgs): ExportJobRequest {
  const timestamp = args.now ?? Date.now();
  const liveProjectSnapshot = buildLivePreviewProjectSnapshot(args.project, args.cssVariables);
  const name = getProjectExportName(liveProjectSnapshot);
  const nameEn = getProjectExportNameEn(liveProjectSnapshot);
  const cssVariables = { ...liveProjectSnapshot.colors, ...args.cssVariables };
  const themeColor = cssVariables['primary-color'] || cssVariables['--primary-color'] || '#2C615C';
  const headerFont = cssVariables['header-font-color'] || cssVariables['--header-font-color'] || '#333333';
  const exportPaths = args.exportRoot
    ? buildExportBatchPaths({
      exportRoot: args.exportRoot,
      projectNameEn: nameEn,
      timestamp,
    })
    : null;

  const batch: ExportBatch = {
    id: `export-${timestamp}`,
    createdAt: timestamp,
    status: 'queued',
    selectedProducts: [...args.selectedProducts],
    exportRoot: exportPaths?.exportRoot,
    projectDir: exportPaths?.projectDir,
    exportDir: exportPaths?.exportDir,
    projectSnapshot: {
      projectId: liveProjectSnapshot.id,
      name,
      nameEn,
      templateType: liveProjectSnapshot.templateType,
      colors: cssVariables,
      bgImageUrl: liveProjectSnapshot.bgImageUrl,
      headerBgImageUrl: liveProjectSnapshot.headerBgImageUrl,
      visualContext: liveProjectSnapshot.visualContext,
    },
  };

  return {
    batch,
    yaml: buildExportRequestYaml({
      name,
      nameEn,
      themeColor,
      templateType: liveProjectSnapshot.templateType,
      headerFont,
      selectedProducts: args.selectedProducts,
      colors: cssVariables,
    }),
    assetSnapshot: buildExportAssetSnapshot({
      project: liveProjectSnapshot,
      cssVariables,
      selectedProducts: args.selectedProducts,
      nameEn,
      exportDir: exportPaths?.exportDir,
      now: timestamp,
    }),
    buildOptions: {
      name,
      nameEn,
      templateType: liveProjectSnapshot.templateType,
      themeColor,
      cssVariables,
      themeImageUrl: liveProjectSnapshot.bgImageUrl,
      selectedProducts: [...args.selectedProducts],
    },
  };
}

export function appendExportBatchToProject(project: Project, batch: ExportBatch): Project {
  return {
    ...project,
    exportBatches: [...(project.exportBatches ?? []), batch],
    updatedAt: batch.createdAt,
  };
}

export function appendExportJobRequest(queue: ExportJobQueueEntry[], request: ExportJobRequest): ExportJobQueueEntry[] {
  return [...queue, toExportJobQueueEntry(request)];
}

export function updateExportBatchInProject(
  project: Project,
  batchId: string,
  patch: Partial<ExportBatch>,
  updatedAt: number = Date.now(),
): Project {
  return {
    ...project,
    exportBatches: (project.exportBatches ?? []).map((batch) =>
      batch.id === batchId ? { ...batch, ...patch } : batch,
    ),
    updatedAt,
  };
}
