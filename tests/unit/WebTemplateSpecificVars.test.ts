import { describe, expect, test } from 'vitest';

import { getTemplateSpecificThemeVars } from '../../web/src/theme/template-specific-vars';

describe('web template specific vars', () => {
  test('returns dark-ui login accent variables from shared theme relations config', () => {
    expect(getTemplateSpecificThemeVars('dark-ui')).toEqual({
      '--login-accent-color': '#f8c28c',
      '--login-accent-hover-color': '#fdd0a3',
    });
  });

  test('returns no extra vars for light-ui', () => {
    expect(getTemplateSpecificThemeVars('light-ui')).toEqual({});
  });
});
