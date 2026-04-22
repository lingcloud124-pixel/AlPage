export interface ExportRequestOptions {
  name: string;
  nameEn?: string;
  themeColor: string;
  templateType: 'light-ui' | 'dark-ui';
  selectedProducts: string[];
  subtitle?: string;
  buttonText?: string;
  headerFont?: string;
  colors?: Record<string, string>;
}

const IMAGE_FILE_MAP = {
  headerBanner: 'header-banner.png',
  headerClassic: 'header-classic.png',
  headerMenu: 'header-menu.png',
  headerSimple: 'header-simple.png',
  headerTabs: 'header-tabs.png',
  headerIcon: 'header-icon.png',
  headerSideheader: 'header-sideheader.png',
  loginBackground: 'bg-login.jpg',
  loginBackgroundPng: 'background.png',
  loginThumb: 'login_thumb.jpg',
  loginThumb1: 'login_bg/thumb-1.jpg',
  loginThumb2: 'login_bg/thumb-2.jpg',
  desktop: 'desktop.png',
  layoutBanner: 'layout-banner.jpg',
  fullscreenSideheader: 'fullscreen-sideheader.jpg',
  fullscreenSidenav: 'fullscreen-sidenav.jpg',
  centerSidenav: 'center-sidenav.jpg',
  themeThumb: 'thumb.jpg',
  bannerPersonal: 'banner_personal.png',
  studyBanner: 'study_banner.png',
  loginLogo: '',
} as const;

const MAX_PACKAGE_TITLE_LENGTH = 10;

function truncateByCharacters(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join('');
}

export function clampPackageTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '未命名主题';
  return truncateByCharacters(trimmed, MAX_PACKAGE_TITLE_LENGTH);
}

export function buildExportRequestYaml(options: ExportRequestOptions): string {
  const packageTitle = clampPackageTitle(options.name);
  const productsYaml = options.selectedProducts.map((product) => `  - ${product}`).join('\n');
  const normalizedColors = Object.entries(options.colors ?? {})
    .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value] as const)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const colorsYaml = normalizedColors.length > 0
    ? `colors:\n${normalizedColors.map(([name, value]) => `  ${name}: "${value}"`).join('\n')}\n`
    : '';
  const nameEnYaml = options.nameEn?.trim()
    ? `nameEn: "${options.nameEn.trim()}"\n`
    : '';

  return `${nameEnYaml}title: "${packageTitle}"
subtitle: "${options.subtitle ?? packageTitle}"
buttonText: "${options.buttonText ?? '立即进入'}"
themeColor: "${options.themeColor}"
templateType: "${options.templateType}"
headerFont: "${options.headerFont ?? ''}"
products:
${productsYaml}
${colorsYaml}images:
  headerBanner: "${IMAGE_FILE_MAP.headerBanner}"
  headerClassic: "${IMAGE_FILE_MAP.headerClassic}"
  headerMenu: "${IMAGE_FILE_MAP.headerMenu}"
  headerSimple: "${IMAGE_FILE_MAP.headerSimple}"
  headerTabs: "${IMAGE_FILE_MAP.headerTabs}"
  headerIcon: "${IMAGE_FILE_MAP.headerIcon}"
  headerSideheader: "${IMAGE_FILE_MAP.headerSideheader}"
  loginBackground: "${IMAGE_FILE_MAP.loginBackground}"
  loginBackgroundPng: "${IMAGE_FILE_MAP.loginBackgroundPng}"
  loginThumb: "${IMAGE_FILE_MAP.loginThumb}"
  loginThumb1: "${IMAGE_FILE_MAP.loginThumb1}"
  loginThumb2: "${IMAGE_FILE_MAP.loginThumb2}"
  desktop: "${IMAGE_FILE_MAP.desktop}"
  layoutBanner: "${IMAGE_FILE_MAP.layoutBanner}"
  fullscreenSideheader: "${IMAGE_FILE_MAP.fullscreenSideheader}"
  fullscreenSidenav: "${IMAGE_FILE_MAP.fullscreenSidenav}"
  centerSidenav: "${IMAGE_FILE_MAP.centerSidenav}"
  themeThumb: "${IMAGE_FILE_MAP.themeThumb}"
  bannerPersonal: "${IMAGE_FILE_MAP.bannerPersonal}"
  studyBanner: "${IMAGE_FILE_MAP.studyBanner}"
  loginLogo: "${IMAGE_FILE_MAP.loginLogo}"
`;
}
