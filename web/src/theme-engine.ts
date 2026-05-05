import { renderTemplate } from './templates/loader';
import { buildThemeImageAssignments } from './templates/theme-images';
import { initDesktopBehavior } from './templates/desktop-behavior';
import { getTemplateSpecificThemeVars } from './theme/template-specific-vars';
import { getHeaderSelectOptions } from './theme/template-registry';
import { getCurrentProjectId, loadProject, saveProject } from './project-manager';
import type { Project } from './project-manager';
import { loadProjectVisualContext } from './tools/project-visual-context-store';

const LINKED_LIGHT_BG_VARS = [
  '--tlayout-header-bg-extend-color',
  '--portal-header-bg-extend-color',
  '--sidebar-panel-bg',
  '--gradient-start',
] as const;

function applyLinkedLightBgVars(target: HTMLElement, name: string, value: string): boolean {
  const templateType = target.getAttribute('data-template-type');
  if (templateType === 'dark-ui') return false;
  if (!LINKED_LIGHT_BG_VARS.includes(name as typeof LINKED_LIGHT_BG_VARS[number])) return false;
  for (const varName of LINKED_LIGHT_BG_VARS) {
    target.style.setProperty(varName, value);
  }
  return true;
}

export function setThemeVar(name: string, value: string): void {
  const panel = document.getElementById('previewPanel');
  if (!panel) return;
  if (applyLinkedLightBgVars(panel, name, value)) return;
  panel.style.setProperty(name, value);
}

export function applyThemeImageAssignments(templateId: string, imageUrl: string): void {
  const assignments = buildThemeImageAssignments(templateId, imageUrl);
  for (const [name, value] of Object.entries(assignments)) {
    setThemeVar(name, value);
  }
}

export function applyTemplateSpecificThemeVars(templateType: 'light-ui' | 'dark-ui'): void {
  const target = getThemeTarget();
  target.setAttribute('data-template-type', templateType);
  target.style.removeProperty('--login-accent-color');
  target.style.removeProperty('--login-accent-hover-color');
  for (const [name, value] of Object.entries(getTemplateSpecificThemeVars(templateType))) {
    target.style.setProperty(name, value);
  }
}

export function getThemeTarget(): HTMLElement {
  return document.getElementById('previewPanel') ?? document.documentElement;
}

const COLOR_VAR_NAMES = [
  'primary-color', 'primary-color-hover', 'alter-color', 'alter-color-hover-on',
  'primary-color-opacity-10', 'primary-color-opacity-20', 'primary-color-opacity-30',
  'header-font-color', 'header-font-color-hover', 'auxiliary-gray', 'auxiliary-gray-dark',
  'body-bg-color', 'tlayout-header-bg-extend-color', 'portal-header-bg-extend-color', 'portal-header-complex-bg-extend-color',
  'login-bg-color', 'panel-bg-color',
  'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color', 'sidebar-icon-color-hover',
  'sidebar-accordionpanel-font', 'sidebar-accordionpanel-header-bg', 'sidebar-accordionpanel-header-bgon',
  'sidebar-item-current-color', 'sidebar-item-current-hex',
  'search-font-color', 'search-input-border-color', 'search-placehold-font-color',
  'border-color', 'border-icon-color',
  'gradient-start', 'gradient-mid',
];

const IMAGE_VAR_NAMES = [
  'theme-login-bg-image',
  'theme-header-bg-image',
  'theme-sidebar-bg-image',
  'theme-desktop-feature-image',
  'theme-desktop-accent-image',
] as const;

export function resetThemeTargetStyles(): void {
  const target = getThemeTarget();
  for (const v of COLOR_VAR_NAMES) {
    target.style.removeProperty(`--${v}`);
  }
  for (const v of IMAGE_VAR_NAMES) {
    target.style.removeProperty(`--${v}`);
  }
  target.style.removeProperty('--login-accent-color');
  target.style.removeProperty('--login-accent-hover-color');
}

export async function saveCurrentColorsToProject(): Promise<void> {
  const pid = getCurrentProjectId();
  if (!pid) return;
  const project = await loadProject(pid);
  if (!project) return;
  const target = getThemeTarget();
  const computed = getComputedStyle(target);
  const colors: Record<string, string> = {};
  for (const v of COLOR_VAR_NAMES) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) colors[v] = val;
  }
  project.colors = colors;

  const loginBgRaw = target.style.getPropertyValue('--theme-login-bg-image').trim();
  const loginBgMatch = loginBgRaw.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  if (loginBgMatch) {
    const loginBgUrl = loginBgMatch[1];
    if (loginBgUrl.startsWith('blob:')) {
      const visualContextBg = loadProjectVisualContext(pid).imageInput?.dataUrl;
      if (visualContextBg) {
        project.bgImageUrl = visualContextBg;
      }
    } else {
      project.bgImageUrl = loginBgUrl;
    }
  }

  const headerBgRaw = target.style.getPropertyValue('--theme-header-bg-image').trim();
  const headerBgMatch = headerBgRaw.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  if (headerBgMatch) {
    const headerBgUrl = headerBgMatch[1];
    if (!headerBgUrl.startsWith('blob:')) {
      project.headerBgImageUrl = headerBgUrl;
    }
  }

  await saveProject(project);
}

export function getCurrentColors(): Record<string, string> {
  const target = getThemeTarget();
  const computed = getComputedStyle(target);
  const vars: Record<string, string> = {};
  for (const v of COLOR_VAR_NAMES) {
    const val = computed.getPropertyValue(`--${v}`).trim();
    if (val) vars[v] = val;
  }
  return vars;
}

export function getAllCSSVariables(): Record<string, string> {
  return getCurrentColors();
}

export async function loadDefaultTemplates() {
  try {
    const loginTarget = document.getElementById('loginPage');
    const mainTarget = document.getElementById('mainPage');
    const headerDefaultTarget = document.getElementById('headerDefaultPage');
    const headerComplexTarget = document.getElementById('headerComplexPage');
    const headerMenuTarget = document.getElementById('headerMenuPage');
    const headerBannerTarget = document.getElementById('headerBannerPage');
    const sidebarTarget = document.getElementById('sidebarPage');

    if (loginTarget) await renderTemplate('login', loginTarget);
    if (mainTarget) await renderTemplate('desktop', mainTarget);
    if (mainTarget?.firstElementChild instanceof HTMLElement) {
      initDesktopBehavior(mainTarget.firstElementChild);
    }
    if (headerDefaultTarget) await renderTemplate('header-default', headerDefaultTarget);
    if (headerComplexTarget) await renderTemplate('header-complex', headerComplexTarget);
    if (headerMenuTarget) await renderTemplate('header-menu', headerMenuTarget);
    if (headerBannerTarget) await renderTemplate('header-banner', headerBannerTarget);
    if (sidebarTarget) await renderTemplate('sidebar', sidebarTarget);

    requestAnimationFrame(() => { (window as any).resizePreview?.(); });
  } catch (e) {
    console.error('Failed to load templates:', (e as Error).message);
  }
}

export function applyPresetBackground(presetKey: string, bgMap: Record<string, string>): void {
  const bgUrl = bgMap[presetKey];
  if (bgUrl) {
    applyThemeImageAssignments('login', bgUrl);
    applyThemeImageAssignments('desktop', bgUrl);
  }
}

export function hydrateHeaderSelectOptions() {
  const options = getHeaderSelectOptions();
  const select = document.getElementById('headerSelect') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '';
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.name;
    select.appendChild(option);
  });
}

export function setupQualityCheck() {
  const qcRunBtn = document.getElementById('qcRunBtn');
  if (!qcRunBtn) return;
  qcRunBtn.addEventListener('click', runQualityCheck);
}

function runQualityCheck() {
  const resultsContainer = document.getElementById('qcResults');
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';
  const root = getComputedStyle(document.documentElement);
  const checks = [
    { label: '主题文字对比 (primary on white)', fg: root.getPropertyValue('--primary-color').trim(), bg: '#FFFFFF' },
    { label: '标题文字对比 (header-font on body-bg)', fg: root.getPropertyValue('--header-font-color').trim(), bg: root.getPropertyValue('--body-bg-color').trim() },
    { label: '标题文字对比 (header-font on panel)', fg: root.getPropertyValue('--header-font-color').trim(), bg: root.getPropertyValue('--panel-bg-color').trim() || '#FFFFFF' },
    { label: '辅助灰文字对比 (aux-gray on white)', fg: root.getPropertyValue('--auxiliary-gray').trim(), bg: '#FFFFFF' },
    { label: '侧边栏文字对比 (sidebar-color on sidebar-bg)', fg: root.getPropertyValue('--sidebar-color').trim(), bg: root.getPropertyValue('--sidebar-panel-bg').trim() },
    { label: '白色文字对比 (white on primary)', fg: '#FFFFFF', bg: root.getPropertyValue('--primary-color').trim() },
    { label: '白色文字对比 (white on alter)', fg: '#FFFFFF', bg: root.getPropertyValue('--alter-color').trim() },
  ];

  let passCount = 0;
  for (const check of checks) {
    if (!check.fg || !check.bg) continue;
    const ratio = getContrastRatio(check.fg, check.bg);
    const pass = ratio >= 4.5;
    if (pass) passCount++;
    const item = document.createElement('div');
    item.className = 'qc-item';
    item.innerHTML = `<span class="qc-label">${check.label}</span><span class="${pass ? 'qc-pass' : 'qc-fail'}">${ratio.toFixed(1)}:1 ${pass ? '✓' : '✗'}</span>`;
    resultsContainer.appendChild(item);
  }

  const summary = document.createElement('div');
  summary.style.marginTop = '12px';
  summary.style.fontWeight = '600';
  summary.style.fontSize = '13px';
  summary.style.color = passCount === checks.length ? '#4CAF50' : '#E53935';
  summary.textContent = `${passCount}/${checks.length} 项通过 WCAG AA 标准`;
  resultsContainer.appendChild(summary);
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  if (!rgb1 || !rgb2) return 0;
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return null;
  return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
