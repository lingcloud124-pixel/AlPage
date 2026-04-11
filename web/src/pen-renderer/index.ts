import { PenParser } from './parser';
import { VariableResolver } from './variable-resolver';
import { PenRenderer } from './renderer';
import { ImageHandler } from './image-handler';
import { PenDocument } from './types';

let renderer: PenRenderer | null = null;
let varResolver: VariableResolver | null = null;
let imageHandler: ImageHandler | null = null;
let currentDoc: PenDocument | null = null;

export async function initPenRenderer(
  penJson: any,
  loginNodeId: string,
  mainNodeId: string,
  loginTargetId: string,
  mainTargetId: string
): Promise<void> {
  const parser = new PenParser();
  currentDoc = parser.parse(penJson);

  varResolver = new VariableResolver(currentDoc.variables);
  varResolver.injectToRoot();

  imageHandler = new ImageHandler();

  const imagePaths = extractAllImagePaths(currentDoc);
  const resolvedUrls = imagePaths.map(p => imageHandler!.resolveImageUrl(p));
  await imageHandler.preload(resolvedUrls);

  renderer = new PenRenderer(varResolver, imageHandler);
  renderer.setDocument(currentDoc);

  const loginTarget = document.getElementById(loginTargetId);
  const mainTarget = document.getElementById(mainTargetId);

  if (loginTarget) {
    renderer.renderToElement(loginNodeId, loginTarget);
  }
  if (mainTarget) {
    renderer.renderToElement(mainNodeId, mainTarget);
  }
}

export function updateThemeColors(colors: Record<string, string>): void {
  if (!varResolver) return;
  for (const [name, value] of Object.entries(colors)) {
    const varName = name.startsWith('--') ? name.substring(2) : name;
    varResolver.updateVariable(varName, value);
  }
}

export function getCurrentVariables(): Record<string, string> {
  if (!varResolver) return {};
  return varResolver.getAllResolved();
}

export function getDocument(): PenDocument | null {
  return currentDoc;
}

function extractAllImagePaths(doc: PenDocument): string[] {
  const paths = new Set<string>();
  if (!imageHandler) return [];

  const extract = (node: any) => {
    if (!node) return;
    if (node.fill && node.fill.type === 'image' && node.fill.enabled !== false && node.fill.url) {
      paths.add(node.fill.url);
    }
    if (node.children) {
      for (const child of node.children) {
        extract(child);
      }
    }
    if (node.descendants) {
      for (const desc of Object.values(node.descendants)) {
        extract(desc);
      }
    }
  };

  for (const node of doc.rootChildren) {
    extract(node);
  }

  return Array.from(paths);
}

export function updateBackgroundImage(nodeId: string, imageUrl: string): void {
  const elements = document.querySelectorAll(`[data-id="${nodeId}"]`);
  const resolvedUrl = imageHandler?.resolveImageUrl(imageUrl) || imageUrl;
  elements.forEach(el => {
    (el as HTMLElement).style.backgroundImage = `url('${resolvedUrl}')`;
    (el as HTMLElement).style.backgroundSize = 'cover';
    (el as HTMLElement).style.backgroundPosition = 'center';
  });
}

export { PenRenderer, VariableResolver, ImageHandler, PenParser };
