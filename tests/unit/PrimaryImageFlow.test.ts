import { beforeEach, describe, expect, test, vi } from 'vitest';

const { executeToolMock, loadProjectMock, saveProjectMock, saveCurrentColorsToProjectMock, syncColorEditorFromThemeMock, updateProjectVisualContextMock } = vi.hoisted(() => ({
  executeToolMock: vi.fn(),
  loadProjectMock: vi.fn(),
  saveProjectMock: vi.fn(),
  saveCurrentColorsToProjectMock: vi.fn(),
  syncColorEditorFromThemeMock: vi.fn(),
  updateProjectVisualContextMock: vi.fn(),
}));

vi.mock('../../web/src/tools/executor', () => ({
  executeTool: executeToolMock,
}));

vi.mock('../../web/src/project-manager', () => ({
  loadProject: loadProjectMock,
  saveProject: saveProjectMock,
}));

vi.mock('../../web/src/theme-engine', () => ({
  saveCurrentColorsToProject: saveCurrentColorsToProjectMock,
}));

vi.mock('../../web/src/components/color-editor', () => ({
  syncColorEditorFromTheme: syncColorEditorFromThemeMock,
}));

vi.mock('../../web/src/tools/project-visual-context-store', () => ({
  updateProjectVisualContext: updateProjectVisualContextMock,
}));

import { applyPrimaryImageToProject } from '../../web/src/primary-image-flow';

describe('primary image flow', () => {
  beforeEach(() => {
    executeToolMock.mockReset();
    loadProjectMock.mockReset();
    saveProjectMock.mockReset();
    saveCurrentColorsToProjectMock.mockReset();
    syncColorEditorFromThemeMock.mockReset();
    updateProjectVisualContextMock.mockReset();
  });

  test('passes the primary image message through as semantic source text', async () => {
    loadProjectMock.mockResolvedValue({
      projectId: 'p1',
      templateType: 'light-ui',
      visualContext: null,
    });
    saveProjectMock.mockResolvedValue(undefined);
    saveCurrentColorsToProjectMock.mockResolvedValue(undefined);
    executeToolMock.mockResolvedValue({
      success: true,
      data: {
        primaryColor: '#6A2500',
      },
    });

    await applyPrimaryImageToProject({
      projectId: 'p1',
      imageDataUrl: 'data:image/png;base64,abc',
      message: '生生不息 共筑未来',
    });

    expect(executeToolMock).toHaveBeenCalledWith({
      tool: 'apply_selected_theme',
      args: expect.objectContaining({
        semanticSourceText: '生生不息 共筑未来',
      }),
    });
  });

  test('passes collaboration office message through so primary image flow can avoid noisy cyan extraction', async () => {
    loadProjectMock.mockResolvedValue({
      projectId: 'p1',
      templateType: 'light-ui',
      visualContext: null,
    });
    saveProjectMock.mockResolvedValue(undefined);
    saveCurrentColorsToProjectMock.mockResolvedValue(undefined);
    executeToolMock.mockResolvedValue({
      success: true,
      data: {
        primaryColor: '#11A6B8',
      },
    });

    await applyPrimaryImageToProject({
      projectId: 'p1',
      imageDataUrl: 'data:image/png;base64,abc',
      message: '用这张图，生成一个协作办公主题包',
    });

    expect(executeToolMock).toHaveBeenCalledWith({
      tool: 'apply_selected_theme',
      args: expect.objectContaining({
        semanticSourceText: '用这张图，生成一个协作办公主题包',
      }),
    });
  });
});
