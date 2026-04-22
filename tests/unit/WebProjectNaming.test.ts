import { describe, expect, test } from 'vitest';

import { buildProjectExportNameEn, deriveNameEnFromText, getProjectNameEnBase } from '../../web/src/project-naming';
import { clampPackageTitle } from '../../web/src/export/build-config';

describe('web project naming', () => {
  test('derives canonical english slugs from common chinese theme prompts', () => {
    expect(deriveNameEnFromText('帮我做一个 2026 清明节主题，偏国风')).toBe('qingming');
    expect(deriveNameEnFromText('申能企业蓝主题，要稳重一点')).toBe('shenergy-enterprise');
    expect(deriveNameEnFromText('国庆节暗色主题')).toBe('national-day-dark');
  });

  test('reuses stored project slug without duplicating the project id prefix', () => {
    expect(getProjectNameEnBase({ id: 'project-123', nameEn: 'qingming' })).toBe('qingming');
    expect(getProjectNameEnBase({ id: 'project-123', nameEn: 'project-123-qingming' })).toBe('qingming');
    expect(buildProjectExportNameEn({ id: 'project-123', nameEn: 'qingming' })).toBe('project-123-qingming');
  });

  test('clamps package title to 10 characters without changing export slug generation', () => {
    expect(clampPackageTitle('这是一个超过十个字符的主题名称')).toBe('这是一个超过十个字符');
    expect(buildProjectExportNameEn({ id: 'project-123', nameEn: 'qingming' })).toBe('project-123-qingming');
  });
});
