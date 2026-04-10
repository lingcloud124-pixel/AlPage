import { describe, it, expect } from 'vitest';
import { getImageMappings } from '../../src/utils/imageMappings.js';
import { ThemeType } from '../../src/types/ThemeType.js';

describe('imageMappings', () => {
  it('does not map login background into non-login theme packs', () => {
    const mappings = getImageMappings(ThemeType.V12_SCSS);
    const targets = mappings.map(mapping => mapping.targetPath);
    expect(targets).not.toContain('login_bg/bg-login.jpg');
  });

  it('maps login background only for login packages', () => {
    const mappings = getImageMappings(ThemeType.LOGIN_PACKAGE);
    const targets = mappings.map(mapping => mapping.targetPath);
    expect(targets).toContain('login_bg/bg-login.jpg');
  });
});
