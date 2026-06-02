import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('landing no gallery cards', () => {
  test('index.html has no landing-gallery-trigger elements', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    expect(html).not.toContain('landing-gallery-trigger');
    expect(html).not.toContain('data-image-src');
    expect(html).not.toContain('landing-gallery-grid');
  });

  test('chat-manager has no setLandingGalleryImage function', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    expect(source).not.toContain('setLandingGalleryImage');
    expect(source).not.toContain('landing-gallery-trigger');
    expect(source).not.toContain('landingGalleryCards');
  });
});
