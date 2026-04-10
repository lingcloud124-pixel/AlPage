import { PenDocument, PenNode, PenVariable, PenBaseNode, PenTextNode } from './types';

export class PenParser {
  parse(penJson: any): PenDocument {
    const variables: Record<string, PenVariable> = penJson.variables || {};
    const nodes = new Map<string, PenNode>();
    const components = new Map<string, PenNode>();
    let rootChildren: PenNode[] = [];

    if (penJson.pages && Array.isArray(penJson.pages)) {
      for (const page of penJson.pages) {
        if (page.children && Array.isArray(page.children)) {
          this.processNodes(page.children, nodes, components);
          if (rootChildren.length === 0) {
            rootChildren = [...page.children] as PenNode[];
          }
        }
      }
    } else if (penJson.children && Array.isArray(penJson.children)) {
      this.processNodes(penJson.children, nodes, components);
      rootChildren = [...penJson.children] as PenNode[];
    }

    return {
      variables,
      nodes,
      components,
      rootChildren,
      raw: penJson
    };
  }

  private processNodes(nodeList: any[], nodes: Map<string, PenNode>, components: Map<string, PenNode>): void {
    for (const node of nodeList) {
      if (node && typeof node === 'object' && node.id) {
        const processedNode = this.processNode(node);
        nodes.set(node.id, processedNode);
        
        if (node.reusable === true) {
          components.set(node.id, processedNode);
        }
        
        if (node.children && Array.isArray(node.children)) {
          this.processNodes(node.children, nodes, components);
        }
      }
    }
  }

  private processNode(node: any): PenNode {
    switch (node.type) {
      case 'frame':
        return {
          id: node.id,
          type: 'frame',
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled,
          children: node.children,
          layout: node.layout,
          gap: node.gap,
          padding: node.padding,
          alignItems: node.alignItems
        };
      case 'group':
        return {
          id: node.id,
          type: 'group',
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled,
          children: node.children
        };
      case 'text':
        return {
          id: node.id,
          type: 'text',
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled,
          content: node.content,
          fontFamily: node.fontFamily,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          lineHeight: node.lineHeight,
          letterSpacing: node.letterSpacing,
          textAlign: node.textAlign,
          textGrowth: node.textGrowth
        };
      case 'path':
        return {
          id: node.id,
          type: 'path',
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled,
          geometry: node.geometry
        };
      case 'ref':
        return {
          id: node.id,
          type: 'ref',
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled,
          ref: node.ref,
          children: node.children,
          descendants: node.descendants
        };
      default:
        return {
          id: node.id,
          type: node.type,
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          opacity: node.opacity,
          clip: node.clip,
          visible: node.visible,
          rotation: node.rotation,
          flipX: node.flipX,
          flipY: node.flipY,
          fill: node.fill,
          stroke: node.stroke,
          cornerRadius: node.cornerRadius,
          effect: node.effect,
          enabled: node.enabled
        };
    }
  }

  findNode(doc: PenDocument, nodeId: string): PenNode | undefined {
    return doc.nodes.get(nodeId);
  }
}