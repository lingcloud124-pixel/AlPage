import templateRegistryConfig from '../../../config/web-template-registry.json';

export interface TemplateConfig {
  id: string;
  name: string;
  htmlPath: string;
  cssPath: string;
  width: number;
  height: number;
  headerSelectable?: boolean;
}

const registry: Record<string, TemplateConfig> = templateRegistryConfig as Record<string, TemplateConfig>;

export function getTemplateRegistry(): Record<string, TemplateConfig> {
  return registry;
}

export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return registry[templateId];
}

export function getHeaderSelectOptions(): Array<{ id: string; name: string }> {
  return [
    'header-default',
    'header-simple',
    'header-classic',
    'header-simple-multitab',
    'header-complex',
    'header-menu',
    'header-banner',
    'header-v16-default',
    'header-v16-search',
  ]
    .map((id) => registry[id])
    .filter((item): item is TemplateConfig => !!item && item.headerSelectable === true)
    .map((item) => ({ id: item.id, name: item.name }));
}
