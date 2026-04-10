import { TemplatePenNodes, PenNodeMapping } from '../types/ConfigTypes.js';
import { TemplateType } from '../types/ThemeType.js';

export const LIGHT_UI_NODES: TemplatePenNodes = {
  loginBg: {
    nodeId: 'LiN3g',
    outputFile: 'bg-login.jpg',
    format: 'jpg',
    width: 2215,
    height: 1080
  },
  gradientRight: {
    nodeId: 'w0ZQA',
    outputFile: 'header-gradient-right.png',
    format: 'png',
    width: 920,
    height: 60
  },
  gradientLeft: {
    nodeId: 'Ffk1f',
    outputFile: 'header-gradient-left.png',
    format: 'png',
    width: 859,
    height: 60
  },
  headerBg60: {
    nodeId: 'A7bgM',
    outputFile: 'header_tlayout_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 60
  },
  headerBg90: {
    nodeId: 'TdfhH',
    outputFile: 'header_complex_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 90
  },
  headerBg130: {
    nodeId: 'C0kVM',
    outputFile: 'header_menu_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 130
  },
  banner: {
    nodeId: 'Nk9d0',
    outputFile: 'header-banner.png',
    format: 'png',
    width: 2560,
    height: 480
  },
  sideHeader: {
    nodeId: 'jTA4O',
    outputFile: 'header-sideheader.png',
    format: 'png',
    width: 200,
    height: 900
  },
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
  loginBg: {
    nodeId: 'PAgAA',
    outputFile: 'bg-login.jpg',
    format: 'jpg',
    width: 2215,
    height: 1080
  },
  gradientRight: {
    nodeId: 'XQPAz',
    outputFile: 'header-gradient-right.png',
    format: 'png',
    width: 920,
    height: 60
  },
  gradientLeft: {
    nodeId: 'Ckc3l',
    outputFile: 'header-gradient-left.png',
    format: 'png',
    width: 859,
    height: 60
  },
  headerBg60: {
    nodeId: 'y6LPs',
    outputFile: 'header_tlayout_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 60
  },
  headerBg90: {
    nodeId: 'CagmA',
    outputFile: 'header_complex_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 90
  },
  headerBg130: {
    nodeId: 'KDpQp',
    outputFile: 'header_menu_frame_bg.png',
    format: 'png',
    width: 1920,
    height: 130
  },
  banner: {
    nodeId: 'K7n6g',
    outputFile: 'header-banner.png',
    format: 'png',
    width: 2560,
    height: 480,
    crop: {
      type: 'center',
      cropWidth: 2560,
      cropHeight: 480,
      cropOffsetX: 0,
      cropOffsetY: 30
    }
  },
  sideHeader: {
    nodeId: 'zmpSH',
    outputFile: 'header-sideheader.png',
    format: 'png',
    width: 200,
    height: 488
  },
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
