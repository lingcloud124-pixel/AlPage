import { renderTemplate } from './templates/loader';
import { buildThemeImageAssignments } from './templates/theme-images';
import { getTemplateSpecificThemeVars } from './theme/template-specific-vars';
import { getHeaderSelectOptions } from './theme/template-registry';
import { getCurrentProjectId, loadProject, saveProject } from './project-manager';
import type { Project } from './project-manager';

const LINKED_LIGHT_BG_VARS = [
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
  'body-bg-color', 'portal-header-bg-extend-color', 'portal-header-complex-bg-extend-color',
  'login-bg-color', 'panel-bg-color',
  'sidebar-panel-bg', 'sidebar-color', 'sidebar-icon-color', 'sidebar-icon-color-hover',
  'sidebar-accordionpanel-font', 'sidebar-accordionpanel-header-bg', 'sidebar-accordionpanel-header-bgon',
  'sidebar-item-current-color', 'sidebar-item-current-hex',
  'search-font-color', 'search-input-border-color', 'search-placehold-font-color',
  'border-color', 'border-icon-color',
  'gradient-start', 'gradient-mid',
];

<<<<<<< Updated upstream
export async function saveCurrentColorsToProject(): Promise<void> {
=======
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

export function saveCurrentColorsToProject(): void {
>>>>>>> Stashed changes
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
  if (loginBgMatch) project.bgImageUrl = loginBgMatch[1];

  const headerBgRaw = target.style.getPropertyValue('--theme-header-bg-image').trim();
  const headerBgMatch = headerBgRaw.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  if (headerBgMatch) project.headerBgImageUrl = headerBgMatch[1];

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
    initDesktopSidebarBehavior(mainTarget);
    initDesktopTemplateBehavior(mainTarget);
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

function initDesktopSidebarBehavior(container: HTMLElement | null) {
  if (!container) return;
  container.querySelectorAll('.sidebar-group-title').forEach(header => {
    header.addEventListener('click', () => {
      const icon = header.querySelector('.collapse-icon');
      if (icon) icon.classList.toggle('collapsed');
    });
  });
}

function initDesktopTemplateBehavior(container: HTMLElement | null) {
  if (!container) return;

  const tabBtns = container.querySelectorAll<HTMLElement>('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const monthLabel = container.querySelector<HTMLElement>('.current-month');
  const calendarGrid = container.querySelector<HTMLElement>('.calendar-grid');
  const prevBtn = container.querySelector<HTMLElement>('#prev-month');
  const nextBtn = container.querySelector<HTMLElement>('#next-month');

  if (!monthLabel || !calendarGrid) return;

  const now = new Date();
  let displayYear = now.getFullYear();
  let displayMonth = now.getMonth();

  const renderCalendarWeek = () => {
    monthLabel.textContent = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;
    calendarGrid.innerHTML = '';

    const weekDays = [
      { day: 2, lunar: '十三', muted: true, event: false },
      { day: 3, lunar: '十四', muted: false, event: false },
      { day: 4, lunar: '十四', muted: false, event: false },
      { day: 5, lunar: '十五', muted: false, event: true, highlighted: true },
      { day: 6, lunar: '十六', muted: false, event: true },
      { day: 7, lunar: '十七', muted: false, event: true },
      { day: 8, lunar: '十八', muted: true, event: false },
    ];

    for (const item of weekDays) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      if (item.muted) dayElement.classList.add('other-month');
      if (item.highlighted) dayElement.classList.add('is-highlighted');

      const dayNumber = document.createElement('span');
      dayNumber.className = 'calendar-day-number';
      dayNumber.textContent = String(item.day);

      const lunar = document.createElement('span');
      lunar.className = 'calendar-day-lunar';
      lunar.textContent = item.lunar;

      dayElement.appendChild(dayNumber);
      dayElement.appendChild(lunar);

      if (item.event) {
        const eventDot = document.createElement('div');
        eventDot.className = 'event-dot';
        dayElement.appendChild(eventDot);
      }

      calendarGrid.appendChild(dayElement);
    }
  };

  prevBtn?.addEventListener('click', () => {
    displayMonth -= 1;
    if (displayMonth < 0) {
      displayMonth = 11;
      displayYear -= 1;
    }
    renderCalendarWeek();
  });

  nextBtn?.addEventListener('click', () => {
    displayMonth += 1;
    if (displayMonth > 11) {
      displayMonth = 0;
      displayYear += 1;
    }
    renderCalendarWeek();
  });

  renderCalendarWeek();
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
