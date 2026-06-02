import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('preview resize width-only contracts', () => {
  const resizeSource = fs.readFileSync(
    path.join(projectRoot, 'web/src/preview/resize-preview.ts'),
    'utf8',
  );
  const previewCss = fs.readFileSync(
    path.join(projectRoot, 'web/src/styles/preview-panel.css'),
    'utf8',
  );
  const html = fs.readFileSync(
    path.join(projectRoot, 'web/index.html'),
    'utf8',
  );
  const workspacePreviewSource = fs.readFileSync(
    path.join(projectRoot, 'web/src/workspace/preview.ts'),
    'utf8',
  );
  const templateRegistry = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'config/web-template-registry.json'), 'utf8'),
  ) as Record<string, { width?: number }>;

  test('scales down from width but does not transform-scale above 1', () => {
    expect(resizeSource).toContain('const scale = Math.min(viewportWidth / baselineWidth, 1)');
    expect(resizeSource).toContain('const renderedWidth = scale < 1 ? baselineWidth : viewportWidth');
    expect(resizeSource).not.toContain('viewportHeight /');
    expect(resizeSource).not.toContain('scaleY');
    expect(resizeSource).not.toContain('computePreviewTransform');
  });

  test('uses an unscaled spacer to create scroll height for transformed content', () => {
    expect(resizeSource).toContain('preview-scroll-spacer');
    expect(resizeSource).toContain('spacer.style.height');
    expect(resizeSource).toContain('Math.max(scaledHeight + PREVIEW_SHADOW_GUTTER * 2, activePage.clientHeight)');
  });

  test('centers short previews vertically and starts tall previews at top', () => {
    expect(resizeSource).toContain('const offsetY = Math.max((viewportHeight - scaledHeight) / 2, 0)');
    expect(resizeSource).toContain("rendered.style.top = `${PREVIEW_SHADOW_GUTTER + offsetY}px`");
  });

  test('uses ResizeObserver on .preview-content for automatic recalculation', () => {
    expect(resizeSource).toContain('ResizeObserver');
    expect(resizeSource).toContain('observePreviewContainers');
    expect(resizeSource).toContain('observer.observe(el)');
    expect(resizeSource).toContain("'.preview-content'");
  });

  test('coalesces resize callbacks with requestAnimationFrame', () => {
    expect(resizeSource).toContain('cancelAnimationFrame(rafId)');
    expect(resizeSource).toContain('requestAnimationFrame(() => resizePreviewPages())');
  });

  test('viewportWidth comes from .preview-page.clientWidth not outer container', () => {
    expect(resizeSource).toContain('activePage.clientWidth');
    // Should NOT use container.clientWidth for viewport width
    const lines = resizeSource.split('\n');
    const viewportLine = lines.find((l) => l.includes('viewportWidth') && l.includes('clientWidth'));
    expect(viewportLine).toBeDefined();
    expect(viewportLine).toContain('activePage');
  });

  test('scale is capped at 1 — wide viewport uses natural layout', () => {
    expect(resizeSource).toContain('Math.min(viewportWidth / baselineWidth, 1)');
    expect(resizeSource).toContain("rendered.style.transform = scale < 1 ? `scale(${scale})` : 'none'");
    expect(resizeSource).toContain('const renderedWidth = scale < 1 ? baselineWidth : viewportWidth');
  });

  test('reserves a shadow gutter inside the preview scroll viewport', () => {
    expect(resizeSource).toContain('const PREVIEW_SHADOW_GUTTER = 12');
    expect(resizeSource).toContain('activePage.clientWidth - PREVIEW_SHADOW_GUTTER * 2');
    expect(resizeSource).toContain('activePage.clientHeight - PREVIEW_SHADOW_GUTTER * 2');
    expect(resizeSource).toContain('PREVIEW_SHADOW_GUTTER + offsetX');
    expect(resizeSource).toContain('PREVIEW_SHADOW_GUTTER + offsetY');
    expect(resizeSource).toContain('scaledHeight + PREVIEW_SHADOW_GUTTER * 2');
  });

  test('removes legacy inline resize implementation from index html', () => {
    expect(html).not.toContain('function resizePreview()');
    expect(html).not.toContain('scaleY');
  });

  test('preview page is fixed-height scroll viewport', () => {
    expect(previewCss).toContain('.preview-scroll-spacer');
    expect(previewCss).toContain('padding: 16px');
    expect(previewCss).toContain('box-sizing: border-box');
    expect(previewCss).toContain('height: 100%');
    expect(previewCss).toContain('overflow-y: hidden');
  });

  test('preview display area centers the page vertically and horizontally', () => {
    const previewContentBlock = previewCss.match(/\.preview-content\s*\{([^}]*)\}/)?.[1] ?? '';
    const previewPageBlock = previewCss.match(/\.preview-page\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(previewContentBlock).toContain('display: grid;');
    expect(previewContentBlock).toContain('place-items: center;');
    expect(previewPageBlock).toContain('align-self: center;');
    expect(previewPageBlock).toContain('justify-self: center;');
  });

  test('weakens preview-only template shadow without changing template files', () => {
    expect(previewCss).toContain('.preview-page > [data-template-id]');
    expect(previewCss).toContain('box-shadow: 0 10px 26px rgba(15, 23, 42, 0.10)');
    expect(previewCss).not.toContain('.template-desktop {\n  box-shadow: 0 10px 26px');
  });

  test('desktop preview scales from the 1440 portal baseline', () => {
    expect(templateRegistry.desktop.width).toBe(1440);
  });

  test('workspace preview releases fixed template height before resizing', () => {
    expect(workspacePreviewSource).toContain('fitWorkspaceDrivenTemplateHeight');
    expect(workspacePreviewSource).toContain("templateRoot.style.height = `${contentHeight}px`");
    expect(workspacePreviewSource).toContain("templateRoot.style.overflow = 'visible'");
  });
});
