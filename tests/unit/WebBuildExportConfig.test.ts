import { describe, expect, test } from 'vitest';

import { buildExportRequestYaml } from '../../web/src/export/build-config';

describe('web build export config', () => {
  test('includes all packaging image keys and preserves selected products only', () => {
    const yaml = buildExportRequestYaml({
      name: '清明主题',
      themeColor: '#2C615C',
      selectedProducts: ['mk', 'ekp_v17'],
    });

    expect(yaml).toContain('title: "清明主题"');
    expect(yaml).toContain('themeColor: "#2C615C"');

    expect(yaml).toContain('products:');
    expect(yaml).toContain('  - mk');
    expect(yaml).toContain('  - ekp_v17');
    expect(yaml).not.toContain('  - ekp_v12');
    expect(yaml).not.toContain('  - ekp_v13_5');
    expect(yaml).not.toContain('  - ekp_v14_16');

    expect(yaml).toContain('headerBanner: "header-banner.png"');
    expect(yaml).toContain('headerClassic: "header_complex_frame_bg.png"');
    expect(yaml).toContain('headerMenu: "header_menu_frame_bg.png"');
    expect(yaml).toContain('headerSimple: "header_tlayout_frame_bg.png"');
    expect(yaml).toContain('headerTabs: "header_zone_frame_bg.png"');
    expect(yaml).toContain('headerIcon: "header_zone_nav_frame_bg.png"');
    expect(yaml).toContain('headerSideheader: "header-sideheader.png"');
    expect(yaml).toContain('loginBackground: "bg-login.jpg"');
  });
});
