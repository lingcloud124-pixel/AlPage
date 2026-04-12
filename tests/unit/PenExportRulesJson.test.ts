import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { PEN_EXPORT_RULES } from '../../src/config/themeRuleRegistry';

const projectRoot = process.cwd();

describe('pen export rules json', () => {
  test('contains light-ui and dark-ui login and header export nodes', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config/pen-export-rules.json'), 'utf8'),
    );

    expect(config['light-ui'].loginBackground.full.nodeId).toBe('LiN3g');
    expect(config['light-ui'].headers.default.outputFile).toBe('header_tlayout_frame_bg.png');

    expect(config['dark-ui'].loginBackground.full.nodeId).toBe('PAgAA');
    expect(config['dark-ui'].headers.menu.nodeId).toBe('KDpQp');
  });

  test('typescript registry reuses the JSON pen export rules as its source of truth', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'config/pen-export-rules.json'), 'utf8'),
    );

    expect(PEN_EXPORT_RULES).toStrictEqual(config);
  });
});
