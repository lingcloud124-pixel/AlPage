const IMAGE_FILE_MAP = {
  headerBanner: '../素材包/header-banner.png',
  headerClassic: '../素材包/header-classic.png',
  headerMenu: '../素材包/header-menu.png',
  headerSimple: '../素材包/header-simple.png',
  headerTabs: '../素材包/header-tabs.png',
  headerIcon: '../素材包/header-icon.png',
  headerSideheader: '../素材包/header-sideheader.png',
  loginBackground: '../素材包/bg-login.jpg',
  loginBackgroundPng: '../素材包/background.png',
  loginThumb: '../素材包/login_thumb.jpg',
  loginThumb1: '../素材包/login_bg/thumb-1.jpg',
  loginThumb2: '../素材包/login_bg/thumb-2.jpg',
  desktop: '../素材包/desktop.png',
  layoutBanner: '../素材包/layout-banner.jpg',
  fullscreenSideheader: '../素材包/fullscreen-sideheader.jpg',
  fullscreenSidenav: '../素材包/fullscreen-sidenav.jpg',
  centerSidenav: '../素材包/center-sidenav.jpg',
  themeThumb: '../素材包/thumb.jpg',
  bannerPersonal: '../素材包/banner_personal.png',
  studyBanner: '../素材包/study_banner.png',
  loginLogo: '',
} as const;

const MAX_PACKAGE_TITLE_LENGTH = 10;

function truncateByCharacters(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join('');
}

function clampPackageTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '未命名主题';
  return truncateByCharacters(trimmed, MAX_PACKAGE_TITLE_LENGTH);
}

function normalizeCssVariables(colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value]),
  );
}

export interface ServerBuildSnapshotProject {
  id: string;
  name: string;
  themeName?: string;
  nameEn?: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  visualContext?: {
    imageInput?: {
      dataUrl?: string;
    };
  };
  createdAt: number;
  updatedAt: number;
}

export interface ServerBuildExportAssetSnapshotArgs {
  project: ServerBuildSnapshotProject;
  cssVariables: Record<string, string>;
  selectedProducts: string[];
  nameEn: string;
  exportDir?: string;
  now?: number;
}

function resolveSnapshotImageUrl(args: ServerBuildExportAssetSnapshotArgs, imageUrl: string | undefined): string | undefined {
  if (imageUrl && !imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  const visualContextImage = args.project.visualContext?.imageInput?.dataUrl?.trim();
  if (visualContextImage) {
    return visualContextImage;
  }
  return undefined;
}

export function buildServerExportAssetSnapshot(args: ServerBuildExportAssetSnapshotArgs) {
  const sourceBackground = resolveSnapshotImageUrl(args, args.project.bgImageUrl?.trim());
  const sourceHeaderBackground = resolveSnapshotImageUrl(args, args.project.headerBgImageUrl?.trim());

  return {
    version: 1 as const,
    generatedAt: new Date(args.now ?? Date.now()).toISOString(),
    project: {
      id: args.project.id,
      name: args.project.themeName || args.project.name || '未命名主题',
      nameEn: args.nameEn,
      templateType: args.project.templateType,
      selectedProducts: [...args.selectedProducts],
    },
    sourceImages: {
      background: sourceBackground || undefined,
      headerBackground: sourceHeaderBackground || undefined,
    },
    assetSources: {
      login: 'background-image',
      headerSidebar: 'background-image',
      thumbnails: 'preview-html',
    },
    colors: normalizeCssVariables({ ...args.project.colors, ...args.cssVariables }),
    paths: {
      exportDir: args.exportDir,
    },
    pipeline: {
      steps: [
        {
          id: 'project-snapshot',
          name: '固定当前项目快照',
          description: '锁定当前项目的背景图、模板类型、产品选择和确认后的颜色变量。',
        },
        {
          id: 'login-background',
          name: '处理登录页背景素材',
          description: '优先基于当前背景图生成登录背景图、背景 PNG 和登录缩略图；未提供时回退默认背景图。',
        },
        {
          id: 'header-sidebar',
          name: '处理页眉和左侧导航素材',
          description: '按 Light/Dark 三明治规则生成页眉与左导航切图。',
        },
        {
          id: 'icon-recolor',
          name: '处理涉及主题色的图标素材',
          description: '在打包阶段对主题包内需要跟随主题色变化的 PNG 图标执行自动换色。',
        },
        {
          id: 'thumbnails',
          name: '处理封面图和缩略图素材',
          description: '生成 desktop、layout-banner、fullscreen-sideheader、fullscreen-sidenav、center-sidenav、thumb、banner_personal、study_banner 等展示素材。',
        },
      ],
    },
  };
}

export interface ServerBuildYamlOptions {
  name: string;
  nameEn?: string;
  subtitle?: string;
  buttonText?: string;
  themeColor: string;
  templateType: 'light-ui' | 'dark-ui';
  selectedProducts: string[];
  headerFont?: string;
  colors?: Record<string, string>;
}

export function buildServerExportYaml(options: ServerBuildYamlOptions): string {
  const packageTitle = clampPackageTitle(options.name);
  const productsYaml = options.selectedProducts.map((product) => `  - ${product}`).join('\n');
  const normalizedColors = Object.entries(options.colors ?? {})
    .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value] as const)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const colorsYaml = normalizedColors.length > 0
    ? `colors:\n${normalizedColors.map(([name, value]) => `  ${name}: "${value}"`).join('\n')}\n`
    : '';
  const nameEnYaml = options.nameEn?.trim() ? `nameEn: "${options.nameEn.trim()}"\n` : '';

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
