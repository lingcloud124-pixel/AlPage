import { describe, expect, test } from 'vitest';

import { buildLivePreviewProjectSnapshot } from '../../web/src/export/live-preview-snapshot';
import type { Project } from '../../web/src/project-manager';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-live-preview',
    name: '主图主题',
    themeName: '主图主题',
    templateType: 'light-ui',
    colors: {
      'primary-color': '#2C615C',
      'header-font-color': '#333333',
    },
    bgImageUrl: 'data:image/png;base64,AAAABBBB',
    headerBgImageUrl: 'https://example.com/header.png',
    visualContext: {
      projectId: 'project-live-preview',
      mustHaveElements: [],
      avoidElements: [],
      temporaryAdjustments: [],
      imageInput: {
        dataUrl: 'data:image/png;base64,AAAABBBB',
        role: 'primary',
        updatedAt: 1,
      },
      updatedAt: 1,
    },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('web live preview snapshot', () => {
  test('falls back to original primary image when preview css uses a blob url', async () => {
    const panelStyleValues = new Map<string, string>([
      ['--theme-login-bg-image', "url('blob:http://127.0.0.1:5173/runtime-login')"],
      ['--theme-header-bg-image', "url('blob:http://127.0.0.1:5173/runtime-header')"],
    ]);
    const localStorageState = new Map<string, string>([
      ['theme-agent-project-visual-contexts', JSON.stringify({
        'project-live-preview': {
          projectId: 'project-live-preview',
          mustHaveElements: [],
          avoidElements: [],
          temporaryAdjustments: [],
          imageInput: {
            dataUrl: '',
            role: 'primary',
            updatedAt: 1,
          },
          updatedAt: 1,
        },
      })],
    ]);

    const originalDocument = globalThis.document;
    const originalComputedStyle = globalThis.getComputedStyle;
    const originalLocalStorage = globalThis.localStorage;

    const panel = {
      style: {
        getPropertyValue(name: string) {
          return panelStyleValues.get(name) ?? '';
        },
      },
    };

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        getElementById(id: string) {
          return id === 'previewPanel' ? panel : null;
        },
      },
    });
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      value: () => ({
        getPropertyValue(name: string) {
          return panelStyleValues.get(name) ?? '';
        },
      }),
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem(key: string) {
          return localStorageState.get(key) ?? null;
        },
        setItem() {},
        removeItem() {},
      },
    });

    try {
      const store = await import('../../web/src/tools/project-visual-context-store');
      store.saveProjectVisualContext({
        projectId: 'project-live-preview',
        mustHaveElements: [],
        avoidElements: [],
        temporaryAdjustments: [],
        imageInput: {
          dataUrl: 'data:image/png;base64,AAAABBBB',
          role: 'primary',
          updatedAt: 1,
        },
        updatedAt: 1,
      });

      const snapshot = buildLivePreviewProjectSnapshot(createProject(), {
        'primary-color': '#24504C',
      });

      expect(snapshot.bgImageUrl).toBe('data:image/png;base64,AAAABBBB');
      expect(snapshot.headerBgImageUrl).toBe('data:image/png;base64,AAAABBBB');
      expect(snapshot.colors['primary-color']).toBe('#24504C');
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        value: originalComputedStyle,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  test('keeps normal preview image urls when they are not blob urls', () => {
    const originalDocument = globalThis.document;
    const originalComputedStyle = globalThis.getComputedStyle;

    const panel = {
      style: {
        getPropertyValue(name: string) {
          if (name === '--theme-login-bg-image') return "url('https://example.com/runtime-login.png')";
          return '';
        },
      },
    };

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        getElementById(id: string) {
          return id === 'previewPanel' ? panel : null;
        },
      },
    });
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      value: () => ({
        getPropertyValue(name: string) {
          if (name === '--theme-login-bg-image') return "url('https://example.com/runtime-login.png')";
          return '';
        },
      }),
    });

    try {
      const snapshot = buildLivePreviewProjectSnapshot(createProject(), {});
      expect(snapshot.bgImageUrl).toBe('https://example.com/runtime-login.png');
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
      Object.defineProperty(globalThis, 'getComputedStyle', {
        configurable: true,
        value: originalComputedStyle,
      });
    }
  });
});
