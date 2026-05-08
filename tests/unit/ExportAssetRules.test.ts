import { describe, expect, test } from 'vitest';

import outputMapping from '../../config/image-output-mapping.json';
import sandwichRules from '../../config/image-sandwich-rules.json';
import assetSources from '../../config/export-asset-sources.json';

describe('export asset rules', () => {
  test('required export files include packaging-critical background and preview assets', () => {
    const requiredFiles = [
      ...outputMapping.login.map((item) => item.output),
      ...outputMapping.headerSidebar.map((item) => item.output),
      ...outputMapping.thumbnails.map((item) => item.output),
    ];

    expect(requiredFiles).toContain('bg-login.jpg');
    expect(requiredFiles).toContain('login_thumb.jpg');
    expect(requiredFiles).toContain('login_bg/thumb-1.jpg');
    expect(requiredFiles).toContain('header-banner.png');
    expect(requiredFiles).toContain('header-sideheader.png');
    expect(requiredFiles).toContain('desktop.png');
    expect(requiredFiles).toContain('layout-banner.jpg');
    expect(requiredFiles).toContain('thumb.jpg');
  });

  test('light-ui and dark-ui sideheader dimensions stay aligned with output mapping', () => {
    const sideHeader = outputMapping.headerSidebar.find((item) => item.output === 'header-sideheader.png');

    expect(sideHeader?.widthByTheme?.['light-ui']).toBe(200);
    expect(sideHeader?.heightByTheme?.['light-ui']).toBe(900);
    expect(sideHeader?.widthByTheme?.['dark-ui']).toBe(200);
    expect(sideHeader?.heightByTheme?.['dark-ui']).toBe(488);
  });

  test('preview-derived cover assets stay aligned with sample package dimensions', () => {
    const desktop = outputMapping.thumbnails.find((item) => item.output === 'desktop.png');
    const layoutBanner = outputMapping.thumbnails.find((item) => item.output === 'layout-banner.jpg');
    const themeThumb = outputMapping.thumbnails.find((item) => item.output === 'thumb.jpg');
    const bannerPersonal = outputMapping.headerSidebar.find((item) => item.output === 'banner_personal.png');
    const studyBanner = outputMapping.thumbnails.find((item) => item.output === 'study_banner.png');

    expect(desktop).toMatchObject({ width: 1440, height: 800 });
    expect(layoutBanner).toMatchObject({ width: 1600, height: 572 });
    expect(themeThumb).toMatchObject({ width: 720, height: 510 });
    expect(bannerPersonal).toMatchObject({ width: 2562, height: 204, recipe: 'header' });
    expect(studyBanner).toMatchObject({ width: 2560, height: 100 });
  });

  test('mk header cuts keep sample-package dimensions instead of collapsing to ekp defaults', () => {
    const headerSimple = outputMapping.headerSidebar.find((item) => item.output === 'header-simple.png');
    const headerTabs = outputMapping.headerSidebar.find((item) => item.output === 'header-tabs.png');
    const ekpDefaultHeader = outputMapping.headerSidebar.find((item) => item.output === 'header_tlayout_frame_bg.png');

    expect(headerSimple).toMatchObject({ width: 1920, height: 90, recipe: 'header' });
    expect(headerTabs).toMatchObject({ width: 1920, height: 90, recipe: 'header' });
    expect(ekpDefaultHeader).toMatchObject({ width: 1920, height: 60, recipe: 'header' });
  });

  test('light-ui sandwich rules use the PDF variable name first and keep compatibility fallback', () => {
    expect(sandwichRules['light-ui'].header.baseColorVar).toBe('tlayout-header-bg-extend-color');
    expect(sandwichRules['light-ui'].header.gradientColorVar).toBe('tlayout-header-bg-extend-color');
    expect(sandwichRules['light-ui'].header.gradientMode).toBe('mirrored-horizontal');
    expect(sandwichRules['light-ui'].header.gradientStartVar).toBe('gradient-start');
    expect(sandwichRules['light-ui'].header.gradientMidVar).toBe('gradient-mid');
    expect(sandwichRules['light-ui'].header.fallbackColorVar).toBe('portal-header-bg-extend-color');
    expect(sandwichRules['light-ui'].sidebar.baseColorVar).toBe('tlayout-header-bg-extend-color');
  });

  test('asset source config clearly separates background-image and preview-html groups', () => {
    const groups = Object.fromEntries(assetSources.groups.map((group) => [group.id, group.sourceType]));

    expect(groups).toEqual({
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    });
  });
});
