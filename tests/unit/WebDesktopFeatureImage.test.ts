import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('web desktop feature image styling', () => {
  test('featured story media consumes desktop feature image variable', () => {
    const cssPath = path.resolve('web/src/templates/desktop.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('var(--theme-desktop-feature-image');
    expect(css).toContain('.featured-story-media');
  });
});
