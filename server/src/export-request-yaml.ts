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
const ASSET_DIR_RELATIVE_TO_METADATA = '../素材包';

export interface ServerExportRequestYamlOptions {
  name: string;
  nameEn?: string;
  templateType: 'light-ui' | 'dark-ui';
  selectedProducts: string[];
  colors: Record<string, string>;
}

function truncateByCharacters(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join('');
}

function clampPackageTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '未命名主题';
  return truncateByCharacters(trimmed, MAX_PACKAGE_TITLE_LENGTH);
}

function normalizeCssVariables(colors: Record<string, string>): Array<readonly [string, string]> {
  return Object.entries(colors)
    .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value] as const)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
}

function toYamlImagePath(relativeFilePath: string): string {
  if (!relativeFilePath) return '';
  return `${ASSET_DIR_RELATIVE_TO_METADATA}/${relativeFilePath}`;
}

export function buildServerExportRequestYaml(options: ServerExportRequestYamlOptions): string {
  const packageTitle = clampPackageTitle(options.name);
  const normalizedColors = normalizeCssVariables(options.colors);
  const productsYaml = options.selectedProducts.map((product) => `  - ${product}`).join('\n');
  const colorsYaml = normalizedColors.length > 0
    ? `colors:\n${normalizedColors.map(([name, value]) => `  ${name}: "${value}"`).join('\n')}\n`
    : '';
  const primaryColor = options.colors['primary-color']
    || options.colors['--primary-color']
    || '#2C615C';
  const headerFont = options.colors['header-font-color']
    || options.colors['--header-font-color']
    || '';
  const nameEnYaml = options.nameEn?.trim() ? `nameEn: "${options.nameEn.trim()}"\n` : '';

  return `${nameEnYaml}title: "${packageTitle}"
subtitle: "${packageTitle}"
buttonText: "立即进入"
themeColor: "${primaryColor}"
templateType: "${options.templateType}"
headerFont: "${headerFont}"
products:
${productsYaml}
${colorsYaml}images:
  headerBanner: "${toYamlImagePath(IMAGE_FILE_MAP.headerBanner)}"
  headerClassic: "${toYamlImagePath(IMAGE_FILE_MAP.headerClassic)}"
  headerMenu: "${toYamlImagePath(IMAGE_FILE_MAP.headerMenu)}"
  headerSimple: "${toYamlImagePath(IMAGE_FILE_MAP.headerSimple)}"
  headerTabs: "${toYamlImagePath(IMAGE_FILE_MAP.headerTabs)}"
  headerIcon: "${toYamlImagePath(IMAGE_FILE_MAP.headerIcon)}"
  headerSideheader: "${toYamlImagePath(IMAGE_FILE_MAP.headerSideheader)}"
  loginBackground: "${toYamlImagePath(IMAGE_FILE_MAP.loginBackground)}"
  loginBackgroundPng: "${toYamlImagePath(IMAGE_FILE_MAP.loginBackgroundPng)}"
  loginThumb: "${toYamlImagePath(IMAGE_FILE_MAP.loginThumb)}"
  loginThumb1: "${toYamlImagePath(IMAGE_FILE_MAP.loginThumb1)}"
  loginThumb2: "${toYamlImagePath(IMAGE_FILE_MAP.loginThumb2)}"
  desktop: "${toYamlImagePath(IMAGE_FILE_MAP.desktop)}"
  layoutBanner: "${toYamlImagePath(IMAGE_FILE_MAP.layoutBanner)}"
  fullscreenSideheader: "${toYamlImagePath(IMAGE_FILE_MAP.fullscreenSideheader)}"
  fullscreenSidenav: "${toYamlImagePath(IMAGE_FILE_MAP.fullscreenSidenav)}"
  centerSidenav: "${toYamlImagePath(IMAGE_FILE_MAP.centerSidenav)}"
  themeThumb: "${toYamlImagePath(IMAGE_FILE_MAP.themeThumb)}"
  bannerPersonal: "${toYamlImagePath(IMAGE_FILE_MAP.bannerPersonal)}"
  studyBanner: "${toYamlImagePath(IMAGE_FILE_MAP.studyBanner)}"
  loginLogo: "${toYamlImagePath(IMAGE_FILE_MAP.loginLogo)}"
`;
}
