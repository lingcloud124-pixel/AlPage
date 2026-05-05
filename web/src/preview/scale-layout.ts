export interface PreviewScaleInput {
  containerWidth: number;
  containerHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  horizontalInset?: number;
  verticalInset?: number;
}

export interface PreviewScaleResult {
  scale: number;
  offsetX: number;
  offsetY: number;
  scaledWidth: number;
  scaledHeight: number;
}

function clampToPositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computePreviewTransform(input: PreviewScaleInput): PreviewScaleResult {
  const containerWidth = clampToPositive(input.containerWidth);
  const containerHeight = clampToPositive(input.containerHeight);
  const renderedWidth = clampToPositive(input.renderedWidth);
  const renderedHeight = clampToPositive(input.renderedHeight);
  const horizontalInset = Math.max(0, input.horizontalInset ?? 24);
  const verticalInset = Math.max(0, input.verticalInset ?? 24);

  if (containerWidth === 0 || containerHeight === 0 || renderedWidth === 0 || renderedHeight === 0) {
    return {
      scale: 0,
      offsetX: 0,
      offsetY: 0,
      scaledWidth: 0,
      scaledHeight: 0,
    };
  }

  const availableWidth = Math.max(containerWidth - horizontalInset * 2, 0);
  const availableHeight = Math.max(containerHeight - verticalInset * 2, 0);
  if (availableWidth === 0 || availableHeight === 0) {
    return {
      scale: 0,
      offsetX: horizontalInset,
      offsetY: verticalInset,
      scaledWidth: 0,
      scaledHeight: 0,
    };
  }

  const scale = Math.min(availableWidth / renderedWidth, availableHeight / renderedHeight);
  const scaledWidth = renderedWidth * scale;
  const scaledHeight = renderedHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    scaledWidth,
    scaledHeight,
  };
}
