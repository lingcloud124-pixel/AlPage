import { ColorConfig } from '../../types/ConfigTypes.js';
import type { DesktopAIColorScheme } from '../../types/DesktopAI.js';

export { DesktopAIColorScheme };

export interface ColorScheme extends ColorConfig {
  description?: string;
  keywords?: string[];
  contrastRatios?: {
    primaryOnWhite: number;
    primaryHoverOnWhite: number;
    linkTextOnWhite: number;
  };
  generatedAt?: Date;
  feedbackHistory?: ColorAdjustment[];
}

export interface ColorAdjustment {
  feedback: string;
  type: 'primary_change' | 'brightness_adjust' | 'add_secondary' | 'custom';
  targetProperty?: 'primary' | 'primaryHover' | 'secondary' | 'third' | 'sidebarBg';
  newValue?: string;
  adjustmentAmount?: number;
}

export interface KeywordCategory {
  category: 'festival' | 'style' | 'industry' | 'emotion' | 'season';
  hueRange: { min: number; max: number };
  saturationRange: { min: number; max: number };
  lightnessRange: { min: number; max: number };
  examples: string[];
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}
