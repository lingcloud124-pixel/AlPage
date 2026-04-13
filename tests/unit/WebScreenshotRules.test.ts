import { describe, expect, test } from 'vitest';

import { getScreenshotTargets } from '../../web/src/export/screenshot-rules';
import { getTemplateConfig } from '../../web/src/theme/template-registry';

describe('web screenshot rules', () => {
  test('derives login and header capture targets from shared config rules', () => {
    const rules = getScreenshotTargets('light-ui');
    const headerTargetsByName = Object.fromEntries(
      rules.header.map((target) => [target.outputName, target]),
    );

    expect(rules.login[0]).toMatchObject({
      selector: '#loginPage',
      outputName: 'bg-login',
      width: 2215,
      height: 1080,
      format: 'jpeg',
    });

    expect(headerTargetsByName.header_tlayout_frame_bg).toMatchObject({
      selector: '.template-header-default',
      outputName: 'header_tlayout_frame_bg',
      width: 1920,
      height: 60,
      format: 'png',
      templateId: 'header-default',
    });

    expect(headerTargetsByName.header_complex_frame_bg).toMatchObject({
      selector: '.template-header-complex',
      outputName: 'header_complex_frame_bg',
      width: 1920,
      height: 90,
      format: 'png',
      templateId: 'header-complex',
    });

    expect(headerTargetsByName.header_menu_frame_bg).toMatchObject({
      selector: '.template-header-menu',
      outputName: 'header_menu_frame_bg',
      width: 1920,
      height: 130,
      format: 'png',
      templateId: 'header-menu',
    });

    expect(headerTargetsByName['header-banner']).toMatchObject({
      selector: '.template-header-banner',
      outputName: 'header-banner',
      width: 2560,
      height: 480,
      format: 'png',
      templateId: 'header-banner',
    });

    expect(headerTargetsByName['header-sideheader']).toMatchObject({
      selector: '.desktop-sidebar',
      outputName: 'header-sideheader',
      width: 200,
      height: 900,
      format: 'png',
    });
  });

  test('supports dark-ui sideheader dimensions from shared config', () => {
    const rules = getScreenshotTargets('dark-ui');
    const sideHeader = rules.header.find((target) => target.outputName === 'header-sideheader');

    expect(sideHeader).toMatchObject({
      outputName: 'header-sideheader',
      width: 200,
      height: 488,
    });
  });

  test('derives page capture dimensions from the template registry', () => {
    const rules = getScreenshotTargets('light-ui');

    expect(rules.login[0].width).toBe(getTemplateConfig('login')?.width);
    expect(rules.login[0].height).toBe(getTemplateConfig('login')?.height);
    expect(rules.desktop[0].width).toBe(getTemplateConfig('desktop')?.width);
    expect(rules.desktop[0].height).toBe(getTemplateConfig('desktop')?.height);
  });
});
