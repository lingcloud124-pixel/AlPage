import { describe, expect, it } from 'vitest';
import { AssetExtractor } from '../../src/theme-automation/core/AssetExtractor.js';

describe('AssetExtractor', () => {
  it('reports an error when expected assets are not exported', async () => {
    const extractor = new AssetExtractor() as AssetExtractor & {
      exportImages: () => Promise<string[]>;
      extractColors: () => Promise<{
        primary: string;
        primaryHover: string;
      }>;
    };

    extractor.exportImages = async () => [];
    extractor.extractColors = async () => ({
      primary: '#2C615C',
      primaryHover: '#3A7D78'
    });

    const result = await extractor.batchExtractAssets(
      {
        loginPageId: 'login',
        headerBannerId: 'banner',
        generatedNodes: [],
        themeName: 'Demo',
        generatedAt: new Date()
      },
      'tests/output/assets'
    );

    expect(result.errors).toContain('Expected 2 exported assets, received 0');
  });
});
