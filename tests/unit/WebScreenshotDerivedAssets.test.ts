import { describe, expect, test } from 'vitest';

import { buildPreviewCaptureTasks } from '../../web/scripts/screenshot';

describe('web screenshot preview capture tasks', () => {
  test('keeps preview-html outputs aligned with packaging filenames', () => {
    const tasks = buildPreviewCaptureTasks({
      version: 1,
      templateType: 'light-ui',
      sourceImage: '/tmp/source.png',
      assets: {},
      pendingPreviewCaptures: [
        { id: 'desktop', output: 'desktop.png', width: 1440, height: 800, format: 'PNG', recipe: 'desktop-thumbnail' },
        { id: 'layoutBanner', output: 'layout-banner.jpg', width: 1600, height: 572, format: 'JPEG', recipe: 'layout-thumbnail' },
        { id: 'themeThumb', output: 'thumb.jpg', width: 1440, height: 800, format: 'JPEG', recipe: 'desktop-thumbnail' },
        { id: 'bannerPersonal', output: 'banner_personal.png', width: 1600, height: 572, format: 'PNG', recipe: 'layout-thumbnail' },
        { id: 'studyBanner', output: 'study_banner.png', width: 1600, height: 572, format: 'PNG', recipe: 'layout-thumbnail' },
      ],
    }, '/tmp/theme-studio-assets');

    const outputs = tasks.map((task) => task.output);

    expect(outputs).toContain('/tmp/theme-studio-assets/desktop.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/layout-banner.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/thumb.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/banner_personal.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/study_banner.png');
    expect(outputs).not.toContain('/tmp/theme-studio-assets/background.png');
  });
});
