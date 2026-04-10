import { 
  PenNode, 
  PenFill, 
  PenColorFill, 
  PenGradientFill, 
  PenImageFill, 
  PenStroke, 
  PenSideThickness,
  PenEffect,
  PenTextNode
} from './types';
import { VariableResolver } from './variable-resolver';

import { ImageHandler } from './image-handler';

export class StyleMapper {
  private imageHandler: ImageHandler | null;

  constructor(
    private variableResolver: VariableResolver,
    imageHandler?: ImageHandler
  ) {
    this.imageHandler = imageHandler || null;
  }

  mapNode(node: PenNode): string {
    const styles: string[] = [];
    
    if (node.x !== undefined && node.y !== undefined) {
      styles.push(`position:absolute; left:${node.x}px; top:${node.y}px;`);
    }
    
    if (node.width !== undefined) {
      if (typeof node.width === 'number') {
        styles.push(`width:${node.width}px;`);
      } else if (node.width === 'fill_container') {
        styles.push('width:100%;');
      }
    }
    
    if (node.height !== undefined) {
      if (typeof node.height === 'number') {
        styles.push(`height:${node.height}px;`);
      } else if (node.height === 'fill_container') {
        styles.push('height:100%;');
      }
    }
    
    if (node.type !== 'text' && node.fill) {
      const fillStyle = this.mapFill(node.fill);
      if (fillStyle) {
        styles.push(fillStyle);
      }
    }
    
    if (node.stroke) {
      const strokeStyle = this.mapStroke(node.stroke);
      if (strokeStyle) {
        styles.push(strokeStyle);
      }
    }
    
    if (node.type === 'text') {
      const textStyle = this.mapText(node);
      if (textStyle) {
        styles.push(textStyle);
      }
    }
    
    if (node.opacity !== undefined && node.opacity !== 1) {
      styles.push(`opacity: ${node.opacity};`);
    }
    
    if (node.clip === true) {
      styles.push('overflow: hidden;');
    }
    
    if (node.cornerRadius !== undefined) {
      const borderRadius = this.mapCornerRadius(node.cornerRadius);
      if (borderRadius) {
        styles.push(borderRadius);
      }
    }
    
    if (node.rotation !== undefined && node.rotation !== 0) {
      styles.push(`transform: rotate(${node.rotation}deg);`);
    }
    
    if (node.effect?.type === 'shadow' && node.effect.enabled !== false) {
      const shadowStyle = this.mapShadow(node.effect);
      if (shadowStyle) {
        styles.push(shadowStyle);
      }
    }
    
    return styles.join(' ');
  }
  
  private resolveColor(color: string): string {
    if (color.startsWith('$')) {
      return this.variableResolver.resolve(color);
    }
    return color;
  }
  
  private parseHexColor(color: string): string {
    if (color.startsWith('#') && color.length === 9) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const a = parseInt(color.slice(7, 9), 16) / 255;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color;
  }
  
  private mapFill(fill: PenFill): string | null {
    if ((fill as any).enabled === false) {
      return null;
    }
    
    if (fill.type === 'color') {
      const resolvedColor = this.resolveColor((fill as PenColorFill).color);
      const parsedColor = this.parseHexColor(resolvedColor);
      return `background-color: ${parsedColor};`;
    }
    
    if (fill.type === 'gradient') {
      const gradient = fill as PenGradientFill;
      if (gradient.colors.length < 2) {
        return null;
      }
      
      const angle = (gradient.rotation + 90) % 360;
      const stops = gradient.colors.map(stop => {
        const resolvedColor = this.resolveColor(stop.color);
        const parsedColor = this.parseHexColor(resolvedColor);
        return `${parsedColor} ${stop.position}%`;
      }).join(', ');
      
      return `background: linear-gradient(${angle}deg, ${stops});`;
    }
    
    if (fill.type === 'image') {
      const imageFill = fill as PenImageFill;
      const imageUrl = this.imageHandler
        ? this.imageHandler.resolveImageUrl(imageFill.url)
        : imageFill.url;
      return `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`;
    }
    
    return null;
  }
  
  private mapStroke(stroke: PenStroke): string | null {
    if (!stroke.fill || stroke.thickness === undefined) return null;
    const resolvedColor = this.resolveColor(stroke.fill);
    const parsedColor = this.parseHexColor(resolvedColor);
    
    if (typeof stroke.thickness === 'number') {
      return `border: ${stroke.thickness}px solid ${parsedColor};`;
    } else {
      const sides = stroke.thickness as PenSideThickness;
      const sideStyles: string[] = [];
      
      if (sides.top !== undefined) {
        sideStyles.push(`border-top: ${sides.top}px solid ${parsedColor};`);
      }
      if (sides.right !== undefined) {
        sideStyles.push(`border-right: ${sides.right}px solid ${parsedColor};`);
      }
      if (sides.bottom !== undefined) {
        sideStyles.push(`border-bottom: ${sides.bottom}px solid ${parsedColor};`);
      }
      if (sides.left !== undefined) {
        sideStyles.push(`border-left: ${sides.left}px solid ${parsedColor};`);
      }
      
      return sideStyles.join(' ');
    }
  }
  
  private mapText(node: PenNode): string | null {
    const textNode = node as PenTextNode;
    const styles: string[] = [];
    
    if (typeof textNode.fill === 'string') {
      const resolvedColor = this.resolveColor(textNode.fill);
      const parsedColor = this.parseHexColor(resolvedColor);
      styles.push(`color: ${parsedColor};`);
    }
    
    if (textNode.fontFamily) {
      styles.push(`font-family: ${textNode.fontFamily};`);
    }
    
    if (textNode.fontSize) {
      styles.push(`font-size: ${textNode.fontSize}px;`);
    }
    
    if (textNode.fontWeight) {
      styles.push(`font-weight: ${textNode.fontWeight};`);
    }
    
    if (textNode.lineHeight !== undefined) {
      styles.push(`line-height: ${textNode.lineHeight};`);
    }
    
    if (textNode.letterSpacing !== undefined) {
      styles.push(`letter-spacing: ${textNode.letterSpacing}px;`);
    }
    
    if (textNode.textAlign) {
      styles.push(`text-align: ${textNode.textAlign};`);
    }
    
    if (textNode.textGrowth === 'fixed-width' && textNode.width !== undefined && typeof textNode.width === 'number') {
      styles.push(`width: ${textNode.width}px; white-space: nowrap; overflow: hidden;`);
    }
    
    return styles.length > 0 ? styles.join(' ') : null;
  }
  
  private mapCornerRadius(cornerRadius: number | number[]): string | null {
    if (typeof cornerRadius === 'number') {
      return `border-radius: ${cornerRadius}px;`;
    } else if (Array.isArray(cornerRadius)) {
      if (cornerRadius.length === 4) {
        const [a, b, c, d] = cornerRadius;
        return `border-radius: ${a}px ${b}px ${c}px ${d}px;`;
      } else if (cornerRadius.length > 0) {
        const allSame = cornerRadius.every(val => val === cornerRadius[0]);
        if (allSame) {
          return `border-radius: ${cornerRadius[0]}px;`;
        }
      }
    }
    return null;
  }
  
  private mapShadow(effect: PenEffect & { type: 'shadow' }): string | null {
    if ((effect as any).enabled === false) {
      return null;
    }
    
    if (!effect.offset || effect.blur === undefined || !effect.color) {
      return null;
    }
    
    const resolvedColor = this.resolveColor(effect.color);
    const parsedColor = this.parseHexColor(resolvedColor);
    return `box-shadow: ${effect.offset.x}px ${effect.offset.y}px ${effect.blur}px ${parsedColor};`;
  }
}