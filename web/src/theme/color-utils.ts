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

export function mixColors(baseHex: string, targetHex: string, targetRatio: number): string {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  const ratio = Math.max(0, Math.min(1, targetRatio));

  return rgbToHex(
    Math.round(base.r * (1 - ratio) + target.r * ratio),
    Math.round(base.g * (1 - ratio) + target.g * ratio),
    Math.round(base.b * (1 - ratio) + target.b * ratio),
  );
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

export function adjustHsl(hex: string, deltaL: number, deltaS = 0): string {
  const { h, s, l } = hexToHsl(hex);
  const newS = Math.max(0, Math.min(100, s + deltaS));
  const newL = Math.max(0, Math.min(100, l + deltaL));
  return hslToHex(h, newS, newL);
}

export function warmShift(hex: string, red = 0, green = 0, blue = 0): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + red, g + green, b + blue);
}

// ============ 推导规则 ============

/**
 * 推导出的颜色变量接口
 */
export interface DerivedColors {
  'primary-color': string;
  'primary-text-color': string;
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
  'tlayout-header-bg-extend-color': string;
  'portal-header-bg-extend-color': string;
  'portal-header-complex-bg-extend-color': string;
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

export interface PaletteCandidate {
  hex: string;
  h: number;
  s: number;
  l: number;
  score: number;
  reason: string;
}

export interface PreferredHueHint {
  raw: string;
  label: string;
  targetHue: number;
  tolerance: number;
  fallbackHex: string;
  boost: number;
}

export interface ThemeGenerationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface ThemeGenerationReport {
  primaryColor: string;
  templateType: 'light-ui' | 'dark-ui';
  checks: ThemeGenerationCheck[];
  passed: boolean;
}

export const DEFAULT_LIGHT_UI_PRIMARY = '#2C615C';
export const DEFAULT_FALLBACK_BRAND_COLOR = '#0E70EE';
export const STANDARD_FALLBACK_PALETTE = [
  '#D20000',
  '#F4610A',
  '#EAC700',
  '#07B11F',
  '#0E70EE',
  '#820FEA',
  '#B20EBB',
] as const;

function getHueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

export function isDisallowedThemeColor(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s < 20 || l > 80 || l < 25;
}

export function pickFallbackPaletteColorByHue(targetHue?: number): string {
  if (typeof targetHue !== 'number' || Number.isNaN(targetHue)) {
    return DEFAULT_FALLBACK_BRAND_COLOR;
  }

  let best = DEFAULT_FALLBACK_BRAND_COLOR;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const hex of STANDARD_FALLBACK_PALETTE) {
    const distance = getHueDistance(hexToHsl(hex).h, targetHue);
    if (distance < bestDistance) {
      best = hex;
      bestDistance = distance;
    }
  }

  return best;
}

export function resolvePreferredHueHint(
  input: string | undefined,
  templateType: 'light-ui' | 'dark-ui',
): PreferredHueHint | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    const { h } = hexToHsl(normalized);
    return {
      raw: input,
      label: normalized,
      targetHue: h,
      tolerance: 22,
      fallbackHex: pickFallbackPaletteColorByHue(h),
      boost: 42,
    };
  }

  const hintDefs: Array<{
    aliases: string[];
    label: string;
    targetHue: number;
    tolerance: number;
    fallbackHexLight: string;
    fallbackHexDark: string;
    boost: number;
  }> = [
    {
      aliases: ['red', '红', '红色', '大红', '喜庆红', '中国红', '正红', 'crimson', 'scarlet'],
      label: 'red',
      targetHue: 4,
      tolerance: 24,
      fallbackHexLight: '#C62828',
      fallbackHexDark: '#8B1E1E',
      boost: 48,
    },
    {
      aliases: ['orange', '橙', '橙色', '橙红', '暖橙', 'amber'],
      label: 'orange',
      targetHue: 28,
      tolerance: 24,
      fallbackHexLight: '#EF6C00',
      fallbackHexDark: '#A64B00',
      boost: 42,
    },
    {
      aliases: ['yellow', '黄', '黄色', '金色', 'gold'],
      label: 'yellow',
      targetHue: 48,
      tolerance: 22,
      fallbackHexLight: '#C69214',
      fallbackHexDark: '#8C6A12',
      boost: 38,
    },
    {
      aliases: ['green', '绿', '绿色', '青绿', 'emerald'],
      label: 'green',
      targetHue: 138,
      tolerance: 26,
      fallbackHexLight: '#2E7D32',
      fallbackHexDark: '#256029',
      boost: 38,
    },
    {
      aliases: ['cyan', 'teal', '青', '青色', '蓝绿', '薄荷'],
      label: 'teal',
      targetHue: 176,
      tolerance: 24,
      fallbackHexLight: '#00897B',
      fallbackHexDark: '#0F5B53',
      boost: 36,
    },
    {
      aliases: ['blue', '蓝', '蓝色', '企业蓝', 'sky blue'],
      label: 'blue',
      targetHue: 214,
      tolerance: 26,
      fallbackHexLight: '#1565C0',
      fallbackHexDark: '#1A4E8A',
      boost: 38,
    },
    {
      aliases: ['purple', 'violet', '紫', '紫色', '蓝紫'],
      label: 'purple',
      targetHue: 264,
      tolerance: 26,
      fallbackHexLight: '#6A1B9A',
      fallbackHexDark: '#4A2374',
      boost: 36,
    },
    {
      aliases: ['pink', '粉', '粉色', '桃粉', 'rose'],
      label: 'pink',
      targetHue: 332,
      tolerance: 22,
      fallbackHexLight: '#D81B60',
      fallbackHexDark: '#92204E',
      boost: 34,
    },
  ];

  const matched = hintDefs.find((hint) => hint.aliases.some((alias) => normalized.includes(alias)));
  if (!matched) return null;

  return {
    raw: input,
    label: matched.label,
    targetHue: matched.targetHue,
    tolerance: matched.tolerance,
    fallbackHex: templateType === 'dark-ui'
      ? matched.fallbackHexDark
      : pickFallbackPaletteColorByHue(matched.targetHue),
    boost: matched.boost,
  };
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
  if (templateType === 'dark-ui') {
    return deriveDarkUiColors(primaryHex);
  }
  
  return deriveLightUiColors(primaryHex);
}

export function normalizePrimaryForTemplate(
  primaryHex: string,
  templateType: 'light-ui' | 'dark-ui',
): string {
  if (templateType !== 'light-ui') return primaryHex;

  const { h, s, l } = hexToHsl(primaryHex);
  let normalizedSaturation = s;
  let normalizedLightness = l;

  if (s < 40) {
    normalizedSaturation = 55;
  }
  normalizedSaturation = Math.max(50, Math.min(70, normalizedSaturation));

  if (l < 35) {
    normalizedLightness = 50;
  } else if (l > 70) {
    normalizedLightness = 60;
  } else {
    normalizedLightness = Math.max(45, Math.min(60, normalizedLightness));
  }

  if (normalizedSaturation === s && normalizedLightness === l) return primaryHex;

  return hslToHex(h, normalizedSaturation, normalizedLightness);
}

export function rankPrimaryCandidates(
  dominantColors: string[],
  templateType: 'light-ui' | 'dark-ui',
  preferredHueHint?: string,
): PaletteCandidate[] {
  const seen = new Set<string>();
  const candidates: PaletteCandidate[] = [];
  const hint = resolvePreferredHueHint(preferredHueHint, templateType);

  for (const hex of dominantColors) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex) || seen.has(hex.toLowerCase())) continue;
    seen.add(hex.toLowerCase());
    if (isDisallowedThemeColor(hex)) continue;

    const { h, s, l } = hexToHsl(hex);
    let score = s;
    let reason = '饱和度优先';

    if (templateType === 'light-ui') {
      const lightnessTarget = 56;
      score += Math.max(0, 30 - Math.abs(l - lightnessTarget));
      if (l >= 45 && l <= 75) score += 18;
      if (s >= 28) score += 12;
      if (l < 38) score -= 26;
      if (l > 82) score -= 18;
      reason = '偏好中浅亮度且有足够饱和度的主色';
    } else {
      const lightnessTarget = 66;
      score += Math.max(0, 28 - Math.abs(l - lightnessTarget));
      if (l >= 55 && l <= 78) score += 18;
      if (s >= 20) score += 10;
      if (l < 40) score -= 22;
      if (l > 82) score -= 18;
      reason = '偏好中高亮度(适配 Dark-UI derivation L=64-68 范围)且色相清晰的主色';
    }

    if (hint) {
      const hueDistance = getHueDistance(h, hint.targetHue);
      if (hueDistance <= hint.tolerance) {
        score += hint.boost - hueDistance * 0.75;
        reason += `；匹配已确认主色方向(${hint.label})`;
      } else {
        score -= Math.min(20, (hueDistance - hint.tolerance) * 0.35);
        reason += `；偏离已确认主色方向(${hint.label})`;
      }
    }

    candidates.push({ hex, h, s, l, score, reason });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function buildThemeGenerationReport(
  primaryHex: string,
  derived: DerivedColors,
  templateType: 'light-ui' | 'dark-ui'
): ThemeGenerationReport {
  const primary = hexToHsl(derived['primary-color']);
  const hover = hexToHsl(derived['primary-color-hover']);
  const alter = hexToHsl(derived['alter-color']);
  const alterHover = hexToHsl(derived['alter-color-hover-on']);
  const header = hexToHsl(derived['header-font-color']);
  const primarySource = hexToHsl(primaryHex);
  const hueDelta = (from: number, to: number) => ((to - from) % 360 + 360) % 360;

  const checks: ThemeGenerationCheck[] = [];

  if (templateType === 'dark-ui') {
    checks.push({
      label: '主色贴近背景主色调',
      passed: Math.abs(primary.h - primarySource.h) <= 4,
      detail: `source H=${primarySource.h}°, primary H=${primary.h}°`,
    });
    checks.push({
      label: 'primary-hover 色相偏移',
      passed: Math.abs(hueDelta(primary.h, hover.h) - 26) <= 4,
      detail: `delta=${hueDelta(primary.h, hover.h)}°`,
    });
    checks.push({
      label: 'header-font 色相偏移',
      passed: Math.abs(hueDelta(primary.h, header.h) - 22) <= 4,
      detail: `delta=${hueDelta(primary.h, header.h)}°`,
    });
    checks.push({
      label: '亮度排序',
      passed: alter.l < primary.l && primary.l < alterHover.l && alterHover.l < hover.l && hover.l < header.l,
      detail: `alter=${alter.l}, primary=${primary.l}, alterHover=${alterHover.l}, hover=${hover.l}, header=${header.l}`,
    });
    checks.push({
      label: 'sidebar-panel-bg 等于 header-font-color',
      passed: derived['sidebar-panel-bg'].toLowerCase() === derived['header-font-color'].toLowerCase(),
      detail: `${derived['sidebar-panel-bg']} vs ${derived['header-font-color']}`,
    });
    checks.push({
      label: 'login 背景保持深色',
      passed: hexToHsl(derived['login-bg-color']).l <= primary.l,
      detail: `login=${hexToHsl(derived['login-bg-color']).l}, primary=${primary.l}`,
    });
  } else {
    checks.push({
      label: '主色亮度位于 Light-UI 推荐区间',
      passed: primary.l >= 45 && primary.l <= 60,
      detail: `primary L=${primary.l}`,
    });
    checks.push({
      label: 'primary-text-color 与主色对比达标',
      passed: ['#333333', '#ffffff'].includes(derived['primary-text-color'].toLowerCase()),
      detail: derived['primary-text-color'],
    });
    checks.push({
      label: 'primary-hover 比 primary 更亮',
      passed: hover.l > primary.l,
      detail: `primary=${primary.l}, hover=${hover.l}`,
    });
    checks.push({
      label: 'alter-color 比 primary 更深',
      passed: alter.l < primary.l,
      detail: `alter=${alter.l}, primary=${primary.l}`,
    });
    checks.push({
      label: 'header-font-color 固定深色',
      passed: derived['header-font-color'].toLowerCase() === '#333333',
      detail: derived['header-font-color'],
    });
    checks.push({
      label: 'login 背景保持浅色',
      passed: hexToHsl(derived['login-bg-color']).l >= 75,
      detail: `login L=${hexToHsl(derived['login-bg-color']).l}`,
    });
    checks.push({
      label: '主色仍保留来自背景图的色相',
      passed: Math.abs(primary.h - primarySource.h) <= 6,
      detail: `source H=${primarySource.h}°, primary H=${primary.h}°`,
    });
  }

  return {
    primaryColor: derived['primary-color'],
    templateType,
    checks,
    passed: checks.every(check => check.passed),
  };
}

/**
 * Light-UI 模板的颜色推导逻辑
 * @param primaryHex - 主色 hex 值
 * @returns 推导出的颜色变量
 */
function deriveLightUiColors(primaryHex: string): DerivedColors {
  // 固化后的默认取值：
  // alter = darken 11%
  // hover = L + 8%, S + 4%
  // alter-hover = mix(white, primary, 62.5%)
  // header-extend = mix(white, primary, 5%) + 轻微暖化
  // login-bg = mix(white, primary, 4%) + 轻微暖化
  // sidebar-panel = mix(white, primary, 5%) + 微暖偏移
  // sidebar-icon = mix(#8A8A8A, primary, 20%)

  // 1. 主色及其变体
  const primaryColor = primaryHex;
  const primaryColorHover = adjustHsl(primaryHex, 8, 4);

  // 2. alter-color 及其变体
  const alterColor = darken(primaryHex, 11);
  const alterColorHoverOn = mixColors('#FFFFFF', primaryHex, 0.625);
  
  // 3. opacity 变体（与白色混合）
  const primaryColorOpacity10 = blendWhite(primaryHex, 0.1);
  const primaryColorOpacity20 = blendWhite(primaryHex, 0.2);
  const primaryColorOpacity30 = blendWhite(primaryHex, 0.3);
  
  // 4. 固定灰色系
  const headerFontColor = '#333333';
  const auxiliaryGray = '#999999';
  const auxiliaryGrayDark = '#666666';
  
  // 5. Light-UI 浅底色
  const bodyBgColor = '#F8F8F8';
  const tlayoutHeaderBgExtendColor = warmShift(blendWhite(primaryHex, 0.05), 2, -1, -3);
  const portalHeaderBgExtendColor = tlayoutHeaderBgExtendColor;
  const portalHeaderComplexBgExtendColor = tlayoutHeaderBgExtendColor;
  const panelBgColor = '#FFFFFF';
  
  // 6. 登录背景
  const loginBgColor = warmShift(blendWhite(primaryHex, 0.04), 1, 0, -2);
  
  // 7. 侧边栏
  const sidebarPanelBg = warmShift(blendWhite(primaryHex, 0.05), 3, 0, -4);
  
  // 8. sidebar 相关
  const sidebarColor = '#000000';
  const sidebarIconColor = mixColors('#8A8A8A', primaryHex, 0.2);
  
  // 9. 边框色
  const borderColor = '#D8D8D8';
  const borderIconColor = mixColors('#D8D8D8', primaryHex, 0.05);
  
  // 10. 渐变色
  const gradientStart = portalHeaderBgExtendColor;
  const gradientMid = primaryColorOpacity10;
  
  return {
    'primary-color': primaryColor,
    'primary-text-color': '#333333',
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
    'tlayout-header-bg-extend-color': tlayoutHeaderBgExtendColor,
    'portal-header-bg-extend-color': portalHeaderBgExtendColor,
    'portal-header-complex-bg-extend-color': portalHeaderComplexBgExtendColor,
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

export function toCssVarRecord(colors: DerivedColors): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--${key}`, value]),
  );
}

/**
 * Dark-UI 模板的颜色推导逻辑
 * 核心规则：色调偏移 primary → primary-hover(+26°) → header-font(+22°)
 * 亮度排序：alter(47-59) < primary(64-68) < alter-hover(97-100) < primary-hover(214-216) < header-font(180+)
 * @param primaryHex - 主色 hex 值（深色基准）
 */
function deriveDarkUiColors(primaryHex: string): DerivedColors {
  const hsl = hexToHsl(primaryHex);
  const baseH = hsl.h;
  const baseS = Math.max(20, hsl.s);

  // primary = 深色基准，确保亮度在 64-68 范围
  const primaryColor = hslToHex(baseH, baseS, Math.min(68, Math.max(64, hsl.l)));

  // primary-hover = H+26°, 极浅色 (L≈85)
  const primaryColorHover = hslToHex((baseH + 26) % 360, baseS, 85);

  // alter-color = darken(primary, 17)
  const alterColor = darken(primaryColor, 17);

  // alter-color-hover-on = darken(primaryHover, 15)
  const alterColorHoverOn = darken(primaryColorHover, 15);

  // opacity 变体 — 向黑色混合（深色系越深越暗）
  const primaryColorOpacity10 = darken(primaryColor, 3);
  const primaryColorOpacity20 = darken(primaryColor, 6);
  const primaryColorOpacity30 = darken(primaryColor, 9);

  // header-font = H+22°, 浅色文字 (L≈90)
  const headerFontColor = hslToHex((baseH + 22) % 360, baseS, 90);

  // 固定灰色系
  const auxiliaryGray = '#999999';
  const auxiliaryGrayDark = '#666666';

  // 背景色 — 深色系
  const bodyBgColor = '#F8F8F8';
  const portalHeaderBgExtendColor = alterColor;
  const portalHeaderComplexBgExtendColor = alterColor;
  const tlayoutHeaderBgExtendColor = portalHeaderBgExtendColor;

  // 登录背景 — 使用 alter 色（最深）
  const loginBgColor = alterColor;

  // panel 背景色
  const panelBgColor = '#FFFFFF';

  // sidebar-panel-bg = header-font-color（强制约束）
  const sidebarPanelBg = headerFontColor;

  // sidebar 相关
  const sidebarColor = '#333333';
  const sidebarIconColor = hslToHex((baseH + 22) % 360, baseS, 73);

  // 边框色 — 纯灰
  const borderColor = '#EEEEEE';
  const borderIconColor = '#EEEEEE';

  // 渐变色 — 从深到浅
  const gradientStart = primaryColor;
  const gradientMid = primaryColorHover;

  return {
    'primary-color': primaryColor,
    'primary-text-color': '#333333',
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
    'tlayout-header-bg-extend-color': tlayoutHeaderBgExtendColor,
    'portal-header-bg-extend-color': portalHeaderBgExtendColor,
    'portal-header-complex-bg-extend-color': portalHeaderComplexBgExtendColor,
    'login-bg-color': loginBgColor,
    'panel-bg-color': panelBgColor,
    'sidebar-panel-bg': sidebarPanelBg,
    'sidebar-color': sidebarColor,
    'sidebar-icon-color': sidebarIconColor,
    'border-color': borderColor,
    'border-icon-color': borderIconColor,
    'gradient-start': gradientStart,
    'gradient-mid': gradientMid,
  };
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
