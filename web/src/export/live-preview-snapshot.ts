import type { Project } from '../project-manager';

function readPreviewImageUrl(variableName: string): string | undefined {
  const panel = document.getElementById('previewPanel');
  if (!panel) return undefined;

  const inlineValue = panel.style.getPropertyValue(variableName).trim();
  const computedValue = getComputedStyle(panel).getPropertyValue(variableName).trim();
  const raw = inlineValue || computedValue;
  if (!raw) return undefined;

  const match = raw.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  return match?.[1];
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
    bgImageUrl: liveLoginBg || project.bgImageUrl,
    headerBgImageUrl: liveHeaderBg || project.headerBgImageUrl,
  };
}
