import { updateThemeColors, getCurrentVariables } from '../pen-renderer';

export interface ColorSetting {
  name: string;
  property: string;
  label: string;
  group: string;
  defaultValue: string;
}

const colorSettings: ColorSetting[] = [
  { name: 'primary', property: '--primary-color', label: '主题色', group: 'theme', defaultValue: '#2C615C' },
  { name: 'primary-hover', property: '--primary-color-hover', label: '主题色悬停', group: 'theme', defaultValue: '#B2FFE6' },
  { name: 'alter', property: '--alter-color', label: '辅助色', group: 'theme', defaultValue: '#144E48' },
  { name: 'alter-hover', property: '--alter-color-hover-on', label: '辅助色悬停激活', group: 'theme', defaultValue: '#73CAA6' },
  
  { name: 'opacity-10', property: '--primary-color-opacity-10', label: '主题色透明度10%', group: 'opacity', defaultValue: '#E9F1EB' },
  { name: 'opacity-20', property: '--primary-color-opacity-20', label: '主题色透明度20%', group: 'opacity', defaultValue: '#D3E2D8' },
  { name: 'opacity-30', property: '--primary-color-opacity-30', label: '主题色透明度30%', group: 'opacity', defaultValue: '#BDD4C4' },
  
  { name: 'header-font', property: '--header-font-color', label: '标题字体色', group: 'text', defaultValue: '#333333' },
  { name: 'auxiliary-gray', property: '--auxiliary-gray', label: '辅助灰色', group: 'text', defaultValue: '#999999' },
  { name: 'auxiliary-gray-dark', property: '--auxiliary-gray-dark', label: '深辅助灰色', group: 'text', defaultValue: '#666666' },
  
  { name: 'body-bg', property: '--body-bg-color', label: '主体背景色', group: 'bg', defaultValue: '#F8F8F8' },
  { name: 'header-extend', property: '--portal-header-bg-extend-color', label: '页眉扩展背景色', group: 'bg', defaultValue: '#FBFCF2' },
  { name: 'header-complex-extend', property: '--portal-header-complex-bg-extend-color', label: '页眉复合背景色', group: 'bg', defaultValue: '#FBFCF2' },
  { name: 'login-bg', property: '--login-bg-color', label: '登录背景色', group: 'bg', defaultValue: '#144E48' },
  
  { name: 'sidebar-panel', property: '--sidebar-panel-bg', label: '侧边栏面板背景', group: 'sidebar', defaultValue: '#B8A9D9' },
  { name: 'sidebar-color', property: '--sidebar-color', label: '侧边栏文字色', group: 'sidebar', defaultValue: '#333333' },
  { name: 'icon-color', property: '--sidebar-icon-color', label: '侧边栏图标色', group: 'sidebar', defaultValue: '#9B8FC7' },
  
  { name: 'border', property: '--border-color', label: '边框色', group: 'border', defaultValue: '#EEEEEE' },
  { name: 'border-icon', property: '--border-icon-color', label: '图栋边框色', group: 'border', defaultValue: '#EEEEEE' },
  
  { name: 'gradient-start', property: '--gradient-start', label: '渐变起点色', group: 'gradient', defaultValue: '#fdfff5' },
  { name: 'gradient-mid', property: '--gradient-mid', label: '渐变中间色', group: 'gradient', defaultValue: '#f7f3cd' },
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
  resetButton.textContent = '恢复默认主题';
  resetButton.style.width = '100%';
  resetButton.style.marginTop = '20px';
  resetButton.classList.add('reset-button');
  
  resetButton.addEventListener('click', () => {
    const defaults: Record<string, string> = {};
    for (const s of colorSettings) {
      defaults[s.property.substring(2)] = s.defaultValue;
    }
    updateThemeColors(defaults);
    initializeColorEditor();
  });
  
  container.appendChild(resetButton);
  
  console.log('Color editor initialized with', colorSettings.length, 'color controls');
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
  colorInput.value = setting.defaultValue;
  
  // Get current value from pen-renderer variable system
  try {
    const currentVars = getCurrentVariables();
    const varName = setting.property.substring(2);
    if (varName in currentVars) {
      const currentValue = currentVars[varName];
      if (currentValue) {
        colorInput.value = normalizeHexColor(currentValue.toString());
      }
    }
  } catch (e) {
    console.warn(`Could not get current value for ${setting.property}, using default`);
    colorInput.value = normalizeHexColor(setting.defaultValue);
  }
  
  colorInput.addEventListener('input', () => {
    const hexValue = colorInput.value;
    const varName = setting.property.substring(2);
    updateThemeColors({ [varName]: hexValue });
    
    const textInput = colorPickerContainer.querySelector('.hex-input') as HTMLInputElement;
    if (textInput) {
      textInput.value = hexValue;
    }
  });
  
  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'hex-input';
  hexInput.value = normalizeHexColor(colorInput.value);
  hexInput.size = 7;
  
  hexInput.addEventListener('change', () => {
    const normalizedValue = normalizeHexColor(hexInput.value);
    if (isValidHex(normalizedValue)) {
      colorInput.value = normalizedValue;
      const varName = setting.property.substring(2);
      updateThemeColors({ [varName]: normalizedValue });
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