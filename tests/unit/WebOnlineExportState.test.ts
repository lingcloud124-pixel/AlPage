import { describe, expect, test } from 'vitest';
import type { Project } from '../../web/src/project-manager';
import type { ConfirmedProjectVersion, ServerExportJob } from '../../web/src/types';
import {
  appendConfirmedVersionToProject,
  appendServerExportJobToProject,
  setConfirmedVersionsOnProject,
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

function createConfirmedVersion(id: string, updatedAt: number): ConfirmedProjectVersion {
  return {
    id,
    projectId: 'project-1',
    createdAt: updatedAt,
    updatedAt,
    projectSnapshot: {
      projectId: 'project-1',
      name: '清明主题',
      nameEn: 'project-1-qingming',
      templateType: 'light-ui',
      colors: {},
      sourceUpdatedAt: 900,
      confirmedAt: updatedAt,
    },
  };
}

function createJob(id: string, updatedAt: number, status: ServerExportJob['status']): ServerExportJob {
  return {
    id,
    projectId: 'project-1',
    confirmedVersionId: 'confirmed-1',
    status,
    selectedProducts: ['mk'],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('web online export state', () => {
  test('appends confirmed versions in newest-first order', () => {
    const project = appendConfirmedVersionToProject(createProject(), createConfirmedVersion('confirmed-1', 2000));

    expect(project.confirmedVersions).toHaveLength(1);
    expect(project.confirmedVersions?.[0].id).toBe('confirmed-1');
    expect(project.updatedAt).toBe(2000);
  });

  test('replaces the confirmed versions collection', () => {
    const project = setConfirmedVersionsOnProject(createProject(), [
      createConfirmedVersion('confirmed-2', 3000),
      createConfirmedVersion('confirmed-1', 2000),
    ]);

    expect(project.confirmedVersions?.map((item) => item.id)).toEqual(['confirmed-2', 'confirmed-1']);
    expect(project.updatedAt).toBe(3000);
  });

  test('appends and upserts server export jobs', () => {
    const appended = appendServerExportJobToProject(createProject(), createJob('job-1', 2100, 'queued'));
    expect(appended.serverExportJobs?.[0].status).toBe('queued');

    const updated = upsertServerExportJobOnProject(appended, createJob('job-1', 2500, 'packaging'));
    expect(updated.serverExportJobs).toHaveLength(1);
    expect(updated.serverExportJobs?.[0].status).toBe('packaging');
    expect(updated.updatedAt).toBe(2500);
  });
});
