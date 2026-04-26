import { authHeaders } from './auth';

export interface CreditsInfo {
  credits: number;
  maxCredits: number;
  nextResetAt: string;
  costPerChat?: number;
}

let cachedCredits: CreditsInfo | null = null;

export async function fetchCredits(): Promise<CreditsInfo> {
  const res = await fetch('/api/theme/credits', { headers: authHeaders() });
  if (!res.ok) {
    return { credits: 0, maxCredits: 100, nextResetAt: '' };
  }
  cachedCredits = await res.json();
  updateCostHints(cachedCredits!.costPerChat);
  return cachedCredits!;
}

export function getCachedCredits(): CreditsInfo | null {
  return cachedCredits;
}

export function updateCreditsDisplay(info?: CreditsInfo): void {
  if (!info) info = cachedCredits || { credits: 0, maxCredits: 100, nextResetAt: '' };
  cachedCredits = info;

  const creditsText = document.getElementById('creditsText');
  const creditsFill = document.getElementById('creditsFill');

  if (creditsText) {
    creditsText.textContent = `⚡ ${info.credits}`;
  }

  if (creditsFill) {
    const pct = Math.max(0, Math.min(100, (info.credits / info.maxCredits) * 100));
    creditsFill.style.width = `${pct}%`;
    creditsFill.classList.remove('credits-ok', 'credits-medium', 'credits-low');
    if (pct <= 20) {
      creditsFill.classList.add('credits-low');
    } else if (pct <= 50) {
      creditsFill.classList.add('credits-medium');
    } else {
      creditsFill.classList.add('credits-ok');
    }
  }
}

export function formatNextReset(nextResetAt: string): string {
  if (!nextResetAt) return '明日 06:00';
  const d = new Date(nextResetAt);
  return `${d.getMonth() + 1}月${d.getDate()}日 06:00`;
}

export function updateCostHints(costPerChat?: number): void {
  const cost = costPerChat ?? cachedCredits?.costPerChat ?? 25;
  document.querySelectorAll('.chat-cost-hint').forEach(el => {
    el.textContent = `⚡${cost}`;
  });
}
