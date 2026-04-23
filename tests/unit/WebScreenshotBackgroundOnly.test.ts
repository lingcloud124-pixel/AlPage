import { describe, expect, test } from 'vitest';

import { buildExportAssetSnapshot } from '../../web/src/export/asset-snapshot';

describe('web generated asset source contract', () => {
  test('marks only thumbnails as preview-html while login and header/sidebar stay on background-image', () => {
    const snapshot = buildExportAssetSnapshot({
      project: {
        id: 'project-123',
        name: '清明',
        themeName: '清明',
        templateType: 'light-ui',
        colors: {},
        createdAt: 1,
        updatedAt: 1,
      } as any,
      cssVariables: {},
      selectedProducts: ['mk'],
      nameEn: 'project-123-qingming',
      now: 1712999999000,
    });

    expect(snapshot.assetSources).toEqual({
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    });
  });
});
