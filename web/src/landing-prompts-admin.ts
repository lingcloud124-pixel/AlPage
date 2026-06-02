import './styles.css';
import {
  DEFAULT_LANDING_PROMPT_ENTRIES,
  type LandingPromptEntry,
} from './landing-prompts';

const listEl = document.getElementById('landingPromptAdminList') as HTMLElement | null;
const saveBtn = document.getElementById('landingPromptSaveBtn') as HTMLButtonElement | null;
const resetBtn = document.getElementById('landingPromptResetBtn') as HTMLButtonElement | null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeEntries(entries: unknown): LandingPromptEntry[] {
  if (!Array.isArray(entries)) return DEFAULT_LANDING_PROMPT_ENTRIES.map((entry) => ({ ...entry }));
  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => ({
      label: String(entry.label ?? '').trim(),
      prompt: String(entry.prompt ?? '').trim(),
      primaryHint: String(entry.primaryHint ?? '').trim(),
    }))
    .filter((entry) => entry.label || entry.prompt);
}

function renderLandingPromptEntries(entries: LandingPromptEntry[]): void {
  if (!listEl) return;
  listEl.innerHTML = entries.map((entry, index) => `
    <article class="landing-prompt-config-item" data-index="${index}">
      <div class="landing-prompt-config-header">
        <span class="landing-prompt-config-index">${index + 1}</span>
        <strong class="landing-prompt-config-title">快捷指令</strong>
      </div>
      <div class="landing-prompt-config-grid">
        <label class="landing-prompt-config-field">
          <span class="landing-prompt-config-label">按钮文案</span>
          <input class="landing-prompt-config-input" data-field="label" value="${escapeHtml(entry.label)}" />
        </label>
        <label class="landing-prompt-config-field">
          <span class="landing-prompt-config-label">主色提示</span>
          <input class="landing-prompt-config-input" data-field="primaryHint" value="${escapeHtml(entry.primaryHint ?? '')}" />
        </label>
        <label class="landing-prompt-config-field landing-prompt-config-field--full">
          <span class="landing-prompt-config-label">图片生成 Prompt</span>
          <textarea class="landing-prompt-config-textarea" data-field="prompt">${escapeHtml(entry.prompt)}</textarea>
        </label>
      </div>
    </article>
  `).join('');
}

function readLandingPromptEntries(): LandingPromptEntry[] {
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll<HTMLElement>('.landing-prompt-config-item'))
    .map((item) => ({
      label: (item.querySelector<HTMLInputElement>('[data-field="label"]')?.value ?? '').trim(),
      prompt: (item.querySelector<HTMLTextAreaElement>('[data-field="prompt"]')?.value ?? '').trim(),
      primaryHint: (item.querySelector<HTMLInputElement>('[data-field="primaryHint"]')?.value ?? '').trim(),
    }))
    .filter((entry) => entry.label || entry.prompt);
}

async function loadLandingPromptEntries(): Promise<LandingPromptEntry[]> {
  try {
    const res = await fetch('/api/landing-prompts-config', { credentials: 'same-origin' });
    if (!res.ok) return DEFAULT_LANDING_PROMPT_ENTRIES.map((entry) => ({ ...entry }));
    const data = await res.json();
    return normalizeEntries(data.entries);
  } catch {
    return DEFAULT_LANDING_PROMPT_ENTRIES.map((entry) => ({ ...entry }));
  }
}

export async function saveLandingPromptEntries(): Promise<void> {
  const entries = readLandingPromptEntries();
  const res = await fetch('/api/landing-prompts-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ entries, enabled: true }),
  });
  if (!res.ok) throw new Error('保存快捷指令失败');
}

export function resetLandingPromptEntries(): void {
  renderLandingPromptEntries(DEFAULT_LANDING_PROMPT_ENTRIES.map((entry) => ({ ...entry })));
}

async function initLandingPromptAdmin(): Promise<void> {
  renderLandingPromptEntries(await loadLandingPromptEntries());
  saveBtn?.addEventListener('click', () => {
    void saveLandingPromptEntries();
  });
  resetBtn?.addEventListener('click', resetLandingPromptEntries);
}

void initLandingPromptAdmin();
