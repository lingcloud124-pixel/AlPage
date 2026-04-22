import outputMapping from '../../../config/image-output-mapping.json';
import { getTemplateConfig } from '../theme/template-registry';

export interface ScreenshotTarget {
  selector: string;
  outputName: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  templateId?: string;
}

type TemplateType = 'light-ui' | 'dark-ui';

interface OutputMappingItem {
  id: string;
  output: string;
  width?: number;
  height?: number;
  widthByTheme?: Record<TemplateType, number>;
  heightByTheme?: Record<TemplateType, number>;
  format: 'PNG' | 'JPEG';
  recipe: string;
}

interface ScreenshotTargets {
  login: ScreenshotTarget[];
  header: ScreenshotTarget[];
  desktop: ScreenshotTarget[];
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(png|jpe?g)$/i, '');
}

function resolveDimension(item: OutputMappingItem, templateType: TemplateType, key: 'width' | 'height'): number {
  const direct = item[key];
  if (typeof direct === 'number') {
    return direct;
  }

  const themed = key === 'width' ? item.widthByTheme : item.heightByTheme;
  if (themed && typeof themed[templateType] === 'number') {
    return themed[templateType];
  }

  throw new Error(`Missing ${key} for screenshot target ${item.id}`);
}

function toFormat(value: 'PNG' | 'JPEG'): 'png' | 'jpeg' {
  return value === 'JPEG' ? 'jpeg' : 'png';
}

export function getScreenshotTargets(templateType: TemplateType): ScreenshotTargets {
  const loginTemplate = getTemplateConfig('login');
  const desktopTemplate = getTemplateConfig('desktop');

  const login = (outputMapping.login as OutputMappingItem[]).map((item) => ({
    selector: item.recipe === 'login-background' ? '.login-bg' : '.template-login',
    outputName: stripExtension(item.output),
    width: resolveDimension(item, templateType, 'width'),
    height: resolveDimension(item, templateType, 'height'),
    format: toFormat(item.format),
    templateId: loginTemplate?.id,
  }));

  const header = (outputMapping.headerSidebar as OutputMappingItem[]).map((item) => ({
    selector: item.recipe === 'sidebar' ? '.template-sidebar' : '.template-header-default',
    outputName: stripExtension(item.output),
    width: resolveDimension(item, templateType, 'width'),
    height: resolveDimension(item, templateType, 'height'),
    format: toFormat(item.format),
    templateId: item.recipe === 'sidebar' ? 'sidebar' : 'header-default',
  }));

  const desktop = (outputMapping.thumbnails as OutputMappingItem[]).map((item) => ({
    selector: '.desktop-wrapper',
    outputName: stripExtension(item.output),
    width: resolveDimension(item, templateType, 'width'),
    height: resolveDimension(item, templateType, 'height'),
    format: toFormat(item.format),
    templateId: desktopTemplate?.id,
  }));

  return { login, header, desktop };
}
