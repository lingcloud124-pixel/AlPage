import type { Project } from '../project-manager';
import { loadProjectVisualContext } from '../tools/project-visual-context-store';

function readPreviewImageUrl(variableName: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const panel = document.getElementById('previewPanel');
  if (!panel) return undefined;

  const inlineValue = panel.style.getPropertyValue(variableName).trim();
  const computedValue = getComputedStyle(panel).getPropertyValue(variableName).trim();
  const raw = inlineValue || computedValue;
  if (!raw) return undefined;

  const match = raw.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  return match?.[1];
}

function isRuntimeBlobUrl(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith('blob:');
}

function getOriginalImageUrl(project: Project, fallbackUrl: string | undefined): string | undefined {
  const runtimeVisualContextImage = project.id
    ? loadProjectVisualContext(project.id).imageInput?.dataUrl?.trim()
    : '';
  if (runtimeVisualContextImage) {
    return runtimeVisualContextImage;
  }
  const visualContextImage = project.visualContext?.imageInput?.dataUrl?.trim();
  if (visualContextImage) {
    return visualContextImage;
  }
  if (fallbackUrl?.trim()) {
    return fallbackUrl;
  }
  return undefined;
}

function resolveExportImageUrl(project: Project, previewUrl: string | undefined, fallbackUrl: string | undefined): string | undefined {
  if (!previewUrl) {
    return getOriginalImageUrl(project, fallbackUrl);
  }
  if (isRuntimeBlobUrl(previewUrl)) {
    return getOriginalImageUrl(project, fallbackUrl);
  }
  return previewUrl;
}

function normalizeCssVariables(colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([name, value]) => [name.startsWith('--') ? name.slice(2) : name, value]),
  );
}

export function buildLivePreviewProjectSnapshot(
  project: Project,
  cssVariables: Record<string, string>,
): Project {
  const liveLoginBg = readPreviewImageUrl('--theme-login-bg-image');
  const liveHeaderBg = readPreviewImageUrl('--theme-header-bg-image');

  return {
    ...project,
    colors: normalizeCssVariables({ ...project.colors, ...cssVariables }),
    bgImageUrl: resolveExportImageUrl(project, liveLoginBg, project.bgImageUrl),
    headerBgImageUrl: resolveExportImageUrl(project, liveHeaderBg, project.headerBgImageUrl),
    visualContext: project.visualContext,
  };
}
