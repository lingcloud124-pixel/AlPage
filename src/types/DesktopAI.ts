/**
 * Desktop/AI Integration Types
 * 
 * Types for integrating Desktop/AI's variable system and Pencil template
 * with the Topic Automation project.
 * 
 * Based on:
 * - /Users/gulingfei/Desktop/AI/20260403/variable-mapping.json
 * - /Users/gulingfei/Desktop/AI/Light-UI-模板.pen
 */

// ============================================================================
// Product Types
// ============================================================================

export type ProductType = 'ekp' | 'mk' | 'kk';

export type EKPVersion = 'v12' | 'v13' | 'v14-v16' | 'v17';

export type HeaderType = 
  | 'classic-header'      // 经典页眉
  | 'complex-tab-header'  // 多页签页眉
  | 'zone-header'         // 简洁页眉
  | 'menu-header'         // 菜单页眉
  | 'simple-tab-header'   // 简洁多页签页眉
  | 'default-header'      // 默认页眉/T型布局
  | 'v16-default-header'; // V16新默认页眉

// ============================================================================
// Desktop/AI Color Scheme (64+ Variables)
// ============================================================================

/**
 * Full Desktop/AI color scheme with all ~64 variables
 * Based on pencilVariables in variable-mapping.json
 */
export interface DesktopAIColorScheme {
  // --- 主色系 (4) ---
  'primary-color': string;           // 主色调 #2C615C
  'alter-color': string;             // 交互色 #144E48
  'alter-color-hover-on': string;    // 交互色鼠标经过 #56817D
  'light-primary-color': string;     // 浅主色（同primary-color）

  // --- 文字色 (5) ---
  'text-primary': string;            // 主要文字 #333333
  'text-secondary': string;           // 次要文字 #666666
  'text-weak': string;               // 弱化文字 #999999
  'text-on-primary': string;         // 主色上文字 #ffffff
  'light-text-primary': string;       // 浅主题文字（同text-primary）

  // --- 边框色 (2) ---
  'border-default': string;           // 默认边框 #666666
  'border-focus': string;             // 聚焦边框 #2C615C

  // --- 页眉核心 (3) ---
  'header-font-color': string;           // 页眉文字颜色 #333333
  'header-font-color-hover': string;     // 页眉文字hover #2C615C
  'header-divider-color': string;        // 页眉分隔线 #CCCCCC

  // --- 页眉-经典页眉 (4) ---
  'portal-header-bg-extend-color': string;        // 经典页眉背景延展 #FBFCF2
  'portal-header-pure-extend-color': string;       // 经典页眉纯色延展 #2C615C
  'portal-header-font-color': string;             // 经典页眉文字 #333333
  'portal-header-font-color-hover': string;        // 经典页眉hover文字 #2C615C

  // --- 页眉-多页签页眉 (8) ---
  'portal-header-complex-bg-extend-color': string;    // 多页签背景延展 #FBFCF2
  'portal-header-complex-pure-extend-color': string;  // 多页签纯色延展 #2C615C
  'portal-header-complex-font-color': string;         // 多页签文字 #ffffff
  'portal-header-complex-font-color-hover': string;   // 多页签hover文字 #ffffff
  'search-complex-input-bg': string;                 // 多页签搜索框背景 transparent
  'search-complex-input-font': string;                // 多页签搜索框文字 #2C615C
  'search-complex-input-icon-bg': string;             // 多页签搜索按钮背景 transparent
  'personal-info-font-color': string;                 // 个人信息文字 #333333

  // --- 页眉-简洁页眉 (4) ---
  'portal-header-zone-bg-extend-color': string;      // 简洁页眉背景延展 #FBFCF2
  'portal-header-zone-font-color': string;            // 简洁页眉文字 #333333
  'portal-header-zone-font-color-hover': string;      // 简洁页眉hover文字 #2C615C

  // --- 页眉-简洁多页签页眉 (4) ---
  'portal-header-simple-bg-extend-color': string;     // 简洁多页签背景延展 #FBFCF2
  'portal-header-simple-pure-extend-color': string;  // 简洁多页签纯色延展 #2C615C
  'portal-header-simple-font-color-top': string;      // 简洁多页签上方文字 #ffffff
  'portal-header-simple-font-color-hover': string;    // 简洁多页签hover文字 #2C615C

  // --- 页眉-默认页眉/T型布局 (3) ---
  'tlayout-header-bg-extend-color': string;       // 默认页眉背景延展 #FBFCF2
  'tlayout-header-font-color': string;            // 默认页眉文字 #333333
  'tlayout-header-font-color-hover': string;      // 默认页眉hover文字 #2C615C

  // --- 页眉-V16新默认 (3) ---
  'single-header-bg-extend-color': string;        // V16默认页眉背景延展
  'single-header-font-color': string;             // V16默认页眉文字
  'single-header-font-color-hover': string;       // V16默认页眉hover文字

  // --- 页眉-搜索框 (3) ---
  'search-input-border-color': string;            // 搜索框边框色 #2c615c
  'search-placehold-font-color': string;          // 搜索框placeholder #2c615c
  'search-font-color': string;                    // 搜索框文字 #333

  // --- 侧边栏 (6) ---
  'sidebar-color': string;                         // 侧边栏颜色
  'sidebar-panel-bg': string;                      // 侧边栏面板背景
  'sidebar-accordionpanel-header-bg': string;      // 侧边栏折叠面板头部背景
  'sidebar-accordionpanel-header-bgon': string;    // 侧边栏折叠面板头部选中背景
  'sidebar-accordionpanel-font': string;          // 侧边栏折叠面板字体
  'sidebar-icon-color': string;                   // 侧边栏图标
  'sidebar-icon-color-hover': string;             // 侧边栏图标hover

  // --- 登录页 (14) ---
  'login-bg-color': string;               // 登录页背景色 #FDFFF6
  'login-iframe-bg': string;              // 登录框背景 rgba(253,255,246,x)
  'input-placeholder': string;             // 输入框placeholder默认 #666
  'input-placeholder-focus': string;       // 输入框placeholder聚焦 #333
  'input-text': string;                   // 输入框文字 #333
  'input-border': string;                 // 输入框边框默认 #666
  'input-border-focus': string;          // 输入框边框聚焦 #2c615c
  'button-bg': string;                   // 登录按钮背景 #2c615c
  'button-bg-hover': string;              // 登录按钮hover背景 #228077
  'button-text': string;                  // 登录按钮文字 #fff
  'title-text': string;                  // 标题文字 #333
  'tab-selected': string;                // 登录方式标签选中 #2c615c
  'tab-unselected': string;              // 登录方式标签未选 #333
  'link-text': string;                   // 链接文字 #333
  'link-text-hover': string;             // 链接hover #228077
  'logo-color': string;                 // Logo颜色 #2c615c

  // --- 辅助色 (2) ---
  'auxiliary-gray': string;              // 辅助灰色 #999999
  'auxiliary-gray-dark': string;         // 深辅助灰色 #666666

  // --- 背景色 (1) ---
  'body-bg-color': string;              // 页面背景 #F8F8F8

  // --- 交互状态 (3) ---
  'hover-bg-color': string;             // hover背景色
  'primary-color-hover': string;         // 主色hover #228077
  'light-primary-color-hover': string;   // 浅主色hover

  // --- 透明度变体 (3) ---
  'primary-color-opacity-10': string;    // 10%透明度
  'primary-color-opacity-20': string;    // 20%透明度
  'primary-color-opacity-30': string;    // 30%透明度
}

// ============================================================================
// Variable Mapping Types
// ============================================================================

/**
 * Version-specific EKP variable configuration
 */
export interface EKPVersionConfig {
  description: string;
  varsFile: string;
  lineCount: number;
  baseVersion: boolean;
  supportedHeaderTypes?: HeaderType[];
}

/**
 * Pencil variable definition from variable-mapping.json
 */
export interface PencilVariable {
  value: string;
  description?: string;
  category?: string;
  versionConsistent: boolean;
  products: {
    ekp: string | VersionedEKPVar | null;
    mk: string | null;
    kk: string | null;
  };
}

/**
 * Versioned EKP variable mapping (for version-inconsistent variables)
 */
export interface VersionedEKPVar {
  v17: string | null;
  'v14-v16': string | null;
  v13?: string | null;
  v12?: string | null;
}

/**
 * Complete variable mapping configuration
 */
export interface VariableMappingConfig {
  version: string;
  description: string;
  ekpVersions: Record<EKPVersion, EKPVersionConfig>;
  versionDiff: Record<string, VersionedEKPVar>;
  pencilVariables: Record<keyof DesktopAIColorScheme, PencilVariable>;
  components?: Record<string, ComponentMapping>;
  outputFormats: OutputFormats;
  automation: AutomationConfig;
}

export interface ComponentMapping {
  description: string;
  supportedVersions?: EKPVersion[];
  pencilNodeId?: string;
  cssClass?: string;
  elements: Record<string, ElementMapping>;
}

export interface ElementMapping {
  description?: string;
  pencilVar?: string | null;
  pencilNodeId?: string;
  value?: string;
  asset?: string;
  size?: string;
  exportNode?: string;
  products?: Record<ProductType, string | null>;
  cssProperty?: string;
  note?: string;
}

export interface OutputFormats {
  ekp: {
    format: string;
    file: string;
    prefix: string;
    versions?: Record<string, { template: string }>;
  };
  mk: {
    format: string;
    file: string;
    prefix: string;
  };
  kk: {
    format: string;
    file: string;
    prefix: string;
  };
}

export interface AutomationConfig {
  defaultEkpVersion: EKPVersion;
  fallbackStrategy: 'useLatestVersion' | 'fail' | 'skip';
  validation: {
    checkVersionSupport: boolean;
    checkVariableExists: boolean;
  };
}

// ============================================================================
// Themes Manifest Types
// ============================================================================

export interface ThemesManifest {
  schemaVersion: string;
  manifestName: string;
  defaultLocale: string;
  defaults: ManifestDefaults;
  templates: TemplateConfig[];
  products: ProductConfig[];
  buildMatrix: BuildMatrixEntry[];
  validation: ValidationConfig;
  output: OutputConfig;
}

export interface ManifestDefaults {
  themeModes: ('light' | 'dark')[];
  versionStrategy: string;
  outputRoot: string;
  assetRoot: string;
  templateRoot: string;
  overrideRoot: string;
  strictValidation: boolean;
  dryRunDefault: boolean;
}

export interface TemplateConfig {
  templateId: string;
  platform: 'pc' | 'mobile';
  source: string;
  themeLibrary: string;
  supportedThemeModes: ('light' | 'dark')[];
  description: string;
}

export interface ProductConfig {
  productId: string;
  productName: string;
  platform: 'pc' | 'mobile';
  packageType: string;
  adapterType: string;
  overrideRef: string;
  supportedVersions?: string[];
  enabled: boolean;
}

export interface BuildMatrixEntry {
  buildId: string;
  productId: string;
  templateId: string;
  themeMode: 'light' | 'dark';
  versionId?: string;
  enabled: boolean;
}

export interface ValidationConfig {
  requireTemplateMatchPlatform: boolean;
  requireOverrideForVersionedProduct: boolean;
  requireUniqueBuildId: boolean;
  failOnMissingFile: boolean;
  failOnUnknownField: boolean;
  warnOnDisabledProduct: boolean;
}

export interface OutputConfig {
  outputRoot: string;
  namingPattern: string;
  writeManifestSnapshot: boolean;
  writeBuildLog: boolean;
}

// ============================================================================
// Header Mapping Types
// ============================================================================

export interface HeaderMappingConfig {
  version: string;
  themeName: string;
  themeType: 'Light-UI' | 'Dark-UI';
  description: string;
  createdAt: string;
  samplePackage: {
    path: string;
    varsFile: string;
    lineCount: number;
  };
  pencilFile: {
    path: string;
    headerFrameId: string;
    headerFrameName: string;
  };
  ekpVersions: Record<EKPVersion, EKPVersionConfig>;
  pencilVariables: Record<string, PencilVariable>;
  headerTypes: Record<HeaderType, HeaderTypeMapping>;
}

export interface HeaderTypeMapping {
  name: string;
  ekpVarPrefix: string;
  supportedVersions: EKPVersion[];
  elements: Record<string, {
    pencilVar?: string;
    ekpVar: string;
    value: string;
    description: string;
  }>;
}

// ============================================================================
// Pencil Template Types
// ============================================================================

/**
 * Frame IDs from Light-UI-模板.pen
 */
export const LIGHT_UI_TEMPLATE_FRAMES = {
  HEADER: '5puUK',        // 【清明节】页眉设计
  WORKBENCH: 'dKOHu',    // 【清明节】工作台设计
  LOGIN: 'nXv3Y',        // 【清明节】登录页
} as const;

/**
 * Header component node IDs from variable-mapping.json
 */
export const HEADER_NODE_IDS = {
  'default-header': 'ZuqPH',           // 默认页眉/T型布局
  'complex-header': 'C0kVM',           // 经典页眉/多页签页眉
  'zone-header': 'HQmJc',             // 简洁页眉
  'menu-header': 'aFQix',             // 菜单页眉
  'simple-tab-header': 'Q9gtt',        // 简洁多页签页眉
} as const;

// ============================================================================
// Theme Generation Types
// ============================================================================

export interface ThemeGenerationRequest {
  description: string;
  year: number;
  name: string;
  keywords?: string[];
  themeMode?: 'light' | 'dark';
  targetVersions?: EKPVersion[];
  targetProducts?: ProductType[];
}

export interface ThemeGenerationResult {
  success: boolean;
  colorScheme?: DesktopAIColorScheme;
  pencilFilePath?: string;
  exportedAssets?: AssetExportResult;
  themePacks?: string[];
  errors?: string[];
}

export interface AssetExportResult {
  headerBanner?: string;
  headerSimple?: string;
  headerTabs?: string;
  headerMenu?: string;
  loginBg?: string;
  workbenchAssets?: string[];
}

// ============================================================================
// Legacy Type Aliases (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use DesktopAIColorScheme instead
 */
export type LegacyColorScheme = DesktopAIColorScheme;
