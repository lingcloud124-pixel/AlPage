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
  targetElement.style.width = config.width + 'px';
  targetElement.style.height = config.height + 'px';
  targetElement.style.position = 'relative';
  targetElement.style.overflow = 'hidden';
  targetElement.style.flexShrink = '0';
  targetElement.style.transformOrigin = 'top left';

  const wrapper = document.createElement('div');
  wrapper.className = `template-${templateId}`;
  wrapper.style.width = config.width + 'px';
  wrapper.style.height = config.height + 'px';
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';
  wrapper.innerHTML = html;

  targetElement.appendChild(wrapper);

  applyThemeVariablesToElement(wrapper);
}

export function applyThemeVariables(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    const varName = key.startsWith('--') ? key : `--${key}`;
    root.style.setProperty(varName, value);
  }

  document.querySelectorAll('[class*="template-"]').forEach((el) => {
    applyThemeVariablesToElement(el as HTMLElement);
  });
}

function applyThemeVariablesToElement(el: HTMLElement): void {
  const computedStyle = getComputedStyle(document.documentElement);
  const varNames = [
    '--primary-color', '--primary-color-hover', '--alter-color', '--alter-color-hover-on',
    '--primary-color-opacity-10', '--primary-color-opacity-20', '--primary-color-opacity-30',
    '--header-font-color', '--auxiliary-gray', '--auxiliary-gray-dark',
    '--body-bg-color', '--login-bg-color', '--panel-bg-color',
    '--sidebar-panel-bg', '--sidebar-color', '--sidebar-icon-color',
    '--border-color', '--border-icon-color',
    '--gradient-start', '--gradient-mid',
    '--theme-bg-image', '--theme-login-bg-image', '--theme-header-bg-image',
  ];

  for (const varName of varNames) {
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value) {
      el.style.setProperty(varName, value);
    }
  }
}

export function updateTemplateBackground(templateId: string, imageUrl: string): void {
  const bgVarMap: Record<string, string> = {
    login: '--theme-login-bg-image',
    desktop: '--theme-header-bg-image',
  };

  const varName = bgVarMap[templateId];
  if (varName) {
    document.documentElement.style.setProperty(varName, `url('${imageUrl}')`);
    applyThemeVariables({ [varName]: `url('${imageUrl}')` });
  }
}

export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return TEMPLATES[templateId];
}

export function getAllTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}
