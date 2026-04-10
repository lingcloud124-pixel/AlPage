import { HSLColor, RGBColor } from '../types/ColorScheme.js';

export function hexToRgb(hex: string): RGBColor | null {
  const cleaned = hex.startsWith('#') ? hex.substring(1) : hex;
  
  let r: number, g: number, b: number;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  } else {
    return null;
  }
  
  return { r, g, b };
}

export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.min(255, Math.max(0, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
}

export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.min(100, hsl.l + percent);
  
  return rgbToHex(hslToRgb(hsl));
}

export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, hsl.l - percent);
  
  return rgbToHex(hslToRgb(hsl));
}

export function complement(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + 180) % 360;
  
  return rgbToHex(hslToRgb(hsl));
}

export function analogous(hex: string, angle: number = 30): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + angle) % 360;
  
  return rgbToHex(hslToRgb(hsl));
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const getLuminance = (rgb: RGBColor) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function isValidHex(hex: string): boolean {
  const cleaned = hex.startsWith('#') ? hex.substring(1) : hex;
  return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleaned);
}

export function adjustBrightness(hex: string, adjustment: number): string {
  if (adjustment > 0) {
    return lighten(hex, adjustment);
  } else {
    return darken(hex, Math.abs(adjustment));
  }
}

export function adjustSaturation(hex: string, adjustment: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb);
  hsl.s = Math.min(100, Math.max(0, hsl.s + adjustment));
  
  return rgbToHex(hslToRgb(hsl));
}