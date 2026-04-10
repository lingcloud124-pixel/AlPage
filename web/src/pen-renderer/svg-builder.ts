import { PenPathNode, PenEllipseNode } from './types';

export class SvgBuilder {
  buildPath(node: PenPathNode): string {
    const width = typeof node.width === 'number' ? node.width : 100;
    const height = typeof node.height === 'number' ? node.height : 100;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const opacity = node.opacity ?? 1;
    
    let fillAttr = 'none';
    const rawFill = (node as any).fill;
    if (typeof rawFill === 'string') {
      fillAttr = rawFill;
    } else if (rawFill && typeof rawFill === 'object' && rawFill.type === 'color') {
      fillAttr = rawFill.color;
    }
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;opacity:${opacity}"><path d="${node.geometry}" fill="${fillAttr}" /></svg>`;
  }

  buildEllipse(node: PenEllipseNode): string {
    const width = typeof node.width === 'number' ? node.width : 100;
    const height = typeof node.height === 'number' ? node.height : 100;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const opacity = node.opacity ?? 1;
    
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2;
    const ry = height / 2;
    
    let fillAttr = 'none';
    let strokeAttr = 'none';
    let strokeWidth = 0;
    
    const rawFill = (node as any).fill;
    if (typeof rawFill === 'string') {
      fillAttr = rawFill;
    } else if (rawFill && typeof rawFill === 'object' && rawFill.type === 'color') {
      fillAttr = rawFill.color;
    }
    
    if (node.stroke) {
      strokeAttr = node.stroke.fill;
      strokeWidth = typeof node.stroke.thickness === 'number' ? node.stroke.thickness : 1;
    }
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;opacity:${opacity}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" /></svg>`;
  }
}