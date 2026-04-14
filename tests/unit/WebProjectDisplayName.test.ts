import { describe, expect, test } from 'vitest';

import { getProjectThemeLabel } from '../../web/src/project-manager';

describe('web project display name', () => {
  test('prefers theme name and falls back to AI主题 for the preview topbar label', () => {
    expect(getProjectThemeLabel({ themeName: '春节主题', name: '项目A' } as any)).toBe('春节主题');
    expect(getProjectThemeLabel({ name: '未命名项目' } as any)).toBe('AI主题');
    expect(getProjectThemeLabel({ name: '自定义项目' } as any)).toBe('AI主题');
  });
});
