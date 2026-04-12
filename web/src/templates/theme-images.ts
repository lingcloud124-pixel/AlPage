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

  return Object.fromEntries(
    getThemeImageVariables(templateId).map((variable) => [variable, `url('${imageUrl}')`]),
  );
}
