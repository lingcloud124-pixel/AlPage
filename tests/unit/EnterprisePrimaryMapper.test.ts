import { describe, expect, test } from 'vitest';

import { resolveEnterprisePrimaryFromText } from '../../web/src/theme/enterprise-primary-mapper';
import { pickBestThemeCandidate } from '../../web/src/tools/executor';

describe('enterprise primary mapper', () => {
  test('maps technology future office semantics to tech blue', () => {
    const match = resolveEnterprisePrimaryFromText('现代科技未来办公平台');

    expect(match).not.toBeNull();
    expect(match?.presetHex).toBe('#0E70EE');
    expect(match?.confidence).toBe('high');
  });

  test('maps enterprise culture semantics to cultural brown', () => {
    const match = resolveEnterprisePrimaryFromText('生生不息 共筑未来');

    expect(match).not.toBeNull();
    expect(match?.presetHex).toBe('#6A2500');
    expect(match?.confidence).toBe('high');
  });

  test('maps collaboration office semantics to enterprise teal', () => {
    const match = resolveEnterprisePrimaryFromText('协作办公主题');

    expect(match).not.toBeNull();
    expect(match?.presetHex).toBe('#11A6B8');
    expect(match?.confidence).toBe('high');
  });

  test('maps party-building semantics to formal government red', () => {
    const match = resolveEnterprisePrimaryFromText('红色党建文化宣传主题');

    expect(match).not.toBeNull();
    expect(match?.presetHex).toBe('#C62828');
    expect(match?.confidence).toBe('high');
  });

  test('allows high-confidence semantic mapping to override extracted candidates', () => {
    const result = pickBestThemeCandidate(
      ['#11A6B8', '#4BAE39', '#B56A1E'],
      'light-ui',
      undefined,
      '生生不息 共筑未来',
    );

    expect(result.primaryColor.toUpperCase()).toBe('#6A2500');
    expect(result.enforcementReason).toContain('企业安全色库');
  });

  test('uses collaboration office semantics to override noisy cyan extraction', () => {
    const result = pickBestThemeCandidate(
      ['#61D1D1', '#C6B29C', '#E9E4DC'],
      'light-ui',
      undefined,
      '用这张图，生成一个协作办公主题包',
    );

    expect(result.primaryColor.toUpperCase()).not.toBe('#61D1D1');
    expect(result.primaryColor.toUpperCase()).not.toBe('#C6B29C');
    expect(result.enforcementReason).toContain('企业安全色库');
  });

  test('prefers explicit user-provided hex over semantic enterprise mapping', () => {
    const result = pickBestThemeCandidate(
      ['#11A6B8', '#4BAE39', '#B56A1E'],
      'light-ui',
      undefined,
      '生生不息 共筑未来，主题色改成 #0E70EE',
    );

    expect(result.primaryColor.toUpperCase()).toBe('#0E70EE');
    expect(result.enforcementReason).toContain('用户明确指定');
  });

  test('uses medium-confidence semantic mapping as a boost instead of a forced replacement', () => {
    const result = pickBestThemeCandidate(
      ['#1565C0', '#B56A1E', '#11A6B8'],
      'light-ui',
      undefined,
      '这是一个平台主题',
    );

    expect(result.primaryColor.toUpperCase()).not.toBe('#0052D9');
    expect(result.enforcementReason ?? '').not.toContain('企业安全色库');
  });

  test('snaps bright extracted greens into the enterprise-safe green range', () => {
    const result = pickBestThemeCandidate(
      ['#61D161', '#74DB74', '#E4F4E4'],
      'light-ui',
    );

    expect(result.primaryColor.toUpperCase()).not.toBe('#61D161');
    expect(['#4BAE39', '#00804D', '#006749']).toContain(result.primaryColor.toUpperCase());
    expect(result.enforcementReason).toContain('企业安全绿');
    expect(result.enforcementReason).toContain(result.primaryColor.toUpperCase());
  });
});
