import { describe, expect, test } from 'vitest';
import type { Project } from '../../web/src/project-manager';
import { buildConfirmedProjectSnapshot } from '../../web/src/export/online-export';

function createProject(): Project {
  return {
    id: 'project-1',
    name: '清明主题',
    themeName: '清明主题',
    nameEn: 'qingming',
    templateType: 'light-ui',
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

describe('web online export', () => {
  test('builds a confirmed project snapshot from the current project state', () => {
    const snapshot = buildConfirmedProjectSnapshot(createProject(), 3000);

    expect(snapshot).toMatchObject({
      projectId: 'project-1',
      name: '清明主题',
      nameEn: 'project-1-qingming',
      templateType: 'light-ui',
      bgImageUrl: '/images/qingming.png',
      headerBgImageUrl: '/images/header.png',
      sourceUpdatedAt: 2000,
      confirmedAt: 3000,
    });
    expect(snapshot.colors['primary-color']).toBe('#2C615C');
  });

  test('replaces blob image urls with the original primary image in confirmed snapshots', () => {
    const snapshot = buildConfirmedProjectSnapshot({
      ...createProject(),
      bgImageUrl: 'blob:http://127.0.0.1:5173/runtime-login',
      headerBgImageUrl: 'blob:http://127.0.0.1:5173/runtime-header',
      visualContext: {
        projectId: 'project-1',
        mustHaveElements: [],
        avoidElements: [],
        temporaryAdjustments: [],
        imageInput: {
          dataUrl: 'data:image/png;base64,AAAA',
          role: 'primary',
          updatedAt: 2000,
        },
        updatedAt: 2000,
      },
    }, 3000);

    expect(snapshot.bgImageUrl).toBe('data:image/png;base64,AAAA');
    expect(snapshot.headerBgImageUrl).toBe('data:image/png;base64,AAAA');
  });
});
