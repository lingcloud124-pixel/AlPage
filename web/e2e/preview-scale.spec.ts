import { expect, test } from '@playwright/test';

test.describe('preview scale layout', () => {
  test('keeps the login preview inside the preview viewport at narrow layout widths', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '用科技蓝主题图生成主题包' }).click();
    await page.waitForTimeout(1200);

    const data = await page.locator('body').evaluate(() => {
      const previewContent = document.querySelector('.preview-content');
      const activePage = document.querySelector('.preview-page.active-preview');
      const rendered = activePage?.firstElementChild as HTMLElement | null;
      const contentRect = previewContent?.getBoundingClientRect();
      const renderedRect = rendered?.getBoundingClientRect();
      return {
        contentRect: contentRect ? {
          left: contentRect.left,
          top: contentRect.top,
          right: contentRect.right,
          bottom: contentRect.bottom,
          width: contentRect.width,
          height: contentRect.height,
        } : null,
        renderedRect: renderedRect ? {
          left: renderedRect.left,
          top: renderedRect.top,
          right: renderedRect.right,
          bottom: renderedRect.bottom,
          width: renderedRect.width,
          height: renderedRect.height,
        } : null,
        transform: rendered ? getComputedStyle(rendered).transform : null,
      };
    });

    expect(data.contentRect).toBeTruthy();
    expect(data.renderedRect).toBeTruthy();
    expect(data.transform).not.toBe('none');

    const epsilon = 1;
    expect(data.renderedRect!.left).toBeGreaterThanOrEqual(data.contentRect!.left - epsilon);
    expect(data.renderedRect!.top).toBeGreaterThanOrEqual(data.contentRect!.top - epsilon);
    expect(data.renderedRect!.right).toBeLessThanOrEqual(data.contentRect!.right + epsilon);
    expect(data.renderedRect!.bottom).toBeLessThanOrEqual(data.contentRect!.bottom + epsilon);
  });
});
