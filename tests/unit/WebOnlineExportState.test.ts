import { describe, expect, test } from 'vitest';
import type { Project } from '../../web/src/project-manager';
import type { ServerExportJob } from '../../web/src/types';
import {
  appendServerExportJobToProject,
  upsertServerExportJobOnProject,
} from '../../web/src/export/online-export-state';

function createProject(): Project {
  return {
    id: 'project-1',
    name: '清明主题',
    templateType: 'light-ui',
    colors: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function createJob(id: string, updatedAt: number, status: ServerExportJob['status']): ServerExportJob {
  return {
    id,
    projectId: 'project-1',
    status,
    selectedProducts: ['mk'],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('web online export state', () => {
  test('appends and upserts server export jobs', () => {
    const appended = appendServerExportJobToProject(createProject(), createJob('job-1', 2100, 'queued'));
    expect(appended.serverExportJobs?.[0].status).toBe('queued');

    const updated = upsertServerExportJobOnProject(appended, createJob('job-1', 2500, 'packaging'));
    expect(updated.serverExportJobs).toHaveLength(1);
    expect(updated.serverExportJobs?.[0].status).toBe('packaging');
    expect(updated.updatedAt).toBe(2500);
  });
});
