/**
 * Utilities for Penpot design automation operations
 */

import { DesignNode } from '../types/DesignAssets.js';

/**
 * Creates a gradient fill object for Penpot
 */
export function createGradientFill(colors: string[]): any {
  return {
   fillType: 'gradient',
    stops: colors.map((color, index) => ({
      color,
      opacity: 1,
      offset: index / (colors.length - 1) // Distribute evenly across gradient
    }))
  };
}

/**
 * Creates a solid color fill object for Penpot
 */
export function createColorFill(color: string): any {
  return {
   fillType: 'color',
    color,
    opacity: 1
  };
}

/**
 * Calculates position for child element within a parent container
 */
export function calculateLayoutPosition(
  parent: { width: number; height: number }, 
  child: { width: number; height: number },
  alignment: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center'
): { x: number; y: number } {
  switch (alignment) {
    case 'center':
      return {
        x: Math.round((parent.width - child.width) / 2),
        y: Math.round((parent.height - child.height) / 2)
      };
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-right':
      return { x: parent.width - child.width, y: 0 };
    case 'bottom-left':
      return { x: 0, y: parent.height - child.height };
    case 'bottom-right':
      return { x: parent.width - child.width, y: parent.height - child.height };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Updates design node properties with new values
 */
export function updateNodeProperties(node: DesignNode, updates: Partial<DesignNode>): DesignNode {
  return {
    ...node,
    ...updates
  };
}

/**
 * Creates a new Penpot frame node
 */
export function createFrameNode(
  id: string,
  name: string,
  width: number,
  height: number,
  props?: Partial<DesignNode>
): DesignNode {
  return {
    id,
    name,
    type: 'frame',
    width,
    height,
    layout: 'vertical',
    gap: 16,
    padding: 16,
    children: [],
    placeholder: true,
    ...props
  };
}

/**
 * Creates a rectangle node with specified dimensions and fill
 */
export function createRectangleNode(
  id: string,
  name: string,
  width: number,
  height: number,
  fill?: any,
  props?: Partial<DesignNode>
): DesignNode {
  return {
    id,
    name,
    type: 'rectangle',
    width,
    height,
    fill,
    ...props
  };
}

/**
 * Creates a text node with specified content and styling
 */
export function createTextNode(
  id: string,
  name: string,
  content: string,
  fontSize: number = 16,
  textColor: string = '#000000',
  props?: Partial<DesignNode>
): DesignNode {
  return {
    id,
    name,
    type: 'text',
    width: 200, // Approximate width - actual width may vary with content
    height: 24, // Approximate height for single-line文本
    content,
    fontSize,
    fill: { fillType: 'color', color: textColor, opacity: 1 },
    ...props
  };
}

/**
 * Converts ColorScheme to Penpot variable format
 */
export function convertColorSchemeToVariables(colorScheme: any, themeName: string): { [key: string]: any } {
  return {
    [`/${themeName}/primary`]: {
      type: 'color',
      value: colorScheme.primary
    },
    [`/${themeName}/primaryHover`]: {
      type: 'color',
      value: colorScheme.primaryHover
    },
    [`/${themeName}/secondary`]: {
      type: 'color',
      value: colorScheme.secondary
    },
    [`/${themeName}/third`]: {
      type: 'color',
      value: colorScheme.third
    },
    [`/${themeName}/primaryOpacity10`]: {
      type: 'color',
      value: colorScheme.primaryOpacity10
    },
    [`/${themeName}/primaryOpacity20`]: {
      type: 'color',
      value: colorScheme.primaryOpacity20
    },
    [`/${themeName}/primaryOpacity30`]: {
      type: 'color',
      value: colorScheme.primaryOpacity30
    },
    [`/${themeName}/sidebarBg`]: {
      type: 'color',
      value: colorScheme.sidebarBg
    },
    [`/${themeName}/linkText`]: {
      type: 'color',
      value: colorScheme.linkText
    },
    [`/${themeName}/linkTextHover`]: {
      type: 'color',
      value: colorScheme.linkTextHover
    }
  };
}

/**
 * Validates if a Penpot operation list is under the 25-operation limit
 */
export function validateOperationCount(operations: string[], maxCount: number = 25): boolean {
  return operations.length <= maxCount;
}

/**
 * Formats Penpot operations into a string suitable for batch_design
 */
export function formatBatchOperations(operations: string[]): string {
  if (!validateOperationCount(operations)) {
    throw new Error(`Too many operations: ${operations.length}. Maximum 25 operations allowed.`);
  }
  
  return operations.join('\n');
}