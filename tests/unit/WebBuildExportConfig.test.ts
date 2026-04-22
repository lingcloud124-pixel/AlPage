import { describe, expect, test } from 'vitest';

import { buildExportRequestYaml } from '../../web/src/export/build-config';

describe('web build export config', () => {
  test('includes all packaging image keys and preserves selected products only', () => {
    const yaml = buildExportRequestYaml({
      name: '清明主题',
      nameEn: 'qingming',
      themeColor: '#2C615C',
      selectedProducts: ['mk', 'ekp_v17'],
    });

    expect(yaml).toContain('nameEn: "qingming"');
    expect(yaml).toContain('title: "清明主题"');
    expect(yaml).toContain('themeColor: "#2C615C"');

    expect(yaml).toContain('products:');
    expect(yaml).toContain('  - mk');
    expect(yaml).toContain('  - ekp_v17');
    expect(yaml).not.toContain('  - ekp_v12');
    expect(yaml).not.toContain('  - ekp_v13_5');
    expect(yaml).not.toContain('  - ekp_v14_16');

    expect(yaml).toContain('headerBanner: "header-banner.png"');
    expect(yaml).toContain('headerClassic: "header-classic.png"');
    expect(yaml).toContain('headerMenu: "header-menu.png"');
    expect(yaml).toContain('headerSimple: "header-simple.png"');
    expect(yaml).toContain('headerTabs: "header-tabs.png"');
    expect(yaml).toContain('headerIcon: "header-icon.png"');
    expect(yaml).toContain('headerSideheader: "header-sideheader.png"');
    expect(yaml).toContain('loginBackground: "bg-login.jpg"');
  });

  test('truncates packaging title to 10 characters', () => {
    const yaml = buildExportRequestYaml({
      name: '这是一个超过十个字符的主题名称',
      nameEn: 'very-long-theme-name',
      themeColor: '#2C615C',
      selectedProducts: ['mk'],
    });

    expect(yaml).toContain('title: "这是一个超过十个字符"');
    expect(yaml).not.toContain('title: "这是一个超过十个字符的主题名称"');
  });
});
