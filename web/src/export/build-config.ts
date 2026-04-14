export interface ExportRequestOptions {
  name: string;
  themeColor: string;
  selectedProducts: string[];
  subtitle?: string;
  buttonText?: string;
  headerFont?: string;
}

const IMAGE_FILE_MAP = {
  headerBanner: 'header-banner.png',
  headerClassic: 'header_complex_frame_bg.png',
  headerMenu: 'header_menu_frame_bg.png',
  headerSimple: 'header_tlayout_frame_bg.png',
  headerTabs: 'header_zone_frame_bg.png',
  headerIcon: 'header_zone_nav_frame_bg.png',
  headerSideheader: 'header-sideheader.png',
  loginBackground: 'bg-login.jpg',
  loginLogo: '',
} as const;

export function buildExportRequestYaml(options: ExportRequestOptions): string {
  const productsYaml = options.selectedProducts.map((product) => `  - ${product}`).join('\n');

  return `title: "${options.name}"
subtitle: "${options.subtitle ?? options.name}"
buttonText: "${options.buttonText ?? '立即进入'}"
themeColor: "${options.themeColor}"
headerFont: "${options.headerFont ?? ''}"
products:
${productsYaml}
images:
  headerBanner: "${IMAGE_FILE_MAP.headerBanner}"
  headerClassic: "${IMAGE_FILE_MAP.headerClassic}"
  headerMenu: "${IMAGE_FILE_MAP.headerMenu}"
  headerSimple: "${IMAGE_FILE_MAP.headerSimple}"
  headerTabs: "${IMAGE_FILE_MAP.headerTabs}"
  headerIcon: "${IMAGE_FILE_MAP.headerIcon}"
  headerSideheader: "${IMAGE_FILE_MAP.headerSideheader}"
  loginBackground: "${IMAGE_FILE_MAP.loginBackground}"
  loginLogo: "${IMAGE_FILE_MAP.loginLogo}"
`;
}

