import { describe, it, expect } from 'vitest';
import { DesignGenerator } from '../../src/theme-automation/core/DesignGenerator.js';

describe('DesignGenerator', () => {
  it('throws when applying color variables fails', async () => {
    const generator = new DesignGenerator() as DesignGenerator & {
      initialize: () => Promise<void>;
      applyColorVariables: () => Promise<boolean>;
    };

    generator.initialize = async () => {};
    generator.applyColorVariables = async () => false;

    await expect(
      generator.generateDesign(
        {
          'primary-color': '#00AA00',
          'primary-color-hover': '#22BB22'
        } as any,
        'Demo'
      )
    ).rejects.toThrow('Failed to apply color variables');
  });

  it('throws when updating theme text fails', async () => {
    const generator = new DesignGenerator() as DesignGenerator & {
      initialize: () => Promise<void>;
      applyColorVariables: () => Promise<boolean>;
      updateThemeText: () => Promise<boolean>;
    };

    generator.initialize = async () => {};
    generator.applyColorVariables = async () => true;
    generator.updateThemeText = async () => false;

    await expect(
      generator.generateDesign(
        {
          'primary-color': '#00AA00',
          'primary-color-hover': '#22BB22'
        } as any,
        'Demo'
      )
    ).rejects.toThrow('Failed to update theme text');
  });
});
