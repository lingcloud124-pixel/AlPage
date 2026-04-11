/**
 * WCAG 对比度校验工具
 * 基于 WCAG 2.1 标准，计算和验证颜色对比度
 */

export interface ContrastCheckResult {
  foreground: string;
  background: string;
  ratio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  aaaLarge: boolean;
}

export interface ColorSchemeValidation {
  checks: ContrastCheckResult[];
  passed: boolean;
  failures: string[];
}

function hexToLinear(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = hexToLinear(color1);
  const l2 = hexToLinear(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkContrast(fg: string, bg: string): ContrastCheckResult {
  const ratio = getContrastRatio(fg, bg);
  return {
    foreground: fg,
    background: bg,
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5,
  };
}

export function validateColorScheme(colors: Record<string, string>): ColorSchemeValidation {
  const checks: ContrastCheckResult[] = [];
  const failures: string[] = [];

  const pairs: Array<{ fg: string; bg: string; label: string; minRatio: number }> = [
    { fg: 'header-font-color', bg: 'primary-color', label: '页眉文字 on 主色', minRatio: 4.5 },
    { fg: 'header-font-color', bg: 'body-bg-color', label: '页眉文字 on 页面背景', minRatio: 4.5 },
    { fg: 'sidebar-color', bg: 'sidebar-panel-bg', label: '侧边栏文字 on 侧边栏背景', minRatio: 4.5 },
    { fg: 'primary-color', bg: 'body-bg-color', label: '主色 on 页面背景', minRatio: 3 },
  ];

  for (const pair of pairs) {
    const fg = colors[pair.fg];
    const bg = colors[pair.bg];
    if (!fg || !bg) continue;

    const result = checkContrast(fg, bg);
    checks.push(result);

    if (result.ratio < pair.minRatio) {
      failures.push(`${pair.label}: 对比度 ${result.ratio}:1 (需要 ≥${pair.minRatio}:1)`);
    }
  }

  return { checks, passed: failures.length === 0, failures };
}
