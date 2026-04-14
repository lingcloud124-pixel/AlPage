import type { ExportBatch } from '../types';
import type { Project } from '../project-manager';
import { buildExportRequestYaml } from './build-config';
import { buildExportBatchPaths } from './export-paths';

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
  buildOptions: {
    name: string;
    nameEn: string;
    templateType: 'light-ui' | 'dark-ui';
    themeColor: string;
    themeImageUrl?: string;
    selectedProducts: string[];
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || 'project';
}

function getProjectExportName(project: Project): string {
  return project.themeName || project.name || '未命名主题';
}

function getProjectExportNameEn(project: Project): string {
  if (project.nameEn && project.nameEn.trim()) return project.nameEn.trim();
  return `${project.id}-${slugify(project.themeName || project.name || '')}`;
}

export function buildExportJobRequest(args: BuildExportJobRequestArgs): ExportJobRequest {
  const timestamp = args.now ?? Date.now();
  const name = getProjectExportName(args.project);
  const nameEn = getProjectExportNameEn(args.project);
  const themeColor = args.cssVariables['primary-color'] || args.project.colors['primary-color'] || '#2C615C';
  const headerFont = args.cssVariables['header-font-color'] || args.project.colors['header-font-color'] || '#333333';
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
      projectId: args.project.id,
      name,
      nameEn,
      templateType: args.project.templateType,
      colors: { ...args.project.colors, ...args.cssVariables },
      bgImageUrl: args.project.bgImageUrl,
      headerBgImageUrl: args.project.headerBgImageUrl,
    },
  };

  return {
    batch,
    yaml: buildExportRequestYaml({
      name,
      themeColor,
      headerFont,
      selectedProducts: args.selectedProducts,
    }),
    buildOptions: {
      name,
      nameEn,
      templateType: args.project.templateType,
      themeColor,
      themeImageUrl: args.project.bgImageUrl,
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

export function appendExportJobRequest(queue: ExportJobRequest[], request: ExportJobRequest): ExportJobRequest[] {
  return [...queue, request];
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
