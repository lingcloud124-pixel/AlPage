import { describe, expect, test } from 'vitest';

import { getHeaderSelectOptions } from '../../web/src/theme/template-registry';

describe('web header select options', () => {
  test('derives header switcher options from the template registry in stable order', () => {
    const options = getHeaderSelectOptions();

    expect(options.map((item) => item.id)).toEqual([
      'header-default',
      'header-simple',
      'header-classic',
      'header-simple-multitab',
      'header-complex',
      'header-menu',
      'header-banner',
      'header-v16-default',
      'header-v16-search',
    ]);

    expect(options.find((item) => item.id === 'header-default')?.name).toBe('默认页眉');
    expect(options.find((item) => item.id === 'header-complex')?.name).toBe('经典页眉/多页签页眉');
  });
});
