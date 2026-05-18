export function showNotificationWithOptions(
  message: string,
  options: {
    variant?: 'default' | 'critical';
    position?: 'bottom-right' | 'top-center';
    durationMs?: number;
  } = {},
) {
  const toast = document.createElement('div');
  toast.className = 'theme-studio-toast';
  toast.dataset.variant = options.variant ?? 'default';
  toast.dataset.position = options.position ?? 'bottom-right';
  toast.textContent = message;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 300);
  }, options.durationMs ?? 3000);
}
