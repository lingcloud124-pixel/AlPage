import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { generateImageMock, getCurrentProjectIdMock, loadProjectMock } = vi.hoisted(() => ({
  generateImageMock: vi.fn(),
  getCurrentProjectIdMock: vi.fn(() => 'project-1'),
  loadProjectMock: vi.fn(),
}));

vi.mock('../../web/src/agent/chat-client', () => ({
  generateImage: generateImageMock,
}));

vi.mock('../../web/src/project-manager', async () => {
  const actual = await import('../../web/src/project-manager');
  return {
    ...actual,
    getCurrentProjectId: getCurrentProjectIdMock,
    loadProject: loadProjectMock,
  };
});

import { executeTool } from '../../web/src/tools/executor';

function createProject() {
  return {
    id: 'project-1',
    name: '清明主题',
    themeName: '清明主题',
    templateType: 'light-ui' as const,
    colors: {
      'primary-color': '#2C615C',
      'header-font-color': '#FFFFFF',
    },
    bgImageUrl: '/images/qingming.png',
    headerBgImageUrl: '/images/header.png',
    createdAt: 1000,
    updatedAt: 2000,
  };
}

describe('web executor export tools', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    loadProjectMock.mockResolvedValue(createProject());
    getCurrentProjectIdMock.mockReturnValue('project-1');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  test('build exports directly with inline snapshot and polls until completion', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accepted: true,
        jobId: 'job-1',
        id: 'job-1',
        status: 'queued',
        selectedProducts: ['mk'],
        createdAt: 10,
        updatedAt: 10,
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'job-1',
        status: 'packaging',
        selectedProducts: ['mk'],
        createdAt: 10,
        updatedAt: 20,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'job-1',
        status: 'completed',
        selectedProducts: ['mk'],
        result: { downloadUrl: '/api/theme/export-jobs/job-1/download' },
        createdAt: 10,
        updatedAt: 30,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const progressEvents: Array<{ type: string; data?: unknown }> = [];
    const resultPromise = executeTool({
      tool: 'build',
      args: { selectedProducts: ['mk'] },
    }, (event) => {
      progressEvents.push(event);
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/theme/export-jobs', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/theme/export-jobs/job-1', expect.objectContaining({
      credentials: 'include',
    }));
    const exportCall = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(exportCall?.body));
    expect(body.projectId).toBe('project-1');
    expect(body.projectSnapshot).toMatchObject({ projectId: 'project-1' });
    expect(body.selectedProducts).toEqual(['mk']);
    expect(result).toMatchObject({
      success: true,
      data: {
        jobId: 'job-1',
        status: 'completed',
        pollingUrl: '/api/theme/export-jobs/job-1',
      },
    });
    expect(progressEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'export_status', data: expect.objectContaining({ status: 'queued' }) }),
      expect.objectContaining({ type: 'export_status', data: expect.objectContaining({ status: 'packaging' }) }),
      expect.objectContaining({ type: 'export_status', data: expect.objectContaining({ status: 'completed' }) }),
    ]));
  });

  test('screenshot fails fast when no current project is available', async () => {
    getCurrentProjectIdMock.mockReturnValue(null);

    const result = await executeTool({
      tool: 'screenshot',
      args: { selectedProducts: ['mk'] },
    });

    expect(result).toEqual({ success: false, error: '当前没有可导出的项目，请先生成并确认主题。' });
  });
});
