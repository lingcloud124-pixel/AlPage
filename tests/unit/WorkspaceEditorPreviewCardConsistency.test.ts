import { describe, it, expect } from 'vitest';
import { readAllCSS } from '../helpers/read-css';
import fs from 'node:fs';

describe('workspace editor ↔ preview card consistency', () => {
  const css = readAllCSS();

  it('editor and preview cards share the same border-radius via CSS variable', () => {
    expect(css).toContain('--card-radius:');
    expect(css).toContain('var(--card-radius');
  });

  it('editor and preview cards share the same content padding via CSS variable', () => {
    expect(css).toContain('--card-content-pad:');
    expect(css).toContain('var(--card-content-pad');
  });

  it('editor and preview cards share the same header padding via CSS variable', () => {
    expect(css).toContain('--card-header-pad:');
    expect(css).toContain('var(--card-header-pad');
  });

  it('editor card uses shared workspace layout card shell', () => {
    const sharedCardBlock = css.match(/\.workspace-layout-card\s*\{[^}]*\}/)?.[0] ?? '';
    expect(sharedCardBlock).toContain('min-height: 0');
    expect(sharedCardBlock).not.toContain('min-height: 220px');
  });

  it('editor card content uses flex layout', () => {
    const content = css.match(/\.workspace-editor-card-content,\s*\.workspace-preview-card-content\s*\{[^}]*\}/)?.[0] ?? '';
    expect(content).toContain('flex: 1');
    expect(content).toContain('min-height: 0');
  });

  it('preview card content has flex layout matching editor', () => {
    const previewContent = css.match(/\.workspace-editor-card-content,\s*\.workspace-preview-card-content\s*\{[^}]*\}/)?.[0] ?? '';
    expect(previewContent).toContain('display: flex');
    expect(previewContent).toContain('flex-direction: column');
    expect(previewContent).toContain('gap: 10px');
  });

  it('interact adapter uses gap-aware step sizes for grid calculation', () => {
    const adapterSrc = fs.readFileSync('web/src/workspace/interact-adapter.ts', 'utf-8');
    expect(adapterSrc).toMatch(/stepX.*cellWidth.*gapX|cellWidth.*gapX.*stepX/);
    expect(adapterSrc).toMatch(/stepY.*rowHeight.*gapY|rowHeight.*gapY.*stepY/);
  });

  it('preview host overrides desktop-grid column layout', () => {
    expect(css).toContain('.desktop-grid.portal-workspace-preview-host');
    expect(css).toMatch(/\.workspace-card-canvas,[\s\S]*?\.desktop-grid\.portal-workspace-preview-host/);
  });
});
