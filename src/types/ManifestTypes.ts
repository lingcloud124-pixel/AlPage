import { ColorConfig, ImageConfig } from './ConfigTypes.js';

export interface ThemeConfig {
  name: string;
  zip: string;
  enabled: boolean;
  scssCompile?: boolean;
}

export interface ManifestOptions {
  preserveOriginal?: boolean;
  generateHighRes?: boolean;
  verbose?: boolean;
}

export interface ManifestConfig {
  version: string;
  globalColors: ColorConfig;
  sourceImages: ImageConfig;
  themes: ThemeConfig[];
  outputDir: string;
  options?: ManifestOptions;
}

export interface ProcessResult {
  themeName: string;
  success: boolean;
  updatedFiles: string[];
  errors: string[];
  duration: number;
}

export interface Report {
  total: number;
  successful: number;
  failed: number;
  results: ProcessResult[];
}