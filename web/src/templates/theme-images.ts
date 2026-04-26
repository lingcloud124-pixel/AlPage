const runtimeObjectUrls = new Map<string, string>();

function resolveRenderableImageUrl(imageUrl: string): string {
  if (!imageUrl.startsWith('data:image/')) return imageUrl;

  const cached = runtimeObjectUrls.get(imageUrl);
  if (cached) return cached;

  const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) return imageUrl;

  try {
    const mimeType = match[1];
    const base64 = match[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    runtimeObjectUrls.set(imageUrl, objectUrl);
    return objectUrl;
  } catch {
    return imageUrl;
  }
}

export function getThemeImageVariables(templateId: string): string[] {
  switch (templateId) {
    case 'login':
      return ['--theme-login-bg-image'];
    case 'desktop':
      return [
        '--theme-header-bg-image',
        '--theme-sidebar-bg-image',
        '--theme-desktop-feature-image',
        '--theme-desktop-accent-image',
      ];
    default:
      return [];
  }
}

export function buildThemeImageAssignments(templateId: string, imageUrl: string): Record<string, string> {
  if (!imageUrl) return {};
  const renderableUrl = resolveRenderableImageUrl(imageUrl);

  return Object.fromEntries(
    getThemeImageVariables(templateId).map((variable) => [variable, `url('${renderableUrl}')`]),
  );
}
