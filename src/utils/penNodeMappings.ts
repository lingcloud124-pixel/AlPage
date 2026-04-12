import { TemplatePenNodes, PenNodeMapping } from '../types/ConfigTypes.js';
import { TemplateType } from '../types/ThemeType.js';
import { PEN_EXPORT_RULES } from '../config/themeRuleRegistry.js';

export const LIGHT_UI_NODES: TemplatePenNodes = {
  loginBg: PEN_EXPORT_RULES['light-ui'].loginBackground.full,
  gradientRight: PEN_EXPORT_RULES['light-ui'].headers.gradientRight,
  gradientLeft: PEN_EXPORT_RULES['light-ui'].headers.gradientLeft,
  headerBg60: PEN_EXPORT_RULES['light-ui'].headers.default,
  headerBg90: PEN_EXPORT_RULES['light-ui'].headers.complex,
  headerBg130: PEN_EXPORT_RULES['light-ui'].headers.menu,
  banner: PEN_EXPORT_RULES['light-ui'].headers.banner,
  sideHeader: PEN_EXPORT_RULES['light-ui'].headers.sideHeader,
  tabs: {
    nodeId: 'TdfhH',
    outputFile: 'header-tabs.png',
    format: 'png',
    width: 1920,
    height: 90
  },
  imageDown: {
    nodeId: 'NfypL',
    outputFile: 'image_down.png',
    format: 'png',
    width: 200,
    height: 488
  },
  studyBanner: {
    nodeId: 'kwgCt',
    outputFile: 'study_banner.png',
    format: 'png',
    width: 2559,
    height: 100
  },
  bannerPersonal: {
    nodeId: 'Nk9d0',
    outputFile: 'banner_personal.png',
    format: 'png',
    width: 2562,
    height: 204,
    crop: {
      type: 'center',
      cropWidth: 2562,
      cropHeight: 204,
      cropOffsetX: 0,
      cropOffsetY: 138
    }
  }
};

export const DARK_UI_NODES: TemplatePenNodes = {
  loginBg: PEN_EXPORT_RULES['dark-ui'].loginBackground.full,
  gradientRight: PEN_EXPORT_RULES['dark-ui'].headers.gradientRight,
  gradientLeft: PEN_EXPORT_RULES['dark-ui'].headers.gradientLeft,
  headerBg60: PEN_EXPORT_RULES['dark-ui'].headers.default,
  headerBg90: PEN_EXPORT_RULES['dark-ui'].headers.complex,
  headerBg130: PEN_EXPORT_RULES['dark-ui'].headers.menu,
  banner: PEN_EXPORT_RULES['dark-ui'].headers.banner,
  sideHeader: PEN_EXPORT_RULES['dark-ui'].headers.sideHeader,
  tabs: {
    nodeId: 'TBCmd',
    outputFile: 'header-tabs.png',
    format: 'png',
    width: 2560,
    height: 90
  },
  imageDown: {
    nodeId: 'zmpSH',
    outputFile: 'image_down.png',
    format: 'png',
    width: 200,
    height: 488
  },
  studyBanner: {
    nodeId: 'TBCmd',
    outputFile: 'study_banner.png',
    format: 'png',
    width: 2560,
    height: 100
  },
  bannerPersonal: {
    nodeId: 'K7n6g',
    outputFile: 'banner_personal.png',
    format: 'png',
    width: 2562,
    height: 204,
    crop: {
      type: 'center',
      cropWidth: 2562,
      cropHeight: 204,
      cropOffsetX: 0,
      cropOffsetY: 138
    }
  }
};

export function getPenNodes(templateType: TemplateType): TemplatePenNodes {
  return templateType === TemplateType.DARK_UI ? DARK_UI_NODES : LIGHT_UI_NODES;
}

export function getLoginBgNode(templateType: TemplateType): PenNodeMapping {
  return getPenNodes(templateType).loginBg;
}

export function getMkLoginBgNode(templateType: TemplateType): PenNodeMapping {
  const node = getLoginBgNode(templateType);
  return {
    ...node,
    outputFile: 'background.png',
    format: 'png',
    width: 1920,
    height: 1080,
    crop: {
      type: 'center',
      cropWidth: 1920,
      cropHeight: 1080,
      cropOffsetX: 147.5,
      cropOffsetY: 0
    }
  };
}

export function getGradientNodes(templateType: TemplateType): { right: PenNodeMapping; left: PenNodeMapping } {
  const nodes = getPenNodes(templateType);
  return {
    right: nodes.gradientRight,
    left: nodes.gradientLeft
  };
}

export function getHeaderBgNode(templateType: TemplateType, height: 60 | 90 | 130): PenNodeMapping {
  const nodes = getPenNodes(templateType);
  if (height === 60) return nodes.headerBg60;
  if (height === 90) return nodes.headerBg90;
  return nodes.headerBg130;
}

export function getMkHeaderNodes(templateType: TemplateType): { classic: PenNodeMapping; simple: PenNodeMapping; icon: PenNodeMapping; banner: PenNodeMapping; sideHeader: PenNodeMapping; tabs: PenNodeMapping } {
  const nodes = getPenNodes(templateType);
  return {
    classic: {
      ...nodes.headerBg90,
      outputFile: 'header-classic.png',
      height: 80,
      crop: {
        type: 'center',
        cropWidth: 1920,
        cropHeight: 80,
        cropOffsetX: 0,
        cropOffsetY: 5
      }
    },
    simple: {
      ...nodes.headerBg90,
      outputFile: 'header-simple.png'
    },
    icon: {
      ...nodes.headerBg90,
      outputFile: 'header-icon.png'
    },
    banner: nodes.banner,
    sideHeader: nodes.sideHeader,
    tabs: nodes.tabs
  };
}
