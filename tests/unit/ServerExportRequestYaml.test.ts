import { describe, expect, test } from 'vitest';

import { buildServerExportRequestYaml } from '../../server/src/export-request-yaml';

describe('server export request yaml', () => {
  test('uses metadata-relative asset paths so service packaging can resolve generated images', () => {
    const yaml = buildServerExportRequestYaml({
      name: '清明主题',
      nameEn: 'qingming',
      templateType: 'light-ui',
      selectedProducts: ['mk', 'ekp_v17'],
      colors: {
        'primary-color': '#2C615C',
        'header-font-color': '#FFFFFF',
      },
    });

    expect(yaml).toContain('nameEn: "qingming"');
    expect(yaml).toContain('title: "清明主题"');
    expect(yaml).toContain('products:');
    expect(yaml).toContain('  - mk');
    expect(yaml).toContain('  - ekp_v17');
    expect(yaml).toContain('headerBanner: "../素材包/header-banner.png"');
    expect(yaml).toContain('loginBackground: "../素材包/bg-login.jpg"');
    expect(yaml).toContain('loginThumb1: "../素材包/login_bg/thumb-1.jpg"');
    expect(yaml).toContain('desktop: "../素材包/desktop.png"');
    expect(yaml).toContain('studyBanner: "../素材包/study_banner.png"');
  });

  test('keeps optional login logo empty when no generated login logo exists', () => {
    const yaml = buildServerExportRequestYaml({
      name: '清明主题',
      templateType: 'light-ui',
      selectedProducts: ['mk'],
      colors: {},
    });

    expect(yaml).toContain('loginLogo: ""');
  });
});
