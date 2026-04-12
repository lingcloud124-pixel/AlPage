import { ImageMapping } from '../types/ConfigTypes.js';
import { ThemeType, TemplateType } from '../types/ThemeType.js';
import { HEADER_TYPE_RELATIONS, PEN_EXPORT_RULES } from '../config/themeRuleRegistry.js';

export function getImageMappings(themeType: ThemeType, _templateType: TemplateType = TemplateType.LIGHT_UI): ImageMapping[] {
  const mappings: ImageMapping[] = [];

  switch (themeType) {
    case ThemeType.MK_GREEN:
      mappings.push(
        {
          sourceFile: 'header-banner.png',
          targetPath: 'static/main.png',
          format: 'png'
        },
        {
          sourceFile: 'header-simple.png',
          targetPath: 'static/simple.png',
          format: 'png'
        },
        {
          sourceFile: 'desktop.png',
          targetPath: 'sample/thumbnail/desktop.png',
          format: 'png'
        },
        {
          sourceFile: 'layout-banner.jpg',
          targetPath: 'sample/layout-banner.jpg',
          format: 'jpg'
        }
      );
      break;

    case ThemeType.V12_SCSS:
    case ThemeType.V13_SCSS:
    case ThemeType.V14_V16_SCSS:
    case ThemeType.V17_SCSS:
    case ThemeType.V17_CSS_ONLY:
      mappings.push(
        {
          sourceFile: 'header-banner.png',
          targetPath: 'images/image-style/header_complex_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'header-simple.png',
          targetPath: 'images/image-style/header_tlayout_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'login-bg.jpg',
          targetPath: 'login_bg/bg-login.jpg',
          format: 'jpg'
        },
        {
          sourceFile: 'desktop.png',
          targetPath: 'sample/thumbnail/desktop.png',
          format: 'png'
        }
      );
      break;

    case ThemeType.LOGIN_PACKAGE:
      mappings.push(
        {
          sourceFile: 'login-bg.jpg',
          targetPath: 'login_bg/bg-login.jpg',
          format: 'jpg'
        }
      );
      break;

    case ThemeType.KK_PACKAGE:
      break;
  }

  return mappings;
}

export function getLoginBgMapping(_templateType: TemplateType): ImageMapping {
  return {
    sourceFile: PEN_EXPORT_RULES['light-ui'].loginBackground.full.outputFile,
    targetPath: 'login_bg/bg-login.jpg',
    format: 'jpg'
  };
}

export function getMkBackgroundMapping(_templateType: TemplateType): ImageMapping {
  return {
    sourceFile: 'background.png',
    targetPath: 'static/background.png',
    format: 'png'
  };
}

export function getHeaderGradientMappings(_templateType: TemplateType): ImageMapping[] {
  return [
    {
      sourceFile: PEN_EXPORT_RULES['dark-ui'].headers.gradientRight.outputFile,
      targetPath: 'static/header-gradient-right.png',
      format: 'png'
    },
    {
      sourceFile: PEN_EXPORT_RULES['dark-ui'].headers.gradientLeft.outputFile,
      targetPath: 'static/header-gradient-left.png',
      format: 'png'
    }
  ];
}

export function getHeaderBgMappings(templateType: TemplateType): ImageMapping[] {
  const key = templateType === TemplateType.DARK_UI ? 'dark-ui' : 'light-ui';
  return Object.values(HEADER_TYPE_RELATIONS[key]).map((item) => ({
    sourceFile: item.outputFile,
    targetPath: `images/image-style/${item.outputFile}`,
    format: 'png',
  }));
}

export function getMkHeaderMappings(_templateType: TemplateType): ImageMapping[] {
  return [
    {
      sourceFile: 'header-classic.png',
      targetPath: 'static/header-classic.png',
      format: 'png'
    },
    {
      sourceFile: 'header-banner.png',
      targetPath: 'static/header-banner.png',
      format: 'png'
    },
    {
      sourceFile: 'header-tabs.png',
      targetPath: 'static/header-tabs.png',
      format: 'png'
    },
    {
      sourceFile: 'header-simple.png',
      targetPath: 'static/header-simple.png',
      format: 'png'
    },
    {
      sourceFile: 'header-icon.png',
      targetPath: 'static/header-icon.png',
      format: 'png'
    },
    {
      sourceFile: 'header-sideheader.png',
      targetPath: 'static/header-sideheader.png',
      format: 'png'
    }
  ];
}
