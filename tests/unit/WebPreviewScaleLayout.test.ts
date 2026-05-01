import { describe, expect, test } from 'vitest';

import { computePreviewTransform } from '../../web/src/preview/scale-layout';

describe('web preview scale layout', () => {
  test('keeps the rendered preview fully inside a narrow container', () => {
    const result = computePreviewTransform({
      containerWidth: 560,
      containerHeight: 620,
      renderedWidth: 1440,
      renderedHeight: 900,
      horizontalInset: 24,
      verticalInset: 24,
    });

    expect(result.scale).toBeGreaterThan(0);
    expect(result.scaledWidth).toBeLessThanOrEqual(560 - 48);
    expect(result.scaledHeight).toBeLessThanOrEqual(620 - 48);
    expect(result.offsetX).toBeGreaterThanOrEqual(24);
    expect(result.offsetY).toBeGreaterThanOrEqual(24);
    expect(result.offsetX + result.scaledWidth).toBeLessThanOrEqual(560 - 24);
    expect(result.offsetY + result.scaledHeight).toBeLessThanOrEqual(620 - 24);
  });

  test('centers the preview inside the available viewport after scaling', () => {
    const result = computePreviewTransform({
      containerWidth: 980,
      containerHeight: 720,
      renderedWidth: 1440,
      renderedHeight: 900,
      horizontalInset: 24,
      verticalInset: 24,
    });

    expect(result.offsetX).toBeCloseTo((980 - result.scaledWidth) / 2, 5);
    expect(result.offsetY).toBeCloseTo((720 - result.scaledHeight) / 2, 5);
  });
});
