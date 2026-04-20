import { afterEach, describe, expect, test } from 'vitest';

import { createExportBridgeServer } from '../../web/scripts/export-bridge';
import { buildExportJobRequest } from '../../web/src/export/export-job';
import type { Project } from '../../web/src/project-manager';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-server',
    name: '服务测试',
    themeName: '服务测试主题',
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

const servers: Array<{ close: () => void }> = [];
afterEach(() => {
  while (servers.length) {
    servers.pop()?.close();
  }
});

describe('web export bridge server', () => {
  test('exposes accepted export job status through the local bridge API', async () => {
    let releaseJob!: () => void;
    const jobBlocked = new Promise<void>((resolve) => {
      releaseJob = resolve;
    });

    const server = createExportBridgeServer(async (_job, updateStatus) => {
      updateStatus('capturing');
      await jobBlocked;
    });
    server.listen(0, '127.0.0.1');
    servers.push(server);

    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test server address');
    const baseUrl = `http://127.0.0.1:${address.port}`;

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

    const postResponse = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    expect(postResponse.status).toBe(202);

    const statusResponse = await fetch(`${baseUrl}/jobs/export-1712999999000`);
    expect(statusResponse.status).toBe(200);
    const statusBody = await statusResponse.json();
    expect(statusBody.job.id).toBe('export-1712999999000');
    expect(statusBody.job.status).toBe('capturing');

    releaseJob();
  });
});
