import { getTemplateConfig } from '../theme/template-registry';

const PREVIEW_SHADOW_GUTTER = 12;

let observer: ResizeObserver | null = null;
let rafId = 0;

export function resizePreviewPages(): void {
  const containers = document.querySelectorAll<HTMLElement>('.preview-content');
  containers.forEach((container) => {
    const activePage = container.querySelector<HTMLElement>('.preview-page.active-preview')
      ?? container.querySelector<HTMLElement>('.preview-page');
    if (!activePage) return;
    const viewportWidth = activePage.clientWidth - PREVIEW_SHADOW_GUTTER * 2;
    const viewportHeight = activePage.clientHeight - PREVIEW_SHADOW_GUTTER * 2;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const rendered = Array.from(activePage.children).find((el) => !el.classList.contains('preview-scroll-spacer')) as HTMLElement | null;
    if (!rendered) return;

    const templateId = rendered.dataset.templateId;
    const templateConfig = templateId ? getTemplateConfig(templateId) : undefined;
    const baselineWidth = templateConfig?.width || parseInt(rendered.style.width, 10) || rendered.offsetWidth || 0;
    const baselineHeight = templateConfig?.height || parseInt(rendered.style.height, 10) || rendered.offsetHeight || 0;
    if (baselineWidth === 0 || baselineHeight === 0) return;

    const scale = Math.min(viewportWidth / baselineWidth, 1);
    const renderedWidth = scale < 1 ? baselineWidth : viewportWidth;
    const scaledWidth = renderedWidth * scale;
    const scaledHeight = baselineHeight * scale;
    const offsetX = Math.max((viewportWidth - scaledWidth) / 2, 0);
    const offsetY = Math.max((viewportHeight - scaledHeight) / 2, 0);

    activePage.style.overflowY = scaledHeight + PREVIEW_SHADOW_GUTTER * 2 > activePage.clientHeight ? 'auto' : 'hidden';
    let spacer = activePage.querySelector<HTMLElement>('.preview-scroll-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'preview-scroll-spacer';
      activePage.appendChild(spacer);
    }
    spacer.style.height = `${Math.max(scaledHeight + PREVIEW_SHADOW_GUTTER * 2, activePage.clientHeight)}px`;

    rendered.style.position = 'absolute';
    rendered.style.left = `${PREVIEW_SHADOW_GUTTER + offsetX}px`;
    rendered.style.top = `${PREVIEW_SHADOW_GUTTER + offsetY}px`;
    rendered.style.width = `${renderedWidth}px`;
    rendered.style.transformOrigin = 'top left';
    rendered.style.transform = scale < 1 ? `scale(${scale})` : 'none';
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
  observePreviewContainers();
}

function observePreviewContainers(): void {
  observer?.disconnect();
  observer = new ResizeObserver((entries) => {
    if (entries.length === 0) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => resizePreviewPages());
  });
  document.querySelectorAll<HTMLElement>('.preview-content').forEach((el) => {
    if (observer) observer.observe(el);
  });
}
