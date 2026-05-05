import { describe, expect, test } from 'vitest';

import { parseThemeIntent } from '../../web/src/tools/theme-intent-parser';

describe('theme intent enterprise mapping', () => {
  test('recognizes enterprise culture semantics from the safety palette vocabulary', () => {
    const intent = parseThemeIntent('生生不息 共筑未来', 'light-ui');

    expect(intent.category).toBe('corporate');
    expect(intent.styleHints).toContain('corporate');
    expect(intent.colorHints.length).toBeGreaterThan(0);
  });

  test('recognizes finance platform semantics as corporate and technology-adjacent', () => {
    const intent = parseThemeIntent('金融资产管理平台', 'light-ui');

    expect(intent.category).toBe('corporate');
    expect(intent.colorHints).toContain('blue');
  });
});
