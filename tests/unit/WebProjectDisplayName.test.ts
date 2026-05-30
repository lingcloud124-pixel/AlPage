import { describe, expect, test } from 'vitest';

import { getProjectThemeLabel } from '../../web/src/project-manager';

describe('web project display name', () => {
  test('prefers explicit theme name and otherwise falls back to the current portal name', () => {
    expect(getProjectThemeLabel({ themeName: '春节主题', name: '项目A' } as any)).toBe('春节主题');
    expect(getProjectThemeLabel({ name: '未命名项目' } as any)).toBe('未命名项目');
    expect(getProjectThemeLabel({ name: '自定义项目' } as any)).toBe('自定义项目');
  });
});
