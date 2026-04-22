import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  DARK_UI_PALETTE_RULES,
  DARK_UI_SPECIAL_COLORS,
  HEADER_TYPE_RELATIONS,
  PEN_EXPORT_RULES,
} from '../../src/config/themeRuleRegistry';

describe('theme rule registry', () => {
  const projectRoot = process.cwd();

  test('keeps dark-ui login special colors separate from global theme variables', () => {
    expect(DARK_UI_SPECIAL_COLORS.login.primaryText).toBe('#f8c28c');
    expect(DARK_UI_SPECIAL_COLORS.login.buttonBackground).toBe('#f8c28c');
    expect(DARK_UI_SPECIAL_COLORS.login.buttonHoverBackground).toBe('#fdd0a3');
    expect(DARK_UI_PALETTE_RULES.fixed.sidebarColor).toBe('#333333');
    expect(DARK_UI_PALETTE_RULES.fixed.sidebarIconColor).toBe('#DCB496');
    expect(DARK_UI_PALETTE_RULES.relationships.sidebarPanelBg).toBe('header-font-color');
  });

  test('includes login background export rules for light-ui and dark-ui templates', () => {
    expect(PEN_EXPORT_RULES['light-ui'].loginBackground.full.nodeId).toBe('LiN3g');
    expect(PEN_EXPORT_RULES['light-ui'].loginBackground.mkCrop.outputFile).toBe('background.png');

    expect(PEN_EXPORT_RULES['dark-ui'].loginBackground.full.nodeId).toBe('PAgAA');
    expect(PEN_EXPORT_RULES['dark-ui'].loginBackground.mkCrop.width).toBe(1920);
  });

  test('captures key header export nodes and output files', () => {
    expect(PEN_EXPORT_RULES['light-ui'].headers.default.outputFile).toBe('header_tlayout_frame_bg.png');
    expect(PEN_EXPORT_RULES['light-ui'].headers.banner.nodeId).toBe('Nk9d0');

    expect(PEN_EXPORT_RULES['dark-ui'].headers.default.nodeId).toBe('y6LPs');
    expect(PEN_EXPORT_RULES['dark-ui'].headers.gradientLeft.outputFile).toBe('header-gradient-left.png');
  });

  test('describes light-ui header type relationships and marks missing pencil mappings explicitly', () => {
    expect(HEADER_TYPE_RELATIONS['light-ui'].default.cssClass).toBe('.lui_tlayout_header');
    expect(HEADER_TYPE_RELATIONS['light-ui'].menu.outputFile).toBe('header_menu_frame_bg.png');
    expect(HEADER_TYPE_RELATIONS['light-ui'].singleMenu.pencilAvailable).toBe(false);
  });

  test('header relations and dark-ui palette config are sourced from the shared json config', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config', 'theme-relations.json'), 'utf8'),
    );

    expect(DARK_UI_SPECIAL_COLORS).toStrictEqual(config.darkUiSpecialColors);
    expect(DARK_UI_PALETTE_RULES).toStrictEqual(config.darkUiPaletteRules);
    expect(HEADER_TYPE_RELATIONS).toStrictEqual(config.headerTypeRelations);
  });
});
