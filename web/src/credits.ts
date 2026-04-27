import { authHeaders } from './auth';

export interface CreditsInfo {
  credits: number;
  maxCredits: number;
  nextResetAt: string;
  costPerChat?: number;
  quotaEnabled?: boolean;
}

let cachedCredits: CreditsInfo | null = null;

export async function fetchCredits(): Promise<CreditsInfo> {
  const res = await fetch('/api/theme/credits', { headers: authHeaders() });
  if (!res.ok) {
    return { credits: 0, maxCredits: 100, nextResetAt: '', quotaEnabled: false };
  }
  cachedCredits = await res.json();
  updateCostHints(cachedCredits!.costPerChat, cachedCredits!.quotaEnabled !== false);
  return cachedCredits!;
}

export function getCachedCredits(): CreditsInfo | null {
  return cachedCredits;
}

export function updateCreditsDisplay(info?: CreditsInfo): void {
  if (!info) info = cachedCredits || { credits: 0, maxCredits: 100, nextResetAt: '', quotaEnabled: false };
  cachedCredits = info;
  const quotaEnabled = info.quotaEnabled !== false;

  const creditsText = document.getElementById('creditsText');
  const creditsBar = document.getElementById('creditsBar');
  const landingCreditsChip = document.getElementById('landingCreditsChip');
  const landingCreditsText = document.getElementById('landingCreditsText');
  const creditsFill = document.getElementById('creditsFill');

  if (creditsBar) {
    creditsBar.style.display = quotaEnabled ? '' : 'none';
  }

  if (landingCreditsChip) {
    landingCreditsChip.style.display = quotaEnabled ? '' : 'none';
  }

  updateCostHints(info.costPerChat, quotaEnabled);

  if (!quotaEnabled) {
    return;
  }

  if (creditsText) {
    creditsText.textContent = `⚡ ${info.credits}`;
  }

  if (landingCreditsText) {
    landingCreditsText.textContent = `${info.credits}`;
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

export function updateCostHints(costPerChat?: number, enabled = true): void {
  const cost = costPerChat ?? cachedCredits?.costPerChat ?? 25;
  document.querySelectorAll('.chat-cost-hint').forEach(el => {
    (el as HTMLElement).style.display = enabled ? '' : 'none';
    el.textContent = `⚡${cost}`;
  });
}
