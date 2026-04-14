import penExportRules from '../../../config/pen-export-rules.json';
import { getTemplateConfig } from '../theme/template-registry';
import themeRelations from '../../../config/theme-relations.json';

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
  const relationSet = themeRelations.headerTypeRelations;
  const relations = {
    ...relationSet['light-ui'],
    ...(relationSet[templateType] ?? {}),
  };

  const login: ScreenshotTarget[] = [
    {
      selector: '.template-login',
      outputName: stripExtension(config.loginBackground.full.outputFile),
      width: loginTemplate?.width ?? config.loginBackground.full.width,
      height: loginTemplate?.height ?? config.loginBackground.full.height,
      format: 'jpeg',
      templateId: 'login',
    },
    {
      selector: '.template-login',
      outputName: 'login_thumb',
      width: loginTemplate?.width ?? config.loginBackground.full.width,
      height: loginTemplate?.height ?? config.loginBackground.full.height,
      format: 'jpeg',
      templateId: 'login',
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
      selector: '.template-sidebar',
      outputName: stripExtension(config.headers.sideHeader.outputFile),
      width: config.headers.sideHeader.width,
      height: config.headers.sideHeader.height,
      format: 'png',
      templateId: 'sidebar',
    },
    {
      selector: '.template-header-simple-multitab',
      outputName: stripExtension(relations.simpleMultiTab.outputFile),
      width: getTemplateConfig('header-simple-multitab')?.width ?? config.headers.complex.width,
      height: getTemplateConfig('header-simple-multitab')?.height ?? config.headers.complex.height,
      format: 'png',
      templateId: 'header-simple-multitab',
    },
    {
      selector: '.template-header-simple',
      outputName: stripExtension(relations.simple.outputFile),
      width: getTemplateConfig('header-simple')?.width ?? config.headers.default.width,
      height: getTemplateConfig('header-simple')?.height ?? config.headers.default.height,
      format: 'png',
      templateId: 'header-simple',
    },
    {
      selector: '.template-header-v16-default',
      outputName: stripExtension(relations.singleMenu.outputFile),
      width: getTemplateConfig('header-v16-default')?.width ?? config.headers.default.width,
      height: getTemplateConfig('header-v16-default')?.height ?? config.headers.default.height,
      format: 'png',
      templateId: 'header-v16-default',
    },
    {
      selector: '.template-header-v16-search',
      outputName: stripExtension(relations.zoneNav.outputFile),
      width: getTemplateConfig('header-v16-search')?.width ?? config.headers.default.width,
      height: getTemplateConfig('header-v16-search')?.height ?? config.headers.default.height,
      format: 'png',
      templateId: 'header-v16-search',
    },
  ];

  const desktop: ScreenshotTarget[] = [
    {
      selector: '.desktop-wrapper',
      outputName: 'desktop',
      width: desktopTemplate?.width ?? 1920,
      height: desktopTemplate?.height ?? 1079,
      format: 'png',
      templateId: 'desktop',
    },
  ];

  return { login, header, desktop };
}
