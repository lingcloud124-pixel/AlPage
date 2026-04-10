/**
 * Asset extraction types for Penpot design automation
 */

import { ColorScheme } from './ColorScheme.js';

/**
 * Size information for exported assets
 */
export interface SizeInfo {
  /** Width in pixels */
  width: number;
  /** Height in pixels */ 
  height: number;
  /** File format */
  format: 'png' | 'jpg' | 'webp';
}

/**
 * Configuration for image export
 */
export interface ImageExportConfig {
  /** Output format */
  format: 'png' | 'jpg' | 'webp';
  /** Image quality (1-100, only for JPEG) */
  quality?: number;
  /** Export scale factor (default: 2 for high quality) */
  scale?: number;
}

/**
 * Asset manifest structure for generated theme pack
 */
export interface AssetManifest {
  /** Login background image info */
  loginBackground?: {
    filename: string;
    path: string;
    size: SizeInfo;
  };
  /** Header images info */
  headers: {
    banner?: {
      filename: string;
      path: string;
      size: SizeInfo;
    };
    simple?: {
      filename: string;
      path: string;
      size: SizeInfo;
    };
    tabs?: {
      filename: string;
      path: string;
      size: SizeInfo;
    };
    sideheader?: {
      filename: string;
      path: string;
      size: SizeInfo;
    };
  };
  /** Color scheme used */
  colorScheme?: {
    primary: string;
    primaryHover?: string;
    secondary?: string;
    third?: string;
    primaryOpacity10?: string;
    sidebarBg?: string;
    linkText?: string;
  };
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
  /** List of exported image file paths */
  images: string[];
  /** Extracted color scheme */
  colors: ColorScheme;
  /** Asset manifest for documentation */
  manifest: AssetManifest;
  /** Any errors encountered during extraction */
  errors: string[];
}

/**
 * Design asset specifications for extraction
 */
export interface DesignAssetSpec {
  /** Node ID from Penpot design */
  nodeId: string;
  /** Target filename (without extension) */
  filename: string;
  /** Expected dimensions */
  expectedSize: { width: number; height: number };
  /** Target format */
  format: 'png' | 'jpg';
}