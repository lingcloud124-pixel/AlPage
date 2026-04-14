import { describe, expect, test } from 'vitest';

import { appendExportBatchToProject, appendExportJobRequest, buildExportJobRequest, updateExportBatchInProject } from '../../web/src/export/export-job';
import type { Project } from '../../web/src/project-manager';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-123',
    name: '清明主题',
    themeName: '春风清明',
    templateType: 'light-ui',
    colors: {
      'primary-color': '#2C615C',
      'header-font-color': '#333333',
    },
    bgImageUrl: 'https://example.com/bg.png',
    headerBgImageUrl: 'https://example.com/header.png',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('web export jobs', () => {
  test('builds a standard export job request from the current project snapshot', () => {
    const project = createProject();
    const request = buildExportJobRequest({
      project,
      selectedProducts: ['mk', 'ekp_v17'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      exportRoot: '/Users/demo/Documents/Theme Studio',
      now: 1712999999000,
    });

    expect(request.batch.status).toBe('queued');
    expect(request.batch.selectedProducts).toEqual(['mk', 'ekp_v17']);
    expect(request.batch.projectSnapshot).toMatchObject({
      projectId: 'project-123',
      name: '春风清明',
      templateType: 'light-ui',
      bgImageUrl: 'https://example.com/bg.png',
      headerBgImageUrl: 'https://example.com/header.png',
    });

    expect(request.buildOptions.selectedProducts).toEqual(['mk', 'ekp_v17']);
    expect(request.buildOptions.nameEn).toBe('project-123-project');
    expect(request.batch.exportDir).toBe('/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959');
    expect(request.yaml).toContain('  - mk');
    expect(request.yaml).toContain('  - ekp_v17');
  });

  test('appends export batch metadata to the owning project', () => {
    const project = createProject({ exportBatches: [] as any });
    const request = buildExportJobRequest({
      project,
      selectedProducts: ['mk'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      now: 1712999999000,
    });

    const updated = appendExportBatchToProject(project, request.batch);

    expect(updated.exportBatches).toHaveLength(1);
    expect(updated.exportBatches?.[0]).toMatchObject({
      id: request.batch.id,
      selectedProducts: ['mk'],
      status: 'queued',
    });
    expect(updated.updatedAt).toBe(1712999999000);
  });

  test('queues export requests in creation order for the local export bridge', () => {
    const project = createProject();
    const request = buildExportJobRequest({
      project,
      selectedProducts: ['mk'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      now: 1712999999000,
    });

    const queue = appendExportJobRequest([], request);

    expect(queue).toHaveLength(1);
    expect(queue[0].batch.id).toBe('export-1712999999000');
    expect(queue[0].buildOptions.selectedProducts).toEqual(['mk']);
  });

  test('updates an existing export batch status and result metadata in the project snapshot', () => {
    const project = createProject({
      exportBatches: [{
        id: 'export-1',
        createdAt: 1,
        status: 'queued',
        selectedProducts: ['mk'],
        projectSnapshot: {
          projectId: 'project-123',
          name: '春风清明',
          nameEn: 'project-123-project',
          templateType: 'light-ui',
          colors: {},
        },
      }],
    });

    const updated = updateExportBatchInProject(project, 'export-1', {
      status: 'completed',
      exportDir: '/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959',
    }, 1713000000000);

    expect(updated.exportBatches?.[0]).toMatchObject({
      id: 'export-1',
      status: 'completed',
      exportDir: '/Users/demo/Documents/Theme Studio/projects/project-123-project/exports/20240413-091959',
    });
    expect(updated.updatedAt).toBe(1713000000000);
  });
});
