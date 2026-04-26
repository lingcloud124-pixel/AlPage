import { describe, expect, test } from 'vitest';
import { buildThemeImageAssignments } from '../../web/src/templates/theme-images';

describe('web theme image assignments', () => {
  test('converts data image urls into renderable urls for preview backgrounds', () => {
    const assignments = buildThemeImageAssignments('login', 'data:image/png;base64,Zm9v');
    const value = assignments['--theme-login-bg-image'];

    expect(value).toBeTruthy();
    expect(value.startsWith("url('")).toBe(true);
    expect(value.includes('blob:') || value.includes('data:image/png;base64,Zm9v')).toBe(true);
  });
});
