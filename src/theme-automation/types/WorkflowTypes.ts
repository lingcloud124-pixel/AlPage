import { ColorScheme } from './ColorScheme.js';
import type { DesktopAIColorScheme } from '../../types/DesktopAI.js';
import { DesignAssets } from './DesignAssets.js';
import { ExtractionResult } from './AssetTypes.js';
import { ManifestConfig, Report as ThemeUpdateReport } from '../../types/ManifestTypes.js';

/**
 * User request for theme automation
 */
export interface ThemeRequest {
  /** User's description of the theme (e.g., "2026年清明节，绿色科技能源风格") */
  description: string;
  
  /** Year for theme pack naming */
  year?: number;
  
  /** Optional theme name override */
  name?: string;
  
  /** Theme mode (light or dark) */
  themeMode?: 'light' | 'dark';
  
  /** Additional options */
  options?: ThemeRequestOptions;
}

/**
 * Additional options for theme request
 */
export interface ThemeRequestOptions {
  /** Skip user confirmation steps */
  autoConfirm?: boolean;
  
  /** Custom output directory */
  outputDir?: string;
  
  /** Theme packs to enable/disable */
  enabledPacks?: string[];
  
  /** Preserve original files */
  preserveOriginal?: boolean;
  
  /** Generate high-resolution images */
  generateHighRes?: boolean;
  
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Workflow stage enum
 */
export enum WorkflowStage {
  /** Initial state, workflow not started */
  INIT = 'init',
  
  /** Colors generated, awaiting user feedback */
  COLORS_GENERATED = 'colors-generated',
  
  /** Design created, awaiting user confirmation */
  DESIGN_GENERATED = 'design-generated',
  
  /** Assets extracted, awaiting final confirmation */
  ASSETS_EXTRACTED = 'assets-extracted',
  
  /** Theme packs being generated */
  EXECUTING = 'executing',
  
  /** All done successfully */
  COMPLETED = 'completed',
  
  /** Error state */
  FAILED = 'failed'
}

/**
 * Internal workflow state tracking
 */
export interface WorkflowState {
  /** Current workflow stage */
  stage: WorkflowStage;
  
  /** Original user request */
  request: ThemeRequest;
  
  /** Generated color scheme */
  colorScheme?: ColorScheme | DesktopAIColorScheme;
  
  /** Generated design assets */
  designAssets?: DesignAssets;
  
  /** Extracted assets */
  extractedAssets?: ExtractionResult;
  
  /** Path to generated manifest.json */
  manifestPath?: string;
  
  /** Generated theme pack names */
  themePackNames?: ThemePackNames;

  /** Batch theme update report */
  themeUpdateReport?: ThemeUpdateReport;

  /** Resolved latest output directory */
  outputDir?: string;
  
  /** Errors encountered */
  errors: WorkflowError[];
  
  /** Timestamps for each stage */
  timestamps: StageTimestamps;
  
  /** User feedback history */
  feedbackHistory: string[];
}

/**
 * Error in workflow execution
 */
export interface WorkflowError {
  /** Stage where error occurred */
  stage: WorkflowStage;
  
  /** Error message */
  message: string;
  
  /** Additional context */
  context?: Record<string, any>;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Timestamps for workflow stages
 */
export interface StageTimestamps {
  init?: Date;
  colorsGenerated?: Date;
  designGenerated?: Date;
  assetsExtracted?: Date;
  executing?: Date;
  completed?: Date;
}

/**
 * Generated theme pack names following naming rules
 */
export interface ThemePackNames {
  /** MK theme pack name */
  mk: string;
  
  /** V12 theme pack name */
  v12: string;
  
  /** V13-V13.5 theme pack name */
  v13_v13_5: string;
  
  /** V14-V16 theme pack name */
  v14_v16: string;
  
  /** V17 theme pack name */
  v17: string;
  
  /** Login MK pack name */
  login_mk: string;
  
  /** Login V12 pack name */
  login_v12: string;
  
  /** Login V13 pack name */
  login_v13: string;
  
  /** Login V13.5 pack name */
  login_v13_5: string;
  
  /** Login V14 pack name */
  login_v14: string;
  
  /** Login V15 pack name */
  login_v15: string;
  
  /** Login V16 pack name */
  login_v16: string;
  
  /** Login V17 pack name */
  login_v17: string;
  
  /** KK pack name */
  kk: string;
}

/**
 * Final automation result
 */
export interface AutomationResult {
  /** Generated color scheme */
  colorScheme: ColorScheme | DesktopAIColorScheme;
  
  /** Generated design assets */
  designAssets: DesignAssets;
  
  /** Extracted assets */
  extractedAssets: ExtractionResult;
  
  /** Path to manifest.json */
  manifestPath: string;
  
  /** Generated theme pack file paths */
  themePacks: string[];
  
  /** Execution report */
  report: Report;
  
  /** Final workflow stage */
  stage: WorkflowStage;
}

/**
 * Execution summary report
 */
export interface Report {
  /** Total processing time in milliseconds */
  totalTime: number;
  
  /** Number of theme packs generated */
  totalPacks: number;
  
  /** Successfully generated packs */
  successfulPacks: number;
  
  /** Failed packs */
  failedPacks: number;
  
  /** List of generated pack details */
  packDetails: PackDetail[];
  
  /** Errors encountered */
  errors: string[];
  
  /** Warnings encountered */
  warnings: string[];
  
  /** Output file locations */
  outputLocations: OutputLocations;
  
  /** Report generation timestamp */
  generatedAt: Date;
}

/**
 * Detail for a single generated theme pack
 */
export interface PackDetail {
  /** Pack name */
  name: string;
  
  /** Output file path */
  path: string;
  
  /** Processing time in milliseconds */
  duration: number;
  
  /** Whether generation was successful */
  success: boolean;
  
  /** Files updated in the pack */
  updatedFiles: string[];
  
  /** Pack-specific errors */
  errors: string[];
}

/**
 * Output file locations
 */
export interface OutputLocations {
  /** Directory containing generated theme packs */
  outputDir: string;
  
  /** Directory containing extracted source images */
  sourceImagesDir: string;
  
  /** Path to manifest.json */
  manifestFile: string;
  
  /** Path to generated .pen design file */
  designFile: string;
  
  /** Path to report.json */
  reportFile: string;
}

/**
 * Manifest configuration for workflow
 */
export interface ManifestConfigExtended extends ManifestConfig {
  /** Workflow metadata */
  workflowMetadata?: {
    /** Theme description from user request */
    description?: string;
    
    /** Workflow execution ID */
    executionId?: string;
    
    /** Generation timestamp */
    generatedAt?: Date;
  };
}

/**
 * User feedback types
 */
export type UserFeedbackType = 
  | 'color_adjustment'    // Adjust color scheme
  | 'design_confirm'      // Confirm design and proceed
  | 'proceed'             // Proceed to next stage
  | 'cancel'              // Cancel workflow
  | 'restart';            // Restart from beginning

/**
 * Parsed user feedback
 */
export interface ParsedFeedback {
  /** Feedback type */
  type: UserFeedbackType;
  
  /** Original feedback text */
  text: string;
  
  /** Extracted color adjustment if applicable */
  colorAdjustment?: {
    property?: string;
    value?: string;
  };
}
