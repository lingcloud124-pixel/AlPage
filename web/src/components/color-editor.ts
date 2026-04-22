import { getCurrentProjectId } from '../project-manager';
import { DEFAULT_LIGHT_UI_PRIMARY, deriveColorsFromPrimary, toCssVarRecord } from '../theme/color-utils';

export interface ColorSetting {
  name: string;
  property: string;
  label: string;
  group: string;
  defaultValue: string;
}

const defaultLightUiTheme = toCssVarRecord(deriveColorsFromPrimary(DEFAULT_LIGHT_UI_PRIMARY, 'light-ui'));

const colorSettings: ColorSetting[] = [
  { name: 'primary', property: '--primary-color', label: '主题色', group: 'theme', defaultValue: defaultLightUiTheme['--primary-color'] },
  { name: 'primary-hover', property: '--primary-color-hover', label: '主题色悬停', group: 'theme', defaultValue: defaultLightUiTheme['--primary-color-hover'] },
  { name: 'alter', property: '--alter-color', label: '辅助色', group: 'theme', defaultValue: defaultLightUiTheme['--alter-color'] },
  { name: 'alter-hover', property: '--alter-color-hover-on', label: '辅助色悬停激活', group: 'theme', defaultValue: defaultLightUiTheme['--alter-color-hover-on'] },

  { name: 'opacity-10', property: '--primary-color-opacity-10', label: '主题色透明度10%', group: 'opacity', defaultValue: defaultLightUiTheme['--primary-color-opacity-10'] },
  { name: 'opacity-20', property: '--primary-color-opacity-20', label: '主题色透明度20%', group: 'opacity', defaultValue: defaultLightUiTheme['--primary-color-opacity-20'] },
  { name: 'opacity-30', property: '--primary-color-opacity-30', label: '主题色透明度30%', group: 'opacity', defaultValue: defaultLightUiTheme['--primary-color-opacity-30'] },

  { name: 'header-font', property: '--header-font-color', label: '标题字体色', group: 'text', defaultValue: defaultLightUiTheme['--header-font-color'] },
  { name: 'auxiliary-gray', property: '--auxiliary-gray', label: '辅助灰色', group: 'text', defaultValue: defaultLightUiTheme['--auxiliary-gray'] },
  { name: 'auxiliary-gray-dark', property: '--auxiliary-gray-dark', label: '深辅助灰色', group: 'text', defaultValue: defaultLightUiTheme['--auxiliary-gray-dark'] },

  { name: 'body-bg', property: '--body-bg-color', label: '主体背景色', group: 'bg', defaultValue: defaultLightUiTheme['--body-bg-color'] },
  { name: 'header-extend', property: '--portal-header-bg-extend-color', label: '页眉扩展背景色', group: 'bg', defaultValue: defaultLightUiTheme['--portal-header-bg-extend-color'] },
  { name: 'header-complex-extend', property: '--portal-header-complex-bg-extend-color', label: '页眉复合背景色', group: 'bg', defaultValue: defaultLightUiTheme['--portal-header-complex-bg-extend-color'] },
  { name: 'login-bg', property: '--login-bg-color', label: '登录背景色', group: 'bg', defaultValue: defaultLightUiTheme['--login-bg-color'] },
  { name: 'panel-bg', property: '--panel-bg-color', label: '面板背景色', group: 'bg', defaultValue: defaultLightUiTheme['--panel-bg-color'] },

  { name: 'sidebar-panel', property: '--sidebar-panel-bg', label: '侧边栏面板背景', group: 'sidebar', defaultValue: defaultLightUiTheme['--sidebar-panel-bg'] },
  { name: 'sidebar-color', property: '--sidebar-color', label: '侧边栏文字色', group: 'sidebar', defaultValue: defaultLightUiTheme['--sidebar-color'] },
  { name: 'icon-color', property: '--sidebar-icon-color', label: '侧边栏图标色', group: 'sidebar', defaultValue: defaultLightUiTheme['--sidebar-icon-color'] },

  { name: 'border', property: '--border-color', label: '边框色', group: 'border', defaultValue: defaultLightUiTheme['--border-color'] },
  { name: 'border-icon', property: '--border-icon-color', label: '图标边框色', group: 'border', defaultValue: defaultLightUiTheme['--border-icon-color'] },

  { name: 'gradient-start', property: '--gradient-start', label: '渐变起点色', group: 'gradient', defaultValue: defaultLightUiTheme['--gradient-start'] },
  { name: 'gradient-mid', property: '--gradient-mid', label: '渐变中间色', group: 'gradient', defaultValue: defaultLightUiTheme['--gradient-mid'] },
];

const groupLabels: Record<string, string> = {
  theme: '主题色系',
  opacity: '透明度',
  text: '文字色系',
  bg: '背景色系',
  sidebar: '侧边栏',
  border: '边框',
  gradient: '渐变组件色'
};

const LINKED_LIGHT_BG_VARS = [
  '--portal-header-bg-extend-color',
  '--sidebar-panel-bg',
  '--gradient-start',
] as const;

function applyLinkedLightBgVars(target: HTMLElement, varName: string, value: string): boolean {
  if (getActiveTemplateType() === 'dark-ui') return false;
  if (!LINKED_LIGHT_BG_VARS.includes(varName as typeof LINKED_LIGHT_BG_VARS[number])) return false;
  for (const linkedVar of LINKED_LIGHT_BG_VARS) {
    target.style.setProperty(linkedVar, value);
  }
  return true;
}

function getThemeTarget(): HTMLElement {
  return document.getElementById('previewPanel') ?? document.documentElement;
}

function getActiveTemplateType(): 'light-ui' | 'dark-ui' {
  const currentProjectId = getCurrentProjectId();
  if (!currentProjectId) return 'light-ui';
  const type = getComputedStyle(getThemeTarget()).getPropertyValue('--template-type').trim();
  return type === 'dark-ui' ? 'dark-ui' : 'light-ui';
}

function getResetBaselineColors(): Record<string, string> {
  return Object.fromEntries(colorSettings.map((setting) => [setting.property, setting.defaultValue]));
}

function getCSSVar(varName: string): string {
  return getComputedStyle(getThemeTarget()).getPropertyValue(varName).trim();
}

function setCSSVar(varName: string, value: string): void {
  const target = getThemeTarget();
  if (applyLinkedLightBgVars(target, varName, value)) return;
  target.style.setProperty(varName, value);
}

export function updateThemeColors(colors: Record<string, string>): void {
  for (const [name, value] of Object.entries(colors)) {
    const varName = name.startsWith('--') ? name : `--${name}`;
    setCSSVar(varName, value);
  }
}

export function syncColorEditorFromTheme(): void {
  const container = document.getElementById('colorEditor');
  if (!container) return;

  for (const setting of colorSettings) {
    const currentVal = normalizeHexColor(getCSSVar(setting.property) || setting.defaultValue);
    const colorInput = container.querySelector<HTMLInputElement>(`input[type="color"][data-css-var="${setting.property}"]`);
    const hexInput = container.querySelector<HTMLInputElement>(`input[type="text"][data-css-var="${setting.property}"]`);
    if (colorInput) colorInput.value = currentVal;
    if (hexInput) hexInput.value = currentVal;
  }
}

export function getCurrentVariables(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of colorSettings) {
    const val = getCSSVar(s.property);
    if (val) {
      result[s.property.substring(2)] = val;
    }
  }
  return result;
}

/**
 * Initializes the color editor by generating all the necessary UI controls
 */
export function initializeColorEditor(): void {
  const container = document.getElementById('colorEditor');
  if (!container) {
    console.error('Color editor container not found');
    return;
  }

  container.innerHTML = '';
  
  const groups = groupColorSettings(colorSettings);
  
  for (const [groupId, settings] of Object.entries(groups)) {
    const groupElement = createColorGroup(groupId, settings);
    container.appendChild(groupElement);
  }
  
  const resetButton = document.createElement('button');
  resetButton.textContent = '恢复生成主题';
  resetButton.style.width = '100%';
  resetButton.style.marginTop = '20px';
  resetButton.classList.add('reset-button');
  
  resetButton.addEventListener('click', () => {
    const baselineColors = getResetBaselineColors();
    for (const s of colorSettings) {
      setCSSVar(s.property, baselineColors[s.property] ?? s.defaultValue);
    }
    initializeColorEditor();
  });
  
  container.appendChild(resetButton);
  
  // === 品牌色推导区域 ===
  const deriveSection = document.createElement('div');
  deriveSection.className = 'derive-section';

  const deriveTitle = document.createElement('h3');
  deriveTitle.textContent = '品牌色推导';
  deriveSection.appendChild(deriveTitle);

  const deriveDescription = document.createElement('p');
  deriveDescription.textContent = '输入品牌主色，按当前模板规则自动推导全套配色';
  deriveDescription.style.fontSize = '12px';
  deriveDescription.style.color = 'var(--auxiliary-gray)';
  deriveDescription.style.margin = '0 0 12px 0';
  deriveSection.appendChild(deriveDescription);

  const deriveRow = document.createElement('div');
  deriveRow.className = 'derive-row';
  deriveRow.style.display = 'flex';
  deriveRow.style.gap = '8px';
  deriveRow.style.alignItems = 'center';

  const deriveInput = document.createElement('input');
  deriveInput.type = 'text';
  deriveInput.placeholder = '#FF6B00';
  deriveInput.className = 'derive-input';
  deriveInput.style.flex = '1';
  deriveInput.style.height = '36px';
  deriveInput.style.border = '1px solid var(--border-color)';
  deriveInput.style.borderRadius = '4px';
  deriveInput.style.padding = '0 12px';
  deriveInput.style.fontSize = '14px';

  const deriveColorPicker = document.createElement('input');
  deriveColorPicker.type = 'color';
  deriveColorPicker.style.width = '36px';
  deriveColorPicker.style.height = '36px';
  deriveColorPicker.style.border = 'none';
  deriveColorPicker.style.cursor = 'pointer';
  deriveColorPicker.style.padding = '0';

  deriveColorPicker.addEventListener('input', () => {
    deriveInput.value = deriveColorPicker.value.toUpperCase();
  });

  deriveInput.addEventListener('input', () => {
    const val = deriveInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      deriveColorPicker.value = val;
    }
  });

  const deriveBtn = document.createElement('button');
  deriveBtn.textContent = '推导';
  deriveBtn.className = 'derive-btn';
  deriveBtn.style.height = '36px';
  deriveBtn.style.padding = '0 16px';
  deriveBtn.style.backgroundColor = 'var(--primary-color)';
  deriveBtn.style.color = 'var(--white)';
  deriveBtn.style.border = 'none';
  deriveBtn.style.borderRadius = '4px';
  deriveBtn.style.cursor = 'pointer';
  deriveBtn.style.fontSize = '14px';
  deriveBtn.style.fontWeight = '500';
  deriveBtn.style.transition = 'background-color 0.2s ease';

  deriveBtn.addEventListener('mouseenter', () => {
    deriveBtn.style.backgroundColor = 'var(--alter-color)';
  });
  deriveBtn.addEventListener('mouseleave', () => {
    deriveBtn.style.backgroundColor = 'var(--primary-color)';
  });

  deriveBtn.addEventListener('click', () => {
    const hex = deriveInput.value.trim() || deriveColorPicker.value;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      showDeriveError(deriveSection, '请输入有效的 #RRGGBB 格式颜色');
      return;
    }
    
    // 使用 color-utils 推导
    const templateType = getActiveTemplateType();
    const colors = deriveColorsFromPrimary(hex, templateType);
    
    // 应用到 CSS 变量
    for (const [key, value] of Object.entries(colors)) {
      setCSSVar(`--${key}`, value);
    }
    
    // 刷新面板显示
    initializeColorEditor();
    showDeriveSuccess(deriveSection, `已按 ${templateType} 规则从 ${hex} 推导并应用全套配色`);
  });

  deriveRow.appendChild(deriveColorPicker);
  deriveRow.appendChild(deriveInput);
  deriveRow.appendChild(deriveBtn);
  deriveSection.appendChild(deriveRow);

  container.appendChild(deriveSection);

  console.log('Color editor initialized with', colorSettings.length, 'color controls');
  syncColorEditorFromTheme();
}

function groupColorSettings(settings: ColorSetting[]): Record<string, ColorSetting[]> {
  const grouped: Record<string, ColorSetting[]> = {};
  
  for (const setting of settings) {
    if (!grouped[setting.group]) {
      grouped[setting.group] = [];
    }
    grouped[setting.group].push(setting);
  }
  
  return grouped;
}

function createColorGroup(groupId: string, settings: ColorSetting[]): HTMLElement {
  const groupDiv = document.createElement('div');
  groupDiv.className = 'color-group';
  
  const groupLabel = document.createElement('h3');
  groupLabel.textContent = groupLabels[groupId] || groupId.toUpperCase();
  groupDiv.appendChild(groupLabel);
  
  for (const setting of settings) {
    const control = createColorControl(setting);
    groupDiv.appendChild(control);
  }
  
  return groupDiv;
}

function createColorControl(setting: ColorSetting): HTMLElement {
  const controlDiv = document.createElement('div');
  controlDiv.className = 'color-setting';
  
  const label = document.createElement('label');
  label.textContent = setting.label;
  controlDiv.appendChild(label);
  
  const colorPickerContainer = document.createElement('div');
  colorPickerContainer.className = 'color-picker-container';
  
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.dataset.cssVar = setting.property;
  
  const currentVal = getCSSVar(setting.property);
  colorInput.value = normalizeHexColor(currentVal || setting.defaultValue);
  
  colorInput.addEventListener('input', () => {
    const hexValue = colorInput.value;
    setCSSVar(setting.property, hexValue);
    
    const textInput = colorPickerContainer.querySelector('.hex-input') as HTMLInputElement;
    if (textInput) {
      textInput.value = hexValue;
    }
  });
  
  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'hex-input';
  hexInput.dataset.cssVar = setting.property;
  hexInput.value = normalizeHexColor(colorInput.value);
  hexInput.size = 7;
  
  hexInput.addEventListener('change', () => {
    const normalizedValue = normalizeHexColor(hexInput.value);
    if (isValidHex(normalizedValue)) {
      colorInput.value = normalizedValue;
      setCSSVar(setting.property, normalizedValue);
    } else {
      hexInput.value = normalizeHexColor(colorInput.value);
    }
  });
  
  colorPickerContainer.appendChild(colorInput);
  colorPickerContainer.appendChild(hexInput);
  controlDiv.appendChild(colorPickerContainer);
  
  return controlDiv;
}

function isValidHex(str: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(str);
}

function normalizeHexColor(str: string): string {
  let result = str.trim();
  
  if (!result.startsWith('#')) {
    result = '#' + result;
  }
  
  if (result.length === 4) {
    result = '#' + result[1] + result[1] + result[2] + result[2] + result[3] + result[3];
  }
  
  return result.toUpperCase();
}

function showDeriveError(container: HTMLElement, msg: string): void {
  clearDeriveMessage(container);
  const el = document.createElement('div');
  el.className = 'derive-message derive-error';
  el.textContent = msg;
  el.style.color = '#E53935';
  el.style.fontSize = '12px';
  el.style.marginTop = '8px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showDeriveSuccess(container: HTMLElement, msg: string): void {
  clearDeriveMessage(container);
  const el = document.createElement('div');
  el.className = 'derive-message derive-success';
  el.textContent = msg;
  el.style.color = 'var(--primary-color)';
  el.style.fontSize = '12px';
  el.style.marginTop = '8px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function clearDeriveMessage(container: HTMLElement): void {
  container.querySelectorAll('.derive-message').forEach(el => el.remove());
}
