import { getWebHeaderSemantics } from './header-semantics';

export interface TemplateConfig {
  id: string;
  name: string;
  htmlPath: string;
  cssPath: string;
  width: number;
  height: number;
}

const registry: Record<string, TemplateConfig> = {
  login: {
    id: 'login',
    name: '登录页',
    htmlPath: '/src/templates/login.html',
    cssPath: '/src/templates/login.css',
    width: 2215,
    height: 1080,
  },
  desktop: {
    id: 'desktop',
    name: '主页',
    htmlPath: '/src/templates/desktop.html',
    cssPath: '/src/templates/desktop.css',
    width: 1920,
    height: 1079,
  },
  'header-default': {
    id: 'header-default',
    name: getWebHeaderSemantics()['header-default'].name,
    htmlPath: '/src/templates/header-default.html',
    cssPath: '/src/templates/header-default.css',
    width: 1920,
    height: 60,
  },
  'header-complex': {
    id: 'header-complex',
    name: getWebHeaderSemantics()['header-complex'].name,
    htmlPath: '/src/templates/header-complex.html',
    cssPath: '/src/templates/header-complex.css',
    width: 1920,
    height: 90,
  },
  'header-menu': {
    id: 'header-menu',
    name: getWebHeaderSemantics()['header-menu'].name,
    htmlPath: '/src/templates/header-menu.html',
    cssPath: '/src/templates/header-menu.css',
    width: 1920,
    height: 130,
  },
  'header-banner': {
    id: 'header-banner',
    name: '横幅页眉',
    htmlPath: '/src/templates/header-banner.html',
    cssPath: '/src/templates/header-banner.css',
    width: 2560,
    height: 480,
  },
  sidebar: {
    id: 'sidebar',
    name: '侧边页眉',
    htmlPath: '/src/templates/sidebar.html',
    cssPath: '/src/templates/sidebar.css',
    width: 200,
    height: 900,
  },
  'header-v16-default': {
    id: 'header-v16-default',
    name: getWebHeaderSemantics()['header-v16-default'].name,
    htmlPath: '/src/templates/header-v16-default.html',
    cssPath: '/src/templates/header-v16-default.css',
    width: 2560,
    height: 70,
  },
  'header-simple': {
    id: 'header-simple',
    name: getWebHeaderSemantics()['header-simple'].name,
    htmlPath: '/src/templates/header-simple.html',
    cssPath: '/src/templates/header-simple.css',
    width: 1920,
    height: 60,
  },
  'header-simple-multitab': {
    id: 'header-simple-multitab',
    name: getWebHeaderSemantics()['header-simple-multitab'].name,
    htmlPath: '/src/templates/header-simple-multitab.html',
    cssPath: '/src/templates/header-simple-multitab.css',
    width: 1920,
    height: 90,
  },
  'header-classic': {
    id: 'header-classic',
    name: '经典页眉',
    htmlPath: '/src/templates/header-classic.html',
    cssPath: '/src/templates/header-classic.css',
    width: 1920,
    height: 70,
  },
  'header-v16-search': {
    id: 'header-v16-search',
    name: 'V16搜索页眉',
    htmlPath: '/src/templates/header-v16-search.html',
    cssPath: '/src/templates/header-v16-search.css',
    width: 1920,
    height: 60,
  },
};

export function getTemplateRegistry(): Record<string, TemplateConfig> {
  return registry;
}

export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return registry[templateId];
}
