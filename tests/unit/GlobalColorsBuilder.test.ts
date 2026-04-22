import { describe, expect, test } from 'vitest';

import { buildGlobalColors } from '../../scripts/lib/build-global-colors.mjs';

describe('global colors builder', () => {
  test('builds light-ui global colors with light defaults and derived header fields', () => {
    const result = buildGlobalColors(
      {
        primary: '#2C615C',
        primaryHover: '#B2FFE6',
        alterColor: '#144E48',
        alterColorHoverOn: '#73CAA6',
        primaryOpacity10: '#E9F1EB',
        primaryOpacity20: '#D3E2D8',
        primaryOpacity30: '#BDD4C4',
        headerFont: '#333333',
      },
      'light-ui',
    );

    expect(result.headerFontColor).toBe('#333333');
    expect(result.portalHeaderBgExtendColor).toBe('#144E48');
    expect(result.portalHeaderSimpleFontColorTop).toBe('#333333');
    expect(result.portalHeaderSimpleFontColorHover).toBe('#ffffff');
    expect(result.sidebarPanelBg).toBe('#FFFFFF');
    expect(result.singleHeaderBgExtendColor).toBe('#144E48');
    expect(result.tlayoutHeaderFontColorHover).toBe('#cccccc');
  });

  test('builds dark-ui global colors with dark-specific fallbacks and references', () => {
    const result = buildGlobalColors(
      {
        primary: '#A7160B',
        primaryHover: '#FFD3B2',
        alterColor: '#8A1209',
        alterColorHoverOn: '#E6A87A',
        primaryOpacity10: '#F7E8E6',
        primaryOpacity20: '#EFD2CF',
        primaryOpacity30: '#E7BCB8',
        headerFont: '#FEDECC',
      },
      'dark-ui',
    );

    expect(result.headerFontColor).toBe('#FEDECC');
    expect(result.portalHeaderSimpleBgExtendColor).toBe('$portal-header-bg-extend-color');
    expect(result.portalHeaderSimpleFontColorTop).toBe('#FEDECC');
    expect(result.portalHeaderSimplePureExtendColor).toBe('#A7160B');
    expect(result.sidebarPanelBg).toBe('#FEDECC');
    expect(result.sidebarAccordionPanelHeaderBg).toBe('#A7160B');
    expect(result.searchFontColor).toBe('#FEDECC');
    expect(result.portalHeaderBgExtendColor).toBe('#A7160B');
    expect(result.loginBgColor).toBe('#8A1209');
    expect(result.loginPrimaryColor).toBe('#f8c28c');
    expect(result.loginPrimaryHover).toBe('#fdd0a3');
    expect(result.sidebarColor).toBe('#333333');
    expect(result.sidebarIconColor).toBe('#DCB496');
    expect(result.sidebarAccordionPanelFont).toBe('#333333');
    expect(result.searchInputBorderColor).toBe('#A7160B');
    expect(result.searchPlaceholdFontColor).toBe('#A7160B');
    expect(result.singleHeaderFontColor).toBe('$header-font-color');
    expect(result.tlayoutHeaderBgExtendColor).toBe('$portal-header-bg-extend-color');
  });
});
