import { PenNode, PenFrameNode, PenGroupNode, PenTextNode, PenPathNode, PenEllipseNode, PenRefNode, PenDocument } from './types';
import { StyleMapper } from './style-mapper';
import { SvgBuilder } from './svg-builder';
import { ImageHandler } from './image-handler';
import { VariableResolver } from './variable-resolver';

export class PenRenderer {
  private styleMapper: StyleMapper;
  private svgBuilder: SvgBuilder;
  private imageHandler: ImageHandler;
  private document: PenDocument | null = null;

  constructor(
    private varResolver: VariableResolver,
    imageHandler?: ImageHandler
  ) {
    this.imageHandler = imageHandler || new ImageHandler();
    this.styleMapper = new StyleMapper(varResolver, this.imageHandler);
    this.svgBuilder = new SvgBuilder();
  }

  setDocument(doc: PenDocument): void {
    this.document = doc;
  }

  renderNode(node: PenNode): string {
    if (node.enabled === false || node.visible === false) {
      return '';
    }

    switch (node.type) {
      case 'frame':
        return this.renderFrame(node as PenFrameNode);
      case 'group':
        return this.renderGroup(node as PenGroupNode);
      case 'rectangle':
        return this.renderRectangle(node);
      case 'text':
        return this.renderText(node as PenTextNode);
      case 'path':
        return this.svgBuilder.buildPath(node as PenPathNode);
      case 'ellipse':
        return this.svgBuilder.buildEllipse(node as PenEllipseNode);
      case 'ref':
        return this.renderRef(node as PenRefNode);
      case 'image':
        return this.renderImage(node);
      default:
        return this.renderGeneric(node);
    }
  }

  renderTree(node: PenNode): string {
    const selfHtml = this.renderNode(node);
    const childrenHtml = this.renderChildren(node);
    if (childrenHtml && (node.type === 'frame' || node.type === 'group' || node.type === 'ref')) {
      return selfHtml.replace('</div>', childrenHtml + '</div>');
    }
    return selfHtml || childrenHtml;
  }

  renderNodeById(nodeId: string): string {
    if (!this.document) return '';
    const node = this.document.nodes.get(nodeId);
    if (!node) return '';
    const root = this.resetTopLevelPosition(node);
    return this.renderTree(root);
  }

  renderToElement(nodeId: string, targetEl: HTMLElement): void {
    targetEl.innerHTML = this.renderNodeById(nodeId);
  }

  private resetTopLevelPosition(node: PenNode): PenNode {
    return { ...node, x: 0, y: 0 };
  }

  private renderChildren(node: PenNode): string {
    const children = (node as any).children;
    if (!children || !Array.isArray(children)) return '';

    return children
      .filter((child: PenNode) => child.enabled !== false && child.visible !== false)
      .map((child: PenNode) => this.renderTree(child))
      .join('');
  }

  private renderFrame(node: PenFrameNode): string {
    const style = this.buildContainerStyle(node);
    const childrenHtml = this.renderChildren(node);
    return `<div data-id="${node.id}" style="${style}">${childrenHtml}</div>`;
  }

  private renderGroup(node: PenGroupNode): string {
    const style = this.buildContainerStyle(node);
    const childrenHtml = this.renderChildren(node);
    return `<div data-id="${node.id}" style="${style}">${childrenHtml}</div>`;
  }

  private renderRectangle(node: PenNode): string {
    const style = this.styleMapper.mapNode(node);
    return `<div data-id="${node.id}" style="${style}"></div>`;
  }

  private renderText(node: PenTextNode): string {
    const style = this.styleMapper.mapNode(node);
    const content = this.escapeHtml(node.content || '');
    return `<span data-id="${node.id}" style="${style}">${content}</span>`;
  }

  private renderRef(node: PenRefNode): string {
    if (!this.document) {
      const style = this.styleMapper.mapNode(node);
      const childrenHtml = this.renderChildren(node);
      return `<div data-id="${node.id}" data-ref="${node.ref}" style="${style}">${childrenHtml}</div>`;
    }

    const componentDef = this.document.components.get(node.ref) || this.document.nodes.get(node.ref);
    if (!componentDef) {
      const style = this.styleMapper.mapNode(node);
      const childrenHtml = this.renderChildren(node);
      return `<div data-id="${node.id}" data-ref="${node.ref}" style="${style}">${childrenHtml}</div>`;
    }

    const mergedNode = this.mergeRefWithComponent(node, componentDef);
    const style = this.buildContainerStyle(mergedNode);
    const childrenHtml = this.renderChildren(mergedNode);
    return `<div data-id="${node.id}" data-ref="${node.ref}" style="${style}">${childrenHtml}</div>`;
  }

  private renderImage(node: PenNode): string {
    const style = this.styleMapper.mapNode(node);
    return `<div data-id="${node.id}" style="${style}"></div>`;
  }

  private renderGeneric(node: PenNode): string {
    const style = this.styleMapper.mapNode(node);
    if ((node as any).children) {
      const childrenHtml = this.renderChildren(node);
      return `<div data-id="${node.id}" style="${style}">${childrenHtml}</div>`;
    }
    return `<div data-id="${node.id}" style="${style}"></div>`;
  }

  private buildContainerStyle(node: PenNode): string {
    const styles: string[] = [];
    const mapped = this.styleMapper.mapNode(node);
    if (mapped) {
      styles.push(mapped);
    }
    if (!mapped || !mapped.includes('position:')) {
      styles.push('position:relative;');
    }
    if (node.clip === true) styles.push('overflow:hidden;');
    return styles.join(' ');
  }

  private mergeRefWithComponent(refNode: PenRefNode, componentDef: PenNode): PenNode {
    const merged = { ...componentDef, ...refNode } as any;
    delete merged.ref;
    delete merged.descendants;

    if (refNode.descendants && (componentDef as any).children) {
      merged.children = this.applyDescendants(
        (componentDef as any).children,
        refNode.descendants
      );
    }

    return merged as PenNode;
  }

  private applyDescendants(
    children: PenNode[],
    descendants: Record<string, Partial<PenNode>>
  ): PenNode[] {
    return children.map(child => {
      const override = descendants[child.id];
      if (override) {
        return { ...child, ...override } as PenNode;
      }
      if ((child as any).children) {
        return {
          ...child,
          children: this.applyDescendants((child as any).children, descendants)
        } as PenNode;
      }
      return child;
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
