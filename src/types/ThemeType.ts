export enum ThemeType {
  MK_GREEN = 'mk-green',
  V12_SCSS = 'v12-scss',
  V13_SCSS = 'v13-scss',
  V14_V16_SCSS = 'v14-v16-scss',
  V17_SCSS = 'v17-scss',
  V17_CSS_ONLY = 'v17-css-only',
  LOGIN_PACKAGE = 'login',
  KK_PACKAGE = 'kk'
}

export enum TemplateType {
  LIGHT_UI = 'light-ui',
  DARK_UI = 'dark-ui'
}

export interface ThemeDetectionResult {
  type: ThemeType;
  templateType?: TemplateType;
  version?: string;
  hasScssSource: boolean;
  structure: {
    rootFiles: string[];
    directories: string[];
    keyFiles: string[];
  };
}