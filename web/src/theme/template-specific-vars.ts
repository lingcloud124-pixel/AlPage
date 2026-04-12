import themeRelations from '../../../config/theme-relations.json';

export function getTemplateSpecificThemeVars(templateType: 'light-ui' | 'dark-ui'): Record<string, string> {
  if (templateType !== 'dark-ui') {
    return {};
  }

  return {
    '--login-accent-color': themeRelations.darkUiSpecialColors.login.primaryText,
    '--login-accent-hover-color': themeRelations.darkUiSpecialColors.login.buttonHoverBackground,
  };
}
