export interface ImageConfig {
  templateType: 'light-ui' | 'dark-ui';
  penFile: string;
  exportedImagesDir?: string;
  loginBg?: string;
  headerBanner?: string;
  headerSimple?: string;
  headerTabs?: string;
  headerSideheader?: string;
}

export interface ImageMapping {
  sourceFile: string;
  targetPath: string;
  targetSize?: { width: number; height: number };
  format: 'png' | 'jpg';
  generate2x?: boolean;
}

export interface PenNodeMapping {
  nodeId: string;
  outputFile: string;
  format: 'png' | 'jpg';
  width: number;
  height: number;
  crop?: {
    type: 'center' | 'left' | 'right';
    cropWidth?: number;
    cropHeight?: number;
    cropOffsetX?: number;
    cropOffsetY?: number;
  };
}

export interface TemplatePenNodes {
  loginBg: PenNodeMapping;
  gradientRight: PenNodeMapping;
  gradientLeft: PenNodeMapping;
  headerBg60: PenNodeMapping;
  headerBg90: PenNodeMapping;
  headerBg130: PenNodeMapping;
  banner: PenNodeMapping;
  sideHeader: PenNodeMapping;
  tabs: PenNodeMapping;
  imageDown: PenNodeMapping;
  studyBanner: PenNodeMapping;
  bannerPersonal: PenNodeMapping;
}

export interface ColorConfig {
  primary: string;
  primaryHover?: string;
  alterColor?: string;
  alterColorHoverOn?: string;
  secondary?: string;
  third?: string;
  primaryOpacity10?: string;
  primaryOpacity20?: string;
  primaryOpacity30?: string;
  sidebarBg?: string;
  sidebarPanelBg?: string;
  linkText?: string;
  linkTextHover?: string;
}

export interface DarkUIColorConfig {
  primary: string;
  primaryHover?: string;
  alterColor?: string;
  alterColorHoverOn?: string;
  primaryOpacity10?: string;
  primaryOpacity20?: string;
  primaryOpacity30?: string;
  headerFontColor?: string;
  headerFontColorHover?: string;
  portalHeaderBgExtendColor?: string;
  portalHeaderPureExtendColor?: string;
  sidebarColor?: string;
  sidebarIconColor?: string;
  sidebarIconColorHover?: string;
  sidebarPanelBg?: string;
  sidebarAccordionPanelFont?: string;
  sidebarAccordionPanelHeaderBg?: string;
  sidebarAccordionPanelHeaderBgOn?: string;
  searchFontColor?: string;
  searchInputBorderColor?: string;
  searchPlaceholdFontColor?: string;
  auxiliaryGray?: string;
  auxiliaryGrayDark?: string;
  bodyBgColor?: string;
  hoverBgColor?: string;
  loginBgColor?: string;
  borderColor?: string;
  borderIconColor?: string;
  linkText?: string;
  linkTextOn?: string;
  loginPrimaryColor?: string;
  loginPrimaryHover?: string;
}

export interface ColorConfigUnion {
  templateType?: 'light-ui' | 'dark-ui';
  primary: string;
  primaryHover?: string;
  secondary?: string;
  third?: string;
  primaryOpacity10?: string;
  primaryOpacity20?: string;
  primaryOpacity30?: string;
  sidebarBg?: string;
  sidebarPanelBg?: string;
  linkText?: string;
  linkTextHover?: string;
  headerFontColor?: string;
  headerFontColorHover?: string;
  portalHeaderBgExtendColor?: string;
  portalHeaderPureExtendColor?: string;
  sidebarColor?: string;
  sidebarIconColor?: string;
  sidebarIconColorHover?: string;
  sidebarAccordionPanelFont?: string;
  sidebarAccordionPanelHeaderBg?: string;
  sidebarAccordionPanelHeaderBgOn?: string;
  searchFontColor?: string;
  searchInputBorderColor?: string;
  searchPlaceholdFontColor?: string;
  auxiliaryGray?: string;
  auxiliaryGrayDark?: string;
  bodyBgColor?: string;
  hoverBgColor?: string;
  loginBgColor?: string;
  borderColor?: string;
  borderIconColor?: string;
  loginPrimaryColor?: string;
  loginPrimaryHover?: string;
}

export interface UpdateResult {
  updatedFiles: string[];
  skippedFiles: string[];
  errors: string[];
}