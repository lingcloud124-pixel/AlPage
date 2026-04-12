export const REQUIRED_EXPORT_FILES = [
  'bg-login.jpg',
  'header-banner.png',
  'header_tlayout_frame_bg.png',
  'header_complex_frame_bg.png',
  'header_simple_frame_bg.png',
  'header_menu_frame_bg.png',
  'header-sideheader.png',
  'header_single_menu_frame_bg.png',
  'desktop.png',
  'layout-banner.jpg',
  'login_thumb.jpg',
  'login_bg/thumb-1.jpg',
  'login_bg/thumb-2.jpg',
];

const COMMON_EXPORT_SIZES = {
  'bg-login.jpg': { width: 2215, height: 1080 },
  'background.png': { width: 1920, height: 1080 },
  'header-banner.png': { width: 2560, height: 480 },
  'header_tlayout_frame_bg.png': { width: 1920, height: 60 },
  'header_complex_frame_bg.png': { width: 1920, height: 90 },
  'header_simple_frame_bg.png': { width: 1920, height: 60 },
  'header_menu_frame_bg.png': { width: 1920, height: 130 },
  'desktop.png': { width: 1440, height: 800 },
  'layout-banner.jpg': { width: 1600, height: 572 },
  'login_thumb.jpg': { width: 960, height: 540 },
  'login_bg/thumb-1.jpg': { width: 800, height: 390 },
  'login_bg/thumb-2.jpg': { width: 800, height: 390 },
};

const TEMPLATE_EXPORT_SIZES = {
  'light-ui': {
    'header-sideheader.png': { width: 200, height: 900 },
  },
  'dark-ui': {
    'header-sideheader.png': { width: 200, height: 488 },
  },
};

export function getExpectedExportSizes(templateType = 'light-ui') {
  return {
    ...COMMON_EXPORT_SIZES,
    ...(TEMPLATE_EXPORT_SIZES[templateType] ?? TEMPLATE_EXPORT_SIZES['light-ui']),
  };
}

export function buildSourceImageFileMap() {
  return {
    headerBanner: 'header-banner.png',
    headerComplex: 'header_complex_frame_bg.png',
    headerSimple: 'header_tlayout_frame_bg.png',
    headerSimpleFrame: 'header_simple_frame_bg.png',
    headerTabs: 'header_tlayout_frame_bg.png',
    headerSideheader: 'header-sideheader.png',
    headerSingleMenuFrameBg: 'header_single_menu_frame_bg.png',
    headerMenu: 'header_menu_frame_bg.png',
    headerZoneFrameBg: 'header_zone_frame_bg.png',
    headerZoneNavFrameBg: 'header_zone_nav_frame_bg.png',
    loginBg: 'bg-login.jpg',
    loginThumb: 'login_thumb.jpg',
    loginBgThumb1: 'login_bg/thumb-1.jpg',
    loginBgThumb2: 'login_bg/thumb-2.jpg',
    desktop: 'desktop.png',
    layoutBanner: 'layout-banner.jpg',
    headerClassic: 'header_complex_frame_bg.png',
    headerSimplePng: 'header_tlayout_frame_bg.png',
    headerIcon: 'header_tlayout_frame_bg.png',
    headerTabsPng: 'header_tlayout_frame_bg.png',
  };
}
