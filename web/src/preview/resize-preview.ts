import { computePreviewTransform } from './scale-layout';

const DEFAULT_HORIZONTAL_INSET = 24;
const DEFAULT_VERTICAL_INSET = 24;

export function resizePreviewPages(): void {
  const containers = document.querySelectorAll<HTMLElement>('.preview-content');
  containers.forEach((container) => {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const activePage = container.querySelector<HTMLElement>('.preview-page.active-preview')
      ?? container.querySelector<HTMLElement>('.preview-page');
    if (!activePage) return;

    const rendered = activePage.firstElementChild as HTMLElement | null;
    if (!rendered) return;

    const renderedWidth = rendered.offsetWidth || parseInt(rendered.style.width, 10) || 0;
    const renderedHeight = rendered.offsetHeight || parseInt(rendered.style.height, 10) || 0;
    if (renderedWidth === 0 || renderedHeight === 0) return;

    const layout = computePreviewTransform({
      containerWidth,
      containerHeight,
      renderedWidth,
      renderedHeight,
      horizontalInset: DEFAULT_HORIZONTAL_INSET,
      verticalInset: DEFAULT_VERTICAL_INSET,
    });
    if (layout.scale <= 0) return;

    rendered.style.transformOrigin = 'top left';
    rendered.style.transform = `translate3d(${layout.offsetX}px, ${layout.offsetY}px, 0) scale(${layout.scale})`;
  });
}

declare global {
  interface Window {
    resizePreview?: () => void;
  }
}

export function registerPreviewResize(): void {
  window.resizePreview = resizePreviewPages;
  window.addEventListener('resize', resizePreviewPages);
}
