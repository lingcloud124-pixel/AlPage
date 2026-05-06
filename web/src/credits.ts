
import { apiFetch } from './api-base';

export interface CreditsInfo {
  credits: number;
  maxCredits: number;
  nextResetAt: string;
  costPerImage?: number;
  quotaEnabled?: boolean;
  creditsTooltipContent?: string;
}

let cachedCredits: CreditsInfo | null = null;

const DEFAULT_CREDITS_TOOLTIP_LINES = [
  '1、每位用户每日可获得 10 次免费生成主题背景图的机会',
  '2、每成功生成 1 次主题背景图，扣除 1 次机会',
  '3、每日生成次数将在次日 06:00 自动清零并重新发放',
];

export function setupCreditsTooltip(): void {
  const chip = document.getElementById('landingCreditsChip') as HTMLButtonElement | null;
  const tooltip = document.getElementById('landingCreditsTooltip') as HTMLElement | null;
  if (!chip || !tooltip) return;

  const show = () => {
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
  };

  const hide = () => {
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  };

  chip.addEventListener('mouseenter', show);
  chip.addEventListener('mouseleave', () => {
    if (!tooltip.matches(':hover')) hide();
  });
  tooltip.addEventListener('mouseenter', show);
  tooltip.addEventListener('mouseleave', hide);

  chip.addEventListener('click', (event) => {
    event.preventDefault();
    if (tooltip.classList.contains('is-visible')) {
      hide();
    } else {
      show();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (!target) return;
    if (chip.contains(target) || tooltip.contains(target)) return;
    hide();
  });
}

function updateCreditsTooltipContent(content?: string): void {
  const list = document.getElementById('landingCreditsTooltipList');
  if (!list) return;

  const lines = (content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const finalLines = lines.length > 0 ? lines : DEFAULT_CREDITS_TOOLTIP_LINES;
  list.innerHTML = '';
  finalLines.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    list.appendChild(item);
  });
}

export async function fetchCredits(): Promise<CreditsInfo> {
  const res = await apiFetch('/api/theme/credits');
  if (!res.ok) {
    return { credits: 0, maxCredits: 100, nextResetAt: '', quotaEnabled: false, creditsTooltipContent: DEFAULT_CREDITS_TOOLTIP_LINES.join('\n') };
  }
  cachedCredits = await res.json();
  updateCostHints(cachedCredits!.costPerImage, cachedCredits!.quotaEnabled !== false);
  return cachedCredits!;
}

export function getCachedCredits(): CreditsInfo | null {
  return cachedCredits;
}

export function updateCreditsDisplay(info?: CreditsInfo): void {
  if (!info) info = cachedCredits || { credits: 0, maxCredits: 100, nextResetAt: '', quotaEnabled: false, creditsTooltipContent: DEFAULT_CREDITS_TOOLTIP_LINES.join('\n') };
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

  updateCreditsTooltipContent(info.creditsTooltipContent);

  updateCostHints(info.costPerImage, quotaEnabled);

  if (!quotaEnabled) {
    return;
  }

  if (creditsText) {
    creditsText.textContent = `✦ ${info.credits}`;
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

export function updateCostHints(costPerImage?: number, enabled = true): void {
  const cost = costPerImage ?? cachedCredits?.costPerImage ?? 50;
  document.querySelectorAll('.chat-cost-hint').forEach(el => {
    (el as HTMLElement).style.display = enabled ? '' : 'none';
    el.textContent = `✦${cost}`;
  });
}
