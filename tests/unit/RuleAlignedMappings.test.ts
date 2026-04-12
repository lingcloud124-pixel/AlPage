import { describe, expect, test } from 'vitest';

import { PEN_EXPORT_RULES } from '../../src/config/themeRuleRegistry';
import { getGradientNodes, getHeaderBgNode, getLoginBgNode } from '../../src/utils/penNodeMappings';
import { TemplateType } from '../../src/types/ThemeType';

describe('rule aligned pen mappings', () => {
  test('light-ui pen mappings reuse the registry objects directly', () => {
    expect(getLoginBgNode(TemplateType.LIGHT_UI)).toBe(PEN_EXPORT_RULES['light-ui'].loginBackground.full);
    expect(getGradientNodes(TemplateType.LIGHT_UI).left).toBe(PEN_EXPORT_RULES['light-ui'].headers.gradientLeft);
    expect(getGradientNodes(TemplateType.LIGHT_UI).right).toBe(PEN_EXPORT_RULES['light-ui'].headers.gradientRight);
    expect(getHeaderBgNode(TemplateType.LIGHT_UI, 60)).toBe(PEN_EXPORT_RULES['light-ui'].headers.default);
    expect(getHeaderBgNode(TemplateType.LIGHT_UI, 90)).toBe(PEN_EXPORT_RULES['light-ui'].headers.complex);
    expect(getHeaderBgNode(TemplateType.LIGHT_UI, 130)).toBe(PEN_EXPORT_RULES['light-ui'].headers.menu);
  });

  test('dark-ui pen mappings reuse the registry objects directly', () => {
    expect(getLoginBgNode(TemplateType.DARK_UI)).toBe(PEN_EXPORT_RULES['dark-ui'].loginBackground.full);
    expect(getGradientNodes(TemplateType.DARK_UI).left).toBe(PEN_EXPORT_RULES['dark-ui'].headers.gradientLeft);
    expect(getGradientNodes(TemplateType.DARK_UI).right).toBe(PEN_EXPORT_RULES['dark-ui'].headers.gradientRight);
    expect(getHeaderBgNode(TemplateType.DARK_UI, 60)).toBe(PEN_EXPORT_RULES['dark-ui'].headers.default);
    expect(getHeaderBgNode(TemplateType.DARK_UI, 90)).toBe(PEN_EXPORT_RULES['dark-ui'].headers.complex);
    expect(getHeaderBgNode(TemplateType.DARK_UI, 130)).toBe(PEN_EXPORT_RULES['dark-ui'].headers.menu);
  });
});
