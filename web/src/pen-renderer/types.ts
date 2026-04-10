/** .pen file node types — based on actual .pen structure analysis */

export type PenNodeType =
  | 'frame' | 'group' | 'rectangle' | 'text' | 'path'
  | 'ellipse' | 'line' | 'polygon' | 'image' | 'ref'
  | 'icon_font' | 'connection' | 'note';

export interface PenColorFill {
  type: 'color';
  color: string;
  enabled?: boolean;
}

export interface PenGradientStop {
  color: string;
  position: number;
}

export interface PenGradientFill {
  type: 'gradient';
  enabled?: boolean;
  gradientType: 'linear';
  rotation: number;
  colors: PenGradientStop[];
  size?: { width: number; height: number };
}

export interface PenImageFill {
  type: 'image';
  enabled?: boolean;
  url: string;
  mode?: string;
}

export type PenFill = PenColorFill | PenGradientFill | PenImageFill;

export interface PenSideThickness {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface PenStroke {
  align?: 'center' | 'inside' | 'outside';
  fill: string;
  thickness: number | PenSideThickness;
}

export interface PenShadowEffect {
  type: 'shadow';
  shadowType: 'outer' | 'inner';
  color: string;
  blur: number;
  offset: { x: number; y: number };
  enabled?: boolean;
}

export interface PenBlurEffect {
  type: 'blur';
  radius: number;
  enabled?: boolean;
}

export type PenEffect = PenShadowEffect | PenBlurEffect;

export interface PenTextProps {
  content: string;
  fill: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  textGrowth?: 'fixed-width' | 'auto';
}

export type PenLayout = 'none' | 'horizontal' | 'vertical';

interface PenNodeBase {
  id: string;
  name?: string;
  type: PenNodeType;
  x?: number;
  y?: number;
  width?: number | 'fill_container';
  height?: number | 'fill_container';
  opacity?: number;
  clip?: boolean;
  visible?: boolean;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  stroke?: PenStroke;
  cornerRadius?: number | number[];
  effect?: PenEffect;
  enabled?: boolean;
}

export interface PenBaseNode extends PenNodeBase {
  fill?: PenFill;
}

export interface PenFrameNode extends PenBaseNode {
  type: 'frame';
  children?: PenNode[];
  layout?: PenLayout;
  gap?: number;
  padding?: number;
  alignItems?: string;
}

export interface PenGroupNode extends PenBaseNode {
  type: 'group';
  children?: PenNode[];
}

export interface PenRectangleNode extends PenBaseNode {
  type: 'rectangle';
}

export interface PenPathNode extends PenBaseNode {
  type: 'path';
  geometry: string;
}

export interface PenEllipseNode extends PenBaseNode {
  type: 'ellipse';
}

export interface PenTextNode extends PenNodeBase, PenTextProps {
  type: 'text';
}

export interface PenRefNode extends PenBaseNode {
  type: 'ref';
  ref: string;
  children?: PenNode[];
  descendants?: Record<string, Partial<PenNode>>;
}

export interface PenImageNode extends PenBaseNode {
  type: 'image';
}

export type PenNode =
  | PenFrameNode | PenGroupNode | PenRectangleNode
  | PenTextNode | PenPathNode | PenEllipseNode
  | PenRefNode | PenImageNode;

export interface PenVariable {
  type: 'color' | 'number' | 'string';
  value: string;
}

export interface PenDocument {
  variables: Record<string, PenVariable>;
  nodes: Map<string, PenNode>;
  components: Map<string, PenNode>;
  rootChildren: PenNode[];
  raw: unknown;
}