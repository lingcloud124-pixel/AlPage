import { ColorScheme, ColorAdjustment, KeywordCategory } from '../types/ColorScheme.js';
import type { DesktopAIColorScheme } from '../../types/DesktopAI.js';
import {
  lighten,
  complement,
  analogous,
  withAlpha,
  isValidHex,
  adjustBrightness,
  calculateContrastRatio,
  darken
} from '../utils/colorUtils.js';

const KEYWORD_COLOR_MAP: Map<string, KeywordCategory> = new Map([
  {
    category: 'festival',
    hueRange: { min: 90, max: 150 },
    saturationRange: { min: 40, max: 80 },
    lightnessRange: { min: 30, max: 50 },
    examples: ['清明', '绿色', '自然', '春天']
  },
  {
    category: 'festival',
    hueRange: { min: 0, max: 30 },
    saturationRange: { min: 70, max: 100 },
    lightnessRange: { min: 40, max: 60 },
    examples: ['春节', '红色', '喜庆', '新年']
  },
  {
    category: 'festival',
    hueRange: { min: 200, max: 240 },
    saturationRange: { min: 60, max: 90 },
    lightnessRange: { min: 30, max: 50 },
    examples: ['五一', '劳动', '工业']
  },
  {
    category: 'style',
    hueRange: { min: 200, max: 260 },
    saturationRange: { min: 50, max: 80 },
    lightnessRange: { min: 40, max: 60 },
    examples: ['科技', '现代', '数字', '智能']
  },
  {
    category: 'industry',
    hueRange: { min: 30, max: 60 },
    saturationRange: { min: 80, max: 100 },
    lightnessRange: { min: 50, max: 70 },
    examples: ['能源', '太阳能', '电力']
  },
  {
    category: 'industry',
    hueRange: { min: 90, max: 150 },
    saturationRange: { min: 30, max: 60 },
    lightnessRange: { min: 40, max: 60 },
    examples: ['环保', '绿色', '生态']
  },
  {
    category: 'emotion',
    hueRange: { min: 270, max: 330 },
    saturationRange: { min: 40, max: 70 },
    lightnessRange: { min: 50, max: 70 },
    examples: ['浪漫', '温柔', '优雅']
  },
  {
    category: 'season',
    hueRange: { min: 30, max: 60 },
    saturationRange: { min: 50, max: 80 },
    lightnessRange: { min: 60, max: 80 },
    examples: ['秋天', '金黄', '收获']
  },
  {
    category: 'season',
    hueRange: { min: 180, max: 220 },
    saturationRange: { min: 60, max: 80 },
    lightnessRange: { min: 60, max: 80 },
    examples: ['冬天', '寒冷', '冰雪']
  }
].flatMap(cat => cat.examples.map(keyword => [keyword, cat])) as [string, KeywordCategory][]);

export class ColorSchemeGenerator {

  deriveDesktopAIColorScheme(primary: string): DesktopAIColorScheme {
    if (!isValidHex(primary)) {
      throw new Error(`Invalid hex color: ${primary}`);
    }

    const primaryHover = lighten(primary, 10);
    const alter = darken(primary, 8);
    const alterHover = lighten(primary, 5);

    return {
      'primary-color': primary,
      'primary-color-hover': primaryHover,
      'light-primary-color': primary,
      'light-primary-color-hover': lighten(primary, 8),
      'alter-color': alter,
      'alter-color-hover-on': alterHover,

      'text-primary': '#333333',
      'text-secondary': '#666666',
      'text-weak': '#999999',
      'text-on-primary': '#ffffff',
      'light-text-primary': '#333333',

      'border-default': '#666666',
      'border-focus': primary,

      'header-font-color': '#333333',
      'header-font-color-hover': primary,
      'header-divider-color': '#CCCCCC',

      'portal-header-bg-extend-color': '#FBFCF2',
      'portal-header-pure-extend-color': primary,
      'portal-header-font-color': '#333333',
      'portal-header-font-color-hover': primary,

      'portal-header-complex-bg-extend-color': '#FBFCF2',
      'portal-header-complex-pure-extend-color': primary,
      'portal-header-complex-font-color': '#ffffff',
      'portal-header-complex-font-color-hover': '#ffffff',
      'search-complex-input-bg': 'transparent',
      'search-complex-input-font': primary,
      'search-complex-input-icon-bg': 'transparent',
      'personal-info-font-color': '#333333',

      'portal-header-zone-bg-extend-color': '#FBFCF2',
      'portal-header-zone-font-color': '#333333',
      'portal-header-zone-font-color-hover': primary,

      'portal-header-simple-bg-extend-color': '#FBFCF2',
      'portal-header-simple-pure-extend-color': primary,
      'portal-header-simple-font-color-top': '#ffffff',
      'portal-header-simple-font-color-hover': primary,

      'tlayout-header-bg-extend-color': '#FBFCF2',
      'tlayout-header-font-color': '#333333',
      'tlayout-header-font-color-hover': primary,

      'single-header-bg-extend-color': '#FBFCF2',
      'single-header-font-color': '#333333',
      'single-header-font-color-hover': primary,

      'search-input-border-color': primary,
      'search-placehold-font-color': primary,
      'search-font-color': '#333333',

      'sidebar-color': primary,
      'sidebar-panel-bg': '#FFFFFF',
      'sidebar-accordionpanel-header-bg': '#F5F5F5',
      'sidebar-accordionpanel-header-bgon': primary,
      'sidebar-accordionpanel-font': '#333333',
      'sidebar-icon-color': '#666666',
      'sidebar-icon-color-hover': primary,

      'login-bg-color': '#FDFFF6',
      'login-iframe-bg': 'rgba(253,255,246,0.85)',
      'input-placeholder': '#666666',
      'input-placeholder-focus': '#333333',
      'input-text': '#333333',
      'input-border': '#666666',
      'input-border-focus': primary,
      'button-bg': primary,
      'button-bg-hover': primaryHover,
      'button-text': '#ffffff',
      'title-text': '#333333',
      'tab-selected': primary,
      'tab-unselected': '#333333',
      'link-text': '#333333',
      'link-text-hover': primaryHover,
      'logo-color': primary,

      'auxiliary-gray': '#999999',
      'auxiliary-gray-dark': '#666666',

      'body-bg-color': '#F8F8F8',

      'hover-bg-color': lighten(primary, 90),
      'primary-color-opacity-10': withAlpha(primary, 0.1),
      'primary-color-opacity-20': withAlpha(primary, 0.2),
      'primary-color-opacity-30': withAlpha(primary, 0.3),
    };
  }

  deriveColorScheme(primary: string): ColorScheme {
    if (!isValidHex(primary)) {
      throw new Error(`Invalid hex color: ${primary}`);
    }

    const primaryHover = lighten(primary, 10);
    const secondary = complement(primary);
    const third = analogous(primary, 30);
    const primaryOpacity10 = withAlpha(primary, 0.1);
    const primaryOpacity20 = withAlpha(primary, 0.2);
    const primaryOpacity30 = withAlpha(primary, 0.3);
    const sidebarBg = lighten(primary, 90);
    const linkText = primary;
    const linkTextHover = primaryHover;

    const contrastRatios = {
      primaryOnWhite: calculateContrastRatio(primary, '#FFFFFF'),
      primaryHoverOnWhite: calculateContrastRatio(primaryHover, '#FFFFFF'),
      linkTextOnWhite: calculateContrastRatio(linkText, '#FFFFFF')
    };

    return {
      primary,
      primaryHover,
      secondary,
      third,
      primaryOpacity10,
      primaryOpacity20,
      primaryOpacity30,
      sidebarBg,
      linkText,
      linkTextHover,
      contrastRatios,
      generatedAt: new Date()
    };
  }

  async generateFromKeywords(description: string): Promise<ColorScheme> {
    const keywords = this.extractKeywords(description);
    const primaryColor = this.derivePrimaryFromKeywords(keywords);
    
    const scheme = this.deriveColorScheme(primaryColor);
    scheme.description = description;
    scheme.keywords = keywords;
    
    return scheme;
  }

  async generateDesktopAIColorScheme(
    description: string,
    themeMode: 'light' | 'dark' = 'light'
  ): Promise<DesktopAIColorScheme> {
    const keywords = this.extractKeywords(description);
    const primaryColor = this.derivePrimaryFromKeywords(keywords);
    
    if (themeMode === 'dark') {
      return this.deriveDarkDesktopAIColorScheme(primaryColor);
    }
    
    return this.deriveDesktopAIColorScheme(primaryColor);
  }

  private deriveDarkDesktopAIColorScheme(primary: string): DesktopAIColorScheme {
    if (!isValidHex(primary)) {
      throw new Error(`Invalid hex color: ${primary}`);
    }

    const primaryHover = darken(primary, 10);
    const primaryLight = lighten(primary, 20);
    const alter = lighten(primary, 10);
    const alterHover = lighten(primary, 5);

    const textOnPrimary = '#ffffff';
    const textPrimary = '#E0E0E0';
    const textSecondary = '#999999';
    const textWeak = '#666666';

    return {
      'primary-color': primary,
      'primary-color-hover': primaryHover,
      'light-primary-color': primaryLight,
      'light-primary-color-hover': lighten(primaryLight, 8),
      'alter-color': alter,
      'alter-color-hover-on': alterHover,

      'text-primary': textPrimary,
      'text-secondary': textSecondary,
      'text-weak': textWeak,
      'text-on-primary': textOnPrimary,
      'light-text-primary': textPrimary,

      'border-default': '#444444',
      'border-focus': primary,

      'header-font-color': textPrimary,
      'header-font-color-hover': primaryLight,
      'header-divider-color': '#333333',

      'portal-header-bg-extend-color': '#1A1A1A',
      'portal-header-pure-extend-color': primary,
      'portal-header-font-color': textPrimary,
      'portal-header-font-color-hover': primaryLight,

      'portal-header-complex-bg-extend-color': '#1A1A1A',
      'portal-header-complex-pure-extend-color': primary,
      'portal-header-complex-font-color': '#ffffff',
      'portal-header-complex-font-color-hover': primaryLight,
      'search-complex-input-bg': 'transparent',
      'search-complex-input-font': primaryLight,
      'search-complex-input-icon-bg': 'transparent',
      'personal-info-font-color': textPrimary,

      'portal-header-zone-bg-extend-color': '#1A1A1A',
      'portal-header-zone-font-color': textPrimary,
      'portal-header-zone-font-color-hover': primaryLight,

      'portal-header-simple-bg-extend-color': '#1A1A1A',
      'portal-header-simple-pure-extend-color': primary,
      'portal-header-simple-font-color-top': '#ffffff',
      'portal-header-simple-font-color-hover': primaryLight,

      'tlayout-header-bg-extend-color': '#1A1A1A',
      'tlayout-header-font-color': textPrimary,
      'tlayout-header-font-color-hover': primaryLight,

      'single-header-bg-extend-color': '#1A1A1A',
      'single-header-font-color': textPrimary,
      'single-header-font-color-hover': primaryLight,

      'search-input-border-color': primaryLight,
      'search-placehold-font-color': primaryLight,
      'search-font-color': textPrimary,

      'sidebar-color': primaryLight,
      'sidebar-panel-bg': '#1E1E1E',
      'sidebar-accordionpanel-header-bg': '#252525',
      'sidebar-accordionpanel-header-bgon': primary,
      'sidebar-accordionpanel-font': textPrimary,
      'sidebar-icon-color': textSecondary,
      'sidebar-icon-color-hover': primaryLight,

      'login-bg-color': '#121212',
      'login-iframe-bg': 'rgba(30,30,30,0.95)',
      'input-placeholder': textSecondary,
      'input-placeholder-focus': textPrimary,
      'input-text': textPrimary,
      'input-border': '#444444',
      'input-border-focus': primary,
      'button-bg': primary,
      'button-bg-hover': primaryHover,
      'button-text': textOnPrimary,
      'title-text': textPrimary,
      'tab-selected': primaryLight,
      'tab-unselected': textSecondary,
      'link-text': textPrimary,
      'link-text-hover': primaryLight,
      'logo-color': primaryLight,

      'auxiliary-gray': '#666666',
      'auxiliary-gray-dark': '#444444',

      'body-bg-color': '#121212',

      'hover-bg-color': darken(primary, 80),
      'primary-color-opacity-10': 'rgba(0,0,0,0.1)',
      'primary-color-opacity-20': 'rgba(0,0,0,0.2)',
      'primary-color-opacity-30': 'rgba(0,0,0,0.3)',
    };
  }

  refineScheme(current: ColorScheme, feedback: string): ColorScheme {
    const adjustment = this.parseFeedback(feedback);
    
    if (!adjustment) {
      return current;
    }

    let newPrimary = current.primary;
    
    switch (adjustment.type) {
      case 'primary_change':
        if (adjustment.newValue && isValidHex(adjustment.newValue)) {
          newPrimary = adjustment.newValue;
        }
        break;
      
      case 'brightness_adjust':
        const brightnessAdjust = adjustment.adjustmentAmount || 10;
        newPrimary = adjustBrightness(current.primary, brightnessAdjust);
        break;
      
      case 'add_secondary':
        const refined = { ...current };
        if (adjustment.newValue && isValidHex(adjustment.newValue)) {
          if (adjustment.targetProperty === 'secondary') {
            refined.secondary = adjustment.newValue;
          } else if (adjustment.targetProperty === 'third') {
            refined.third = adjustment.newValue;
          }
        }
        refined.feedbackHistory = [
          ...(current.feedbackHistory || []),
          adjustment
        ];
        return refined;
      
      case 'custom':
        if (adjustment.targetProperty && adjustment.newValue) {
          const refined = { ...current };
          (refined as any)[adjustment.targetProperty] = adjustment.newValue;
          refined.feedbackHistory = [
            ...(current.feedbackHistory || []),
            adjustment
          ];
          return refined;
        }
        break;
    }

    const newScheme = this.deriveColorScheme(newPrimary);
    newScheme.description = current.description;
    newScheme.keywords = current.keywords;
    newScheme.feedbackHistory = [
      ...(current.feedbackHistory || []),
      adjustment
    ];

    return newScheme;
  }

  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    
    for (const [keyword] of KEYWORD_COLOR_MAP) {
      if (description.includes(keyword)) {
        keywords.push(keyword);
      }
    }
    
    return keywords.length > 0 ? keywords : ['default'];
  }

  private derivePrimaryFromKeywords(keywords: string[]): string {
    if (keywords.length === 0) {
      return '#2C615C';
    }

    const matchedCategories: KeywordCategory[] = [];
    
    for (const keyword of keywords) {
      const category = KEYWORD_COLOR_MAP.get(keyword);
      if (category) {
        matchedCategories.push(category);
      }
    }

    if (matchedCategories.length === 0) {
      return '#2C615C';
    }

    const avgHue = this.averageRange(matchedCategories.map(c => c.hueRange));
    const avgSaturation = this.averageRange(matchedCategories.map(c => c.saturationRange));
    const avgLightness = this.averageRange(matchedCategories.map(c => c.lightnessRange));

    const h = Math.round(avgHue);
    const s = Math.round(avgSaturation);
    const l = Math.round(avgLightness);

    return this.hslToHex(h, s, l);
  }

  private averageRange(ranges: { min: number; max: number }[]): number {
    if (ranges.length === 0) return 0;
    
    const avgMin = ranges.reduce((sum, r) => sum + r.min, 0) / ranges.length;
    const avgMax = ranges.reduce((sum, r) => sum + r.max, 0) / ranges.length;
    
    return (avgMin + avgMax) / 2;
  }

  private hslToHex(h: number, s: number, l: number): string {
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = lDecimal;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = lDecimal < 0.5 
        ? lDecimal * (1 + sDecimal) 
        : lDecimal + sDecimal - lDecimal * sDecimal;
      const p = 2 * lDecimal - q;

      r = hue2rgb(p, q, hDecimal + 1/3);
      g = hue2rgb(p, q, hDecimal);
      b = hue2rgb(p, q, hDecimal - 1/3);
    }

    const toHex = (n: number) => {
      const hex = Math.round(Math.min(255, Math.max(0, n * 255))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  private parseFeedback(feedback: string): ColorAdjustment | null {
    const hexMatch = feedback.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/);
    
    const lowerFeedback = feedback.toLowerCase();
    
    if (hexMatch && (lowerFeedback.includes('主色') || lowerFeedback.includes('primary'))) {
      return {
        feedback,
        type: 'primary_change',
        newValue: '#' + hexMatch[1]
      };
    }
    
    if (lowerFeedback.includes('太深') || lowerFeedback.includes('dark')) {
      return {
        feedback,
        type: 'brightness_adjust',
        adjustmentAmount: 15
      };
    }
    
    if (lowerFeedback.includes('太亮') || lowerFeedback.includes('bright')) {
      return {
        feedback,
        type: 'brightness_adjust',
        adjustmentAmount: -15
      };
    }
    
    if (lowerFeedback.includes('辅助色') || lowerFeedback.includes('secondary')) {
      return {
        feedback,
        type: 'add_secondary',
        targetProperty: 'secondary',
        newValue: hexMatch ? '#' + hexMatch[1] : undefined
      };
    }
    
    if (lowerFeedback.includes('第三色') || lowerFeedback.includes('third')) {
      return {
        feedback,
        type: 'add_secondary',
        targetProperty: 'third',
        newValue: hexMatch ? '#' + hexMatch[1] : undefined
      };
    }
    
    if (hexMatch) {
      return {
        feedback,
        type: 'custom',
        targetProperty: 'primary',
        newValue: '#' + hexMatch[1]
      };
    }
    
    return null;
  }
}
