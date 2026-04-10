/**
 * Design asset representations for Penpot automation
 */

/**
 * Penpot node structure
 */
export interface DesignNode {
  id: string;
  name?: string;
  type: 'frame' | 'group' | 'rectangle' | 'ellipse' | 'line' | 'polygon' | 'path' | 'text' | 'connection' | 'note' | 'icon_font' | 'image' | 'ref';
  x?: number;
  y?: number;
  width: number;
  height: number;
  fill?: any;
  stroke?: any;
  strokeWidth?: number;
  cornerRadius?: number;
  layout?: 'horizontal' | 'vertical';
  gap?: number;
  padding?: number;
  children?: DesignNode[];
  [key: string]: any;
}

/**
 * Structure for design updates
 */
export interface DesignUpdate {
  nodeId: string;
  properties: Partial<DesignNode>;
}

/**
 * Generated design assets and metadata
 */
export interface DesignAssets {
  /** Login page frame ID */
  loginPageId: string;
  
  /** Generated header IDs */
  headerBannerId?: string;
  headerSimpleId?: string;
  headerTabsId?: string;
  headerSideHeaderId?: string;
  
  /** Generated node metadata */
  generatedNodes: Array<{
    id: string;
    name: string;
    type: string;
    parentId?: string;
    createdTime: Date;
  }>;
  
  /** Theme association */
  themeName: string;
  
  /** Generation timestamp */
  generatedAt: Date;

  /** Path to the generated .pen file for user confirmation */
  penFilePath?: string;
}

/**
 * Configuration for Penpot design generation
 */
export interface DesignConfig {
  themeName: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  layout?: 'horizontal' | 'vertical';
  placeholder?: boolean;
}