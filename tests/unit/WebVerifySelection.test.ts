import { describe, expect, test } from 'vitest';

import { getVerifySelectionArgs } from '../../web/scripts/build';

describe('web verify selection args', () => {
  test('passes selected product keys to verify-build so partial exports validate correctly', () => {
    expect(getVerifySelectionArgs(['mk', 'ekp_v17'])).toEqual(['--products', 'mk,ekp_v17']);
    expect(getVerifySelectionArgs(undefined)).toEqual([]);
    expect(getVerifySelectionArgs([])).toEqual([]);
  });
});
