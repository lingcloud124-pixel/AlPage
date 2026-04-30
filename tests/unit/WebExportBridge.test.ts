import { describe, expect, test } from 'vitest';

import { dispatchExportJobToBridge, getExportBridge } from '../../web/src/export/export-bridge';
import { buildExportJobRequest } from '../../web/src/export/export-job';
import type { Project } from '../../web/src/project-manager';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-bridge',
    name: '桥接测试',
    themeName: '桥接测试主题',
    templateType: 'light-ui',
    colors: {
      'primary-color': '#2C615C',
      'header-font-color': '#333333',
    },
    bgImageUrl: 'https://example.com/bg.jpg',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('web export bridge', () => {
  test('returns null when no local export bridge is attached to window', () => {
    expect(getExportBridge(undefined)).toBeNull();
    expect(getExportBridge({})).toBeNull();
  });

  test('dispatches export jobs through the attached local bridge', async () => {
    const calls: unknown[] = [];
    const bridge = {
      enqueueExportJob(payload: unknown) {
        calls.push(payload);
      },
    };

    const request = buildExportJobRequest({
      project: createProject(),
      selectedProducts: ['mk'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      exportRoot: '/Users/demo/Documents/Theme Studio',
      now: 1712999999000,
    });

    const dispatched = await dispatchExportJobToBridge(bridge, request);

    expect(dispatched).toEqual({
      accepted: true,
      jobId: 'export-1712999999000',
      mode: 'bridge',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      batch: {
        id: 'export-1712999999000',
        exportDir: '/Users/demo/Documents/Theme Studio/projects/project-bridge-project/exports/20240413-091959',
      },
      buildOptions: {
        selectedProducts: ['mk'],
      },
    });
  });

  test('falls back to the theme export API when window bridge is unavailable', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const request = buildExportJobRequest({
      project: createProject(),
      selectedProducts: ['mk'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      exportRoot: '/Users/demo/Documents/Theme Studio',
      now: 1712999999000,
    });

    const dispatched = await dispatchExportJobToBridge({
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init });
        if (String(input).includes('/confirmed-versions')) {
          return new Response(JSON.stringify({
            id: 'confirmed-1',
            projectId: 'project-bridge',
            createdAt: 1,
            updatedAt: 1,
            projectSnapshot: { projectId: 'project-bridge' },
          }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ accepted: true, jobId: 'export-1712999999000' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    }, request);

    expect(dispatched).toEqual({
      accepted: true,
      jobId: 'export-1712999999000',
      mode: 'api',
    });
    expect(calls).toHaveLength(2);
    expect(String(calls[0].input)).toBe('/api/theme/projects/project-bridge/confirmed-versions');
    expect(calls[0].init?.method).toBe('POST');
    expect(String(calls[1].input)).toBe('/api/theme/export-jobs');
    expect(calls[1].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      projectId: 'project-bridge',
      confirmedVersionId: 'confirmed-1',
      selectedProducts: ['mk'],
    });
  });
});
