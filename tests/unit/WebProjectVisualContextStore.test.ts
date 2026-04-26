import { beforeEach, describe, expect, test } from 'vitest';
import {
  deleteProjectVisualContext,
  loadProjectVisualContext,
  updateProjectVisualContext,
} from '../../web/src/tools/project-visual-context-store';

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

describe('web project visual context store', () => {
  beforeEach(() => {
    localStorage.clear();
    deleteProjectVisualContext('p-1');
  });

  test('keeps image data url out of persisted localStorage payload while preserving runtime access', () => {
    updateProjectVisualContext('p-1', {
      imageInput: {
        dataUrl: 'data:image/png;base64,abc123',
        role: 'primary',
        sourceText: '用这张图生成主题',
        explicitReason: '命中主图强指令词。',
        updatedAt: 1,
      },
    });

    const persistedRaw = localStorage.getItem('theme-agent-project-visual-contexts');
    expect(persistedRaw).toBeTruthy();
    expect(persistedRaw).not.toContain('data:image/png;base64,abc123');

    const loaded = loadProjectVisualContext('p-1');
    expect(loaded.imageInput?.dataUrl).toBe('data:image/png;base64,abc123');
    expect(loaded.imageInput?.role).toBe('primary');
  });
});
