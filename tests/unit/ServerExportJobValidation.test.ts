import { describe, expect, test } from 'vitest';

import {
  normalizeAndValidateSelectedProducts,
} from '../../server/src/export-job-validation';

describe('server export job validation', () => {
  test('accepts supported export product ids and removes duplicates', () => {
    expect(normalizeAndValidateSelectedProducts(['mk', 'ekp_v17', 'mk'])).toEqual({
      products: ['mk', 'ekp_v17'],
    });
  });

  test('rejects unsupported export product ids', () => {
    expect(normalizeAndValidateSelectedProducts(['mk', 'evil-product'])).toEqual({
      error: 'selectedProducts 包含不支持的产品: evil-product',
    });
  });
});
