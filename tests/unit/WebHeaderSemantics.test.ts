import { describe, expect, test } from 'vitest';

import { getWebHeaderSemantics } from '../../web/src/theme/header-semantics';

describe('web header semantics', () => {
  test('maps web header ids to shared relation labels', () => {
    const semantics = getWebHeaderSemantics();

    expect(semantics['header-default'].name).toBe('默认页眉');
    expect(semantics['header-complex'].name).toBe('经典页眉/多页签页眉');
    expect(semantics['header-menu'].name).toBe('菜单页眉');
    expect(semantics['header-v16-default'].name).toBe('V16新默认页眉');
    expect(semantics['header-simple'].name).toBe('简洁页眉');
    expect(semantics['header-simple-multitab'].name).toBe('简洁多标签页眉');
  });
});
