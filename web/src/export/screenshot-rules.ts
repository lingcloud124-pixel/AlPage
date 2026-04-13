import penExportRules from '../../../config/pen-export-rules.json';
import { getTemplateConfig } from '../theme/template-registry';

export interface ScreenshotTarget {
  selector: string;
  outputName: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  templateId?: string;
  clipY?: number;
  clipHeight?: number;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(png|jpe?g)$/i, '');
}

export function getScreenshotTargets(templateType: 'light-ui' | 'dark-ui') {
  const config = penExportRules[templateType];
  const loginTemplate = getTemplateConfig('login');
  const desktopTemplate = getTemplateConfig('desktop');

  const login: ScreenshotTarget[] = [
    {
      selector: '#loginPage',
      outputName: stripExtension(config.loginBackground.full.outputFile),
      width: loginTemplate?.width ?? config.loginBackground.full.width,
      height: loginTemplate?.height ?? config.loginBackground.full.height,
      format: 'jpeg',
    },
    {
      selector: '#loginPage',
      outputName: 'login_thumb',
      width: loginTemplate?.width ?? config.loginBackground.full.width,
      height: loginTemplate?.height ?? config.loginBackground.full.height,
      format: 'jpeg',
    },
  ];

  const header: ScreenshotTarget[] = [
    {
      selector: '.template-header-default',
      outputName: stripExtension(config.headers.default.outputFile),
      width: config.headers.default.width,
      height: config.headers.default.height,
      format: 'png',
      templateId: 'header-default',
    },
    {
      selector: '.template-header-complex',
      outputName: stripExtension(config.headers.complex.outputFile),
      width: config.headers.complex.width,
      height: config.headers.complex.height,
      format: 'png',
      templateId: 'header-complex',
    },
    {
      selector: '.template-header-menu',
      outputName: stripExtension(config.headers.menu.outputFile),
      width: config.headers.menu.width,
      height: config.headers.menu.height,
      format: 'png',
      templateId: 'header-menu',
    },
    {
      selector: '.template-header-banner',
      outputName: stripExtension(config.headers.banner.outputFile),
      width: config.headers.banner.width,
      height: config.headers.banner.height,
      format: 'png',
      templateId: 'header-banner',
    },
    {
      selector: '.desktop-sidebar',
      outputName: stripExtension(config.headers.sideHeader.outputFile),
      width: config.headers.sideHeader.width,
      height: config.headers.sideHeader.height,
      format: 'png',
    },
  ];

  const desktop: ScreenshotTarget[] = [
    {
      selector: '#mainPage',
      outputName: 'desktop',
      width: desktopTemplate?.width ?? 1920,
      height: desktopTemplate?.height ?? 1079,
      format: 'png',
    },
  ];

  return { login, header, desktop };
}
