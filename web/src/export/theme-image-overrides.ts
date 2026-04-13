import { buildThemeImageAssignments } from '../templates/theme-images';

export function buildScreenshotThemeImageAssignments(themeImageUrl: string): Record<string, string> {
  if (!themeImageUrl) return {};

  return {
    ...buildThemeImageAssignments('login', themeImageUrl),
    ...buildThemeImageAssignments('desktop', themeImageUrl),
  };
}
