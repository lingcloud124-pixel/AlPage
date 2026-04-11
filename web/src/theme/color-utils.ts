/**
 * 品牌色推导工具
 * 输入一个 #hex 主色，自动推导出全套 CSS 变量色值
 */

// ============ HSL/RGB 工具函数 ============

/**
 * 将 hex 颜色转换为 RGB
 * @param hex - 十六进制颜色值，如 '#2C615C' 或 '2C615C'
 * @returns RGB 对象 { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // 移除 # 前缀
  const cleanHex = hex.replace('#', '');
  
  // 解析 hex 值
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * 将 RGB 转换为 HSL
 * @param r - 红色值 (0-255)
 * @param g - 绿色值 (0-255)
 * @param b - 蓝色值 (0-255)
 * @returns HSL 对象 { h: 0-360, s: 0-100, l: 0-100 }
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  // 归一化到 0-1
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  
  // 计算 L (亮度)
  const l = (max + min) / 2;
  
  // 计算 H (色相) 和 S (饱和度)
  let h = 0;
  let s = 0;
  
  if (delta !== 0) {
    // 计算 S
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    // 计算 H
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) + (gNorm < bNorm ? 6 : 0);
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / delta) + 2;
    } else if (max === bNorm) {
      h = ((rNorm - gNorm) / delta) + 4;
    }
    
    h = h * 60;
  }
  
  // 转换为百分比格式
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * 将 HSL 转换为 RGB
 * @param h - 色相 (0-360)
 * @param s - 饱和度 (0-100)
 * @param l - 亮度 (0-100)
 * @returns RGB 对象 { r: 0-255, g: 0-255, b: 0-255 }
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  // 归一化 HSL 值
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;
  
  let r: number;
  let g: number;
  let b: number;
  
  if (sNorm === 0) {
    // 灰度色
    r = g = b = lNorm;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };
    
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * 将 RGB 转换为 hex
 * @param r - 红色值 (0-255)
 * @param g - 绿色值 (0-255)
 * @param b - 蓝色值 (0-255)
 * @returns 十六进制颜色值，如 '#2C615C'
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * 将 hex 转换为 HSL（组合函数）
 * @param hex - 十六进制颜色值
 * @returns HSL 对象
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * 将 HSL 转换为 hex（组合函数）
 * @param h - 色相 (0-360)
 * @param s - 饱和度 (0-100)
 * @param l - 亮度 (0-100)
 * @returns 十六进制颜色值
 */
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ============ 核心算法 ============

/**
 * 将颜色与白色混合
 * @param hex - 原始颜色
 * @param ratio - 混合比例 (0-1)，ratio=0.1 表示主色10% + 白色90%
 * @returns 混合后的 hex 颜色
 */
export function blendWhite(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.round(rgb.r * ratio + 255 * (1 - ratio));
  const g = Math.round(rgb.g * ratio + 255 * (1 - ratio));
  const b = Math.round(rgb.b * ratio + 255 * (1 - ratio));
  return rgbToHex(r, g, b);
}

/**
 * 提亮颜色（向白色混合）
 * @param hex - 原始颜色
 * @param amount - 提亮量 (0-100)，增加 HSL L 值
 * @returns 提亮后的 hex 颜色
 */
export function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.min(100, l + amount);
  return hslToHex(h, s, newL);
}

/**
 * 加深颜色（向黑色混合）
 * @param hex - 原始颜色
 * @param amount - 加深量 (0-100)，减少 HSL L 值
 * @returns 加深后的 hex 颜色
 */
export function darken(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.max(0, l - amount);
  return hslToHex(h, s, newL);
}

/**
 * 降低饱和度
 * @param hex - 原始颜色
 * @param amount - 降低量 (0-100)，减少 HSL S 值
 * @returns 降低饱和度后的 hex 颜色
 */
export function desaturate(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newS = Math.max(0, s - amount);
  return hslToHex(h, newS, l);
}

// ============ 推导规则 ============

/**
 * 推导出的颜色变量接口
 */
export interface DerivedColors {
  'primary-color': string;
  'primary-color-hover': string;
  'alter-color': string;
  'alter-color-hover-on': string;
  'primary-color-opacity-10': string;
  'primary-color-opacity-20': string;
  'primary-color-opacity-30': string;
  'header-font-color': string;
  'auxiliary-gray': string;
  'auxiliary-gray-dark': string;
  'body-bg-color': string;
  'login-bg-color': string;
  'panel-bg-color': string;
  'sidebar-panel-bg': string;
  'sidebar-color': string;
  'sidebar-icon-color': string;
  'border-color': string;
  'border-icon-color': string;
  'gradient-start': string;
  'gradient-mid': string;
}

/**
 * 根据主色推导全套 CSS 变量色值
 * @param primaryHex - 主色 hex 值，如 '#2C615C'
 * @param templateType - 模板类型，目前支持 'light-ui'
 * @returns 颜色变量 map（key 不带 '--' 前缀）
 */
export function deriveColorsFromPrimary(
  primaryHex: string,
  templateType: 'light-ui' | 'dark-ui'
): DerivedColors {
  // 目前只实现 light-ui，dark-ui 返回相同结果（后续补充）
  if (templateType === 'dark-ui') {
    // TODO: 实现 dark-ui 规则
    return deriveLightUiColors(primaryHex);
  }
  
  return deriveLightUiColors(primaryHex);
}

/**
 * Light-UI 模板的颜色推导逻辑
 * @param primaryHex - 主色 hex 值
 * @returns 推导出的颜色变量
 */
function deriveLightUiColors(primaryHex: string): DerivedColors {
  // 1. 主色及其变体
  const primaryColor = primaryHex;
  const primaryColorHover = lighten(primaryHex, 15); // lighten(primary, 20%), HSL L + 15
  
  // 2. alter-color 及其变体
  const alterColor = darken(desaturate(primaryHex, 20), 15); // darken(primary, 15%), desaturate 20%
  const alterColorHoverOn = lighten(primaryColorHover, 15); // lighten(primaryHover, 15%)
  
  // 3. opacity 变体（与白色混合）
  const primaryColorOpacity10 = blendWhite(primaryHex, 0.1);
  const primaryColorOpacity20 = blendWhite(primaryHex, 0.2);
  const primaryColorOpacity30 = blendWhite(primaryHex, 0.3);
  
  // 4. 固定灰色系
  const headerFontColor = '#333333';
  const auxiliaryGray = '#999999';
  const auxiliaryGrayDark = '#666666';
  
  // 5. 固定背景色
  const bodyBgColor = '#F8F8F8';
  const panelBgColor = '#FFFFFF';
  
  // 6. 登录背景（与白色混合）
  const loginBgColor = blendWhite(primaryHex, 0.15);
  
  // 7. sidebar-panel-bg（紫色偏移）
  const sidebarPanelBg = deriveSidebarPanelBg(primaryHex);
  
  // 8. sidebar 相关
  const sidebarColor = '#333333';
  const sidebarIconColor = blendWhite(primaryHex, 0.25);
  
  // 9. 边框色
  const borderColor = '#E5E7EB';
  const borderIconColor = '#E5E7EB';
  
  // 10. 渐变色
  const gradientStart = blendWhite(primaryHex, 0.05);
  const gradientMid = blendWhite(primaryHex, 0.15);
  
  return {
    'primary-color': primaryColor,
    'primary-color-hover': primaryColorHover,
    'alter-color': alterColor,
    'alter-color-hover-on': alterColorHoverOn,
    'primary-color-opacity-10': primaryColorOpacity10,
    'primary-color-opacity-20': primaryColorOpacity20,
    'primary-color-opacity-30': primaryColorOpacity30,
    'header-font-color': headerFontColor,
    'auxiliary-gray': auxiliaryGray,
    'auxiliary-gray-dark': auxiliaryGrayDark,
    'body-bg-color': bodyBgColor,
    'login-bg-color': loginBgColor,
    'panel-bg-color': panelBgColor,
    'sidebar-panel-bg': sidebarPanelBg,
    'sidebar-color': sidebarColor,
    'sidebar-icon-color': sidebarIconColor,
    'border-color': borderColor,
    'border-icon-color': borderIconColor,
    'gradient-start': gradientStart,
    'gradient-mid': gradientMid
  };
}

/**
 * 推导 sidebar-panel-bg（加紫色偏移）
 * 将 primary 的 H 值偏移 +45°（偏向紫色），降低饱和度，高亮度
 * @param primaryHex - 主色 hex 值
 * @returns sidebar-panel-bg 的 hex 值
 */
function deriveSidebarPanelBg(primaryHex: string): string {
  const hsl = hexToHsl(primaryHex);
  
  // 色相偏移 +45°（偏向紫色）
  const sidebarH = (hsl.h + 45) % 360;
  
  // 降低饱和度（保留 40%）
  const sidebarS = Math.max(10, hsl.s * 0.4);
  
  // 高亮度（至少 80，至多 90，基础亮度 + 30）
  const sidebarL = Math.min(90, Math.max(80, hsl.l + 30));
  
  return hslToHex(sidebarH, sidebarS, sidebarL);
}

/**
 * 将 DerivedColors 转换为 CSS 变量字符串
 * @param colors - 推导出的颜色对象
 * @returns CSS 变量字符串，如 ':root { --primary-color: #2C615C; ... }'
 */
export function colorsToCssVariables(colors: DerivedColors): string {
  const entries = Object.entries(colors)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
  
  return `:root {\n${entries}\n}`;
}