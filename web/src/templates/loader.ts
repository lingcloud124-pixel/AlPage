import type { ColorSetting } from '../components/color-editor';

export interface TemplateConfig {
  id: string;
  name: string;
  htmlPath: string;
  cssPath: string;
  width: number;
  height: number;
}

const TEMPLATES: Record<string, TemplateConfig> = {
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
    name: '默认页眉',
    htmlPath: '/src/templates/header-default.html',
    cssPath: '/src/templates/header-default.css',
    width: 1920,
    height: 60,
  },
  'header-complex': {
    id: 'header-complex',
    name: '多页签页眉',
    htmlPath: '/src/templates/header-complex.html',
    cssPath: '/src/templates/header-complex.css',
    width: 1920,
    height: 90,
  },
  'header-menu': {
    id: 'header-menu',
    name: '菜单页眉',
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
  'sidebar': {
    id: 'sidebar',
    name: '侧边页眉',
    htmlPath: '/src/templates/sidebar.html',
    cssPath: '/src/templates/sidebar.css',
    width: 200,
    height: 900,
  },
  'header-v16-default': {
    id: 'header-v16-default',
    name: 'V16默认页眉',
    htmlPath: '/src/templates/header-v16-default.html',
    cssPath: '/src/templates/header-v16-default.css',
    width: 2560,
    height: 70,
  },
  'header-simple': {
    id: 'header-simple',
    name: '简洁页眉',
    htmlPath: '/src/templates/header-simple.html',
    cssPath: '/src/templates/header-simple.css',
    width: 1920,
    height: 60,
  },
  'header-simple-multitab': {
    id: 'header-simple-multitab',
    name: '简洁多标签页眉',
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

const loadedCSS = new Set<string>();
const loadedHTML = new Map<string, string>();

async function loadCSSTemplate(cssPath: string): Promise<void> {
  if (loadedCSS.has(cssPath)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssPath;
  document.head.appendChild(link);
  loadedCSS.add(cssPath);
}

async function loadHTMLTemplate(htmlPath: string): Promise<string> {
  if (loadedHTML.has(htmlPath)) return loadedHTML.get(htmlPath)!;

  const resp = await fetch(htmlPath);
  if (!resp.ok) throw new Error(`Failed to load template: ${htmlPath} (${resp.status})`);
  const html = await resp.text();
  loadedHTML.set(htmlPath, html);
  return html;
}

export async function renderTemplate(
  templateId: string,
  targetElement: HTMLElement
): Promise<void> {
  const config = TEMPLATES[templateId];
  if (!config) throw new Error(`Unknown template: ${templateId}`);

  await loadCSSTemplate(config.cssPath);
  const html = await loadHTMLTemplate(config.htmlPath);

  targetElement.innerHTML = '';
  const isAdaptive = config.id === 'login' || config.id === 'desktop';
  if (isAdaptive) {
    targetElement.style.width = '100%';
    targetElement.style.height = '100%';
  } else {
    targetElement.style.width = config.width + 'px';
    targetElement.style.height = config.height + 'px';
  }
  targetElement.style.position = 'relative';
  targetElement.style.overflow = 'hidden';
  targetElement.style.flexShrink = '0';
  targetElement.style.transformOrigin = 'top left';

  const wrapper = document.createElement('div');
  wrapper.className = `template-${templateId}`;
  if (isAdaptive) {
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
  } else {
    wrapper.style.width = config.width + 'px';
    wrapper.style.height = config.height + 'px';
  }
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';
  wrapper.innerHTML = html;

  targetElement.appendChild(wrapper);
}

function getThemeTarget(): HTMLElement {
  return document.getElementById('previewPanel') ?? document.documentElement;
}

export function applyThemeVariables(colors: Record<string, string>): void {
  const target = getThemeTarget();
  for (const [key, value] of Object.entries(colors)) {
    const varName = key.startsWith('--') ? key : `--${key}`;
    target.style.setProperty(varName, value);
  }
}

export function updateTemplateBackground(templateId: string, imageUrl: string): void {
  const bgVarMap: Record<string, string> = {
    login: '--theme-login-bg-image',
    desktop: '--theme-header-bg-image',
  };

  const varName = bgVarMap[templateId];
  if (varName) {
    getThemeTarget().style.setProperty(varName, `url('${imageUrl}')`);
    applyThemeVariables({ [varName]: `url('${imageUrl}')` });
  }
}

export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return TEMPLATES[templateId];
}

export function getAllTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}
