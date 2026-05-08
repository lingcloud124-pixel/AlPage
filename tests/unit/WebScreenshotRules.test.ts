import { describe, expect, test } from 'vitest';

import { getScreenshotTargets } from '../../web/src/export/screenshot-rules';

describe('web screenshot rules', () => {
  test('reads thumbnail screenshot targets from shared output mapping config', () => {
    const rules = getScreenshotTargets('light-ui');
    const thumbnailTargetsByName = Object.fromEntries(
      rules.desktop.map((target) => [target.outputName, target]),
    );

    expect(thumbnailTargetsByName.desktop).toMatchObject({
      selector: '.desktop-wrapper',
      outputName: 'desktop',
      width: 1440,
      height: 800,
      format: 'png',
    });

    expect(thumbnailTargetsByName['layout-banner']).toMatchObject({
      selector: '.desktop-wrapper',
      outputName: 'layout-banner',
      width: 1600,
      height: 572,
      format: 'jpeg',
    });

    expect(thumbnailTargetsByName.thumb).toMatchObject({
      selector: '.desktop-wrapper',
      outputName: 'thumb',
      width: 720,
      height: 510,
      format: 'jpeg',
    });
  });

  test('keeps dark-ui sidebar screenshot dimensions aligned with shared config', () => {
    const rules = getScreenshotTargets('dark-ui');
    const sideHeader = rules.header.find((target) => target.outputName === 'header-sideheader');

    expect(sideHeader).toMatchObject({
      outputName: 'header-sideheader',
      width: 200,
      height: 488,
      format: 'png',
    });
  });

  test('keeps mk-oriented simple and tabs header cuts distinct from 60px ekp defaults', () => {
    const rules = getScreenshotTargets('light-ui');
    const headerSimple = rules.header.find((target) => target.outputName === 'header-simple');
    const headerTabs = rules.header.find((target) => target.outputName === 'header-tabs');
    const ekpDefaultHeader = rules.header.find((target) => target.outputName === 'header_tlayout_frame_bg');

    expect(headerSimple).toMatchObject({ outputName: 'header-simple', width: 1920, height: 90, format: 'png' });
    expect(headerTabs).toMatchObject({ outputName: 'header-tabs', width: 1920, height: 90, format: 'png' });
    expect(ekpDefaultHeader).toMatchObject({ outputName: 'header_tlayout_frame_bg', width: 1920, height: 60, format: 'png' });
  });
});
