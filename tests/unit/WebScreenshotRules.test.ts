import { describe, expect, test } from 'vitest';

import { getScreenshotTargets } from '../../web/src/export/screenshot-rules';
import { getTemplateConfig } from '../../web/src/theme/template-registry';

describe('web screenshot rules', () => {
  test('derives login and header capture targets from shared config rules', () => {
    const rules = getScreenshotTargets('light-ui');

    expect(rules.login[0]).toMatchObject({
      selector: '#loginPage',
      outputName: 'bg-login',
      width: 2215,
      height: 1080,
      format: 'jpeg',
    });

    expect(rules.header[0]).toMatchObject({
      selector: '.desktop-header',
      outputName: 'header_tlayout_frame_bg',
      width: 1920,
      height: 60,
      format: 'png',
    });

    expect(rules.header[1]).toMatchObject({
      selector: '.desktop-sidebar',
      outputName: 'header-sideheader',
      width: 200,
      height: 900,
      format: 'png',
    });
  });

  test('supports dark-ui sideheader dimensions from shared config', () => {
    const rules = getScreenshotTargets('dark-ui');

    expect(rules.header[1]).toMatchObject({
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
