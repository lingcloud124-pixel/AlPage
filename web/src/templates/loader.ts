import type { ColorSetting } from '../components/color-editor';
import { initLoginBehavior } from './login-behavior';
import { initDesktopBehavior } from './desktop-behavior';
import { buildThemeImageAssignments } from './theme-images';
import { getTemplateRegistry, type TemplateConfig } from '../theme/template-registry';

const TEMPLATES: Record<string, TemplateConfig> = getTemplateRegistry();

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
  targetElement.style.width = '100%';
  targetElement.style.height = '100%';
  targetElement.style.position = 'relative';
  targetElement.style.overflow = 'hidden';
  targetElement.style.flexShrink = '0';
  targetElement.style.display = 'block';

  const wrapper = document.createElement('div');
  wrapper.className = `template-${templateId}`;
  wrapper.dataset.templateId = templateId;
  wrapper.style.width = config.width + 'px';
  wrapper.style.height = config.height + 'px';
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.overflow = 'hidden';
  wrapper.innerHTML = html;

  targetElement.appendChild(wrapper);

  if (config.id === 'login') {
    initLoginBehavior(wrapper);
    return;
  }

  if (config.id === 'desktop') {
    initDesktopBehavior(wrapper);
  }
}

const LINKED_LIGHT_BG_VARS = [
  '--tlayout-header-bg-extend-color',
  '--portal-header-bg-extend-color',
  '--sidebar-panel-bg',
  '--gradient-start',
] as const;

function applyLinkedLightBgVars(target: HTMLElement, varName: string, value: string): boolean {
  const templateType = target.getAttribute('data-template-type');
  if (templateType === 'dark-ui') return false;
  if (!LINKED_LIGHT_BG_VARS.includes(varName as typeof LINKED_LIGHT_BG_VARS[number])) return false;
  for (const linkedVar of LINKED_LIGHT_BG_VARS) {
    target.style.setProperty(linkedVar, value);
  }
  return true;
}

function getThemeTarget(): HTMLElement {
  return document.getElementById('previewPanel') ?? document.documentElement;
}

export function applyThemeVariables(colors: Record<string, string>): void {
  const target = getThemeTarget();
  for (const [key, value] of Object.entries(colors)) {
    const varName = key.startsWith('--') ? key : `--${key}`;
    if (applyLinkedLightBgVars(target, varName, value)) continue;
    target.style.setProperty(varName, value);
  }
}

export function updateTemplateBackground(templateId: string, imageUrl: string): void {
  const assignments = buildThemeImageAssignments(templateId, imageUrl);
  if (Object.keys(assignments).length > 0) {
    applyThemeVariables(assignments);
  }
}

export function getTemplateConfig(templateId: string): TemplateConfig | undefined {
  return TEMPLATES[templateId];
}

export function getAllTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}
