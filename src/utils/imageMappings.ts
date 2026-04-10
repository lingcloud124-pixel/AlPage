import { ImageMapping } from '../types/ConfigTypes.js';
import { ThemeType, TemplateType } from '../types/ThemeType.js';

export function getImageMappings(themeType: ThemeType, templateType: TemplateType = TemplateType.LIGHT_UI): ImageMapping[] {
  const mappings: ImageMapping[] = [];

  switch (themeType) {
    case ThemeType.MK_GREEN:
      if (templateType === TemplateType.DARK_UI) {
        // Dark-UI MK: needs header-icon and header-classic too
        mappings.push(
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
            sourceFile: 'header-icon.png',
            targetPath: 'static/header-icon.png',
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
            sourceFile: 'header-sideheader.png',
            targetPath: 'static/header-sideheader.png',
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
      } else {
        mappings.push(
          {
            sourceFile: 'header-banner.png',
            targetPath: 'static/header-banner.png',
            format: 'png'
          },
          {
            sourceFile: 'header-simple.png',
            targetPath: 'static/header-simple.png',
            format: 'png'
          },
          {
            sourceFile: 'header-tabs.png',
            targetPath: 'static/header-tabs.png',
            format: 'png'
          },
          {
            sourceFile: 'header-sideheader.png',
            targetPath: 'static/header-sideheader.png',
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
      }
      break;

    case ThemeType.V12_SCSS:
    case ThemeType.V13_SCSS:
    case ThemeType.V14_V16_SCSS:
    case ThemeType.V17_SCSS:
    case ThemeType.V17_CSS_ONLY:
      if (templateType === TemplateType.DARK_UI) {
        // Dark-UI: use complex/menu/simple headers from output directory
        mappings.push(
          {
            sourceFile: 'header_complex_frame_bg.png',
            targetPath: 'images/image-style/header_complex_frame_bg.png',
            format: 'png'
          },
          {
            sourceFile: 'header_menu_frame_bg.png',
            targetPath: 'images/image-style/header_menu_frame_bg.png',
            format: 'png'
          },
          {
            sourceFile: 'header_tlayout_frame_bg.png',
            targetPath: 'images/image-style/header_tlayout_frame_bg.png',
            format: 'png'
          },
          {
            sourceFile: 'header_tlayout_frame_bg.png',
            targetPath: 'images/image-style/banner_personal.png',
            format: 'png'
          },
          {
            sourceFile: 'header_simple_frame_bg.png',
            targetPath: 'images/image-style/header_simple_frame_bg.png',
            format: 'png'
          },
          {
            sourceFile: 'header_single_menu_frame_bg.png',
            targetPath: 'images/image-style/header_single_menu_frame_bg.png',
            format: 'png'
          },
          {
            sourceFile: 'desktop.png',
            targetPath: 'sample/thumbnail/desktop.png',
            format: 'png'
          }
        );
      } else {
      mappings.push(
        {
          sourceFile: 'header-banner.png',
          targetPath: 'images/image-style/banner_personal.png',
          format: 'png'
        },
        {
          sourceFile: 'header_complex_frame_bg.png',
          targetPath: 'images/image-style/header_complex_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'header_tlayout_frame_bg.png',
          targetPath: 'images/image-style/header_tlayout_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'header_simple_frame_bg.png',
          targetPath: 'images/image-style/header_simple_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'header_menu_frame_bg.png',
          targetPath: 'images/image-style/header_menu_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'header-sideheader.png',
          targetPath: 'images/image-style/header_single_menu_frame_bg.png',
          format: 'png'
        },
        {
          sourceFile: 'desktop.png',
          targetPath: 'sample/thumbnail/desktop.png',
          format: 'png'
        }
      );
      }
      break;

    case ThemeType.LOGIN_PACKAGE:
      mappings.push(
        {
          sourceFile: 'login_bg/thumb-1.jpg',
          targetPath: 'login_bg/thumb-1.jpg',
          format: 'jpg'
        },
        {
          sourceFile: 'login_bg/thumb-2.jpg',
          targetPath: 'login_bg/thumb-2.jpg',
          format: 'jpg'
        },
        {
          sourceFile: 'desktop.png',
          targetPath: 'sample/thumbnail/desktop.png',
          format: 'png'
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
    sourceFile: 'bg-login.jpg',
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
      sourceFile: 'header-gradient-right.png',
      targetPath: 'static/header-gradient-right.png',
      format: 'png'
    },
    {
      sourceFile: 'header-gradient-left.png',
      targetPath: 'static/header-gradient-left.png',
      format: 'png'
    }
  ];
}

export function getHeaderBgMappings(_templateType: TemplateType): ImageMapping[] {
  return [
    {
      sourceFile: 'header_tlayout_frame_bg.png',
      targetPath: 'images/image-style/header_tlayout_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_simple_frame_bg.png',
      targetPath: 'images/image-style/header_simple_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_zone_frame_bg.png',
      targetPath: 'images/image-style/header_zone_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_zone_nav_frame_bg.png',
      targetPath: 'images/image-style/header_zone_nav_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_menu_frame_bg.png',
      targetPath: 'images/image-style/header_menu_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_complex_frame_bg.png',
      targetPath: 'images/image-style/header_complex_frame_bg.png',
      format: 'png'
    },
    {
      sourceFile: 'header_single_menu_frame_bg.png',
      targetPath: 'images/image-style/header_single_menu_frame_bg.png',
      format: 'png'
    }
  ];
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
