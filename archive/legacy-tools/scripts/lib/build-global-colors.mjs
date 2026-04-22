import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeRelationsPath = path.join(__dirname, '../../config/theme-relations.json');
const themeRelations = JSON.parse(fs.readFileSync(themeRelationsPath, 'utf8'));
const DARK_UI_SPECIAL_COLORS = themeRelations.darkUiSpecialColors;
const DARK_UI_PALETTE_RULES = themeRelations.darkUiPaletteRules;

export function buildGlobalColors(colors, templateType = 'light-ui') {
  const isDarkUI = templateType === 'dark-ui';
  const darkFixed = DARK_UI_PALETTE_RULES.fixed;
  const headerFontDark = colors.headerFont || darkFixed.headerFontColor;
  const portalHeaderBgDark = colors.portalHeaderBgExtendColor || colors.primary;
  const portalHeaderComplexBgDark = colors.portalHeaderComplexBgExtendColor || portalHeaderBgDark;
  const loginBgDark = colors.loginBgColor || colors.loginBg || colors.portalHeaderBgExtendColor || colors.alterColor;
  const sidebarIconDark = colors.sidebarIconColor || darkFixed.sidebarIconColor;

  return {
    templateType,
    primary: colors.primary,
    primaryHover: colors.primaryHover,
    alterColor: colors.alterColor,
    alterColorHoverOn: colors.alterColorHoverOn,
    primaryOpacity10: colors.primaryOpacity10 || (colors.primary + '1A'),
    primaryOpacity20: colors.primaryOpacity20 || (colors.primary + '33'),
    primaryOpacity30: colors.primaryOpacity30 || (colors.primary + '4D'),
    headerFontColor: colors.headerFont || (isDarkUI ? darkFixed.headerFontColor : '#333333'),
    headerFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '#ffffff',
    portalHeaderBgExtendColor: isDarkUI ? portalHeaderBgDark : colors.alterColor,
    portalHeaderPureExtendColor: isDarkUI ? (colors.portalHeaderPureExtendColor || portalHeaderBgDark) : colors.alterColor,
    portalHeaderComplexBgExtendColor: isDarkUI ? portalHeaderComplexBgDark : colors.alterColor,
    portalHeaderComplexPureExtendColor: isDarkUI ? (colors.portalHeaderComplexPureExtendColor || portalHeaderBgDark) : colors.alterColor,
    portalHeaderFontColor: '$header-font-color',
    portalHeaderFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '$primary-color',
    portalHeaderSimpleBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.alterColor,
    portalHeaderSimpleFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '#ffffff',
    portalHeaderSimpleFontColorTop: isDarkUI ? headerFontDark : '#333333',
    portalHeaderSimplePureExtendColor: isDarkUI ? (colors.portalHeaderPureExtendColor || portalHeaderBgDark) : colors.alterColor,
    portalHeaderZoneBgExtendColor: colors.alterColor,
    portalHeaderZoneFontColor: isDarkUI ? '$header-font-color' : '#333333',
    portalHeaderZoneFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '#cccccc',
    loginBgColor: isDarkUI ? loginBgDark : colors.alterColor,
    sidebarColor: isDarkUI ? darkFixed.sidebarColor : '#2A2045',
    sidebarIconColor: isDarkUI ? sidebarIconDark : colors.primaryHover,
    sidebarIconColorHover: '#ffffff',
    sidebarPanelBg: isDarkUI ? (colors.sidebarPanelBg || darkFixed.headerFontColor) : '#FFFFFF',
    sidebarAccordionPanelFont: isDarkUI ? darkFixed.sidebarAccordionPanelFont : '#333333',
    sidebarAccordionPanelHeaderBg: isDarkUI ? colors.primary : 'transparent',
    sidebarAccordionPanelHeaderBgOn: isDarkUI ? colors.alterColor : colors.primary,
    sidebarItemCurrentColor: isDarkUI ? '#fff' : '#333333',
    sidebarItemCurrentHex: colors.alterColor,
    searchFontColor: isDarkUI ? headerFontDark : colors.headerFont,
    searchInputBorderColor: isDarkUI ? colors.primary : (colors.headerFont || colors.primary),
    searchPlaceholdFontColor: isDarkUI ? colors.primary : (colors.headerFont || colors.primary),
    auxiliaryGray: isDarkUI ? darkFixed.auxiliaryGray : '#999999',
    auxiliaryGrayDark: isDarkUI ? darkFixed.auxiliaryGrayDark : '#666666',
    bodyBgColor: isDarkUI ? darkFixed.bodyBgColor : '#F8F8F8',
    hoverBgColor: '#f8f8f8',
    linkText: colors.primary,
    linkTextOn: colors.alterColor,
    borderColor: isDarkUI ? darkFixed.borderColor : '#eeeeee',
    borderIconColor: isDarkUI ? darkFixed.borderIconColor : '#eeeeee',
    loginPrimaryColor: isDarkUI ? DARK_UI_SPECIAL_COLORS.login.buttonBackground : colors.primaryHover,
    loginPrimaryHover: isDarkUI ? DARK_UI_SPECIAL_COLORS.login.buttonHoverBackground : (colors.headerFont || '#ffffff'),
    lightPrimaryColorHover: isDarkUI ? '$primary-color-hover' : '$primary-color',
    singleHeaderBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.alterColor,
    singleHeaderFontColor: isDarkUI ? '$header-font-color' : '#333333',
    singleHeaderFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '#ffffff',
    tlayoutHeaderBgExtendColor: isDarkUI ? '$portal-header-bg-extend-color' : colors.alterColor,
    tlayoutHeaderFontColor: isDarkUI ? '$header-font-color' : '#333333',
    tlayoutHeaderFontColorHover: isDarkUI ? (colors.headerFontColorHover || colors.primary) : '#cccccc',
  };
}
