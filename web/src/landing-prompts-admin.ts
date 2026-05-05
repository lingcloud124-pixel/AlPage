import {
  getDefaultLandingPromptEntries,
  getLandingPromptEntries,
  resetLandingPromptEntries,
  saveLandingPromptEntries,
  type LandingPromptEntry,
} from './landing-prompts';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizePrimaryHint(primaryHint: string | undefined): string {
  const normalized = primaryHint?.trim().toUpperCase() ?? '';
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : '';
}

function renderPromptList(entries: LandingPromptEntry[]): void {
  const container = document.getElementById('landingPromptAdminList');
  if (!container) return;
  container.innerHTML = '';

  entries.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'landing-prompt-config-item';
    item.innerHTML = `
      <div class="landing-prompt-config-header">
        <span class="landing-prompt-config-index">#${index + 1}</span>
        <div class="landing-prompt-config-title">${escapeHtml(entry.label)}</div>
      </div>
      <div class="landing-prompt-config-grid">
        <div class="landing-prompt-config-field">
          <label class="landing-prompt-config-label" for="landingPromptLabel${index}">标题文案</label>
          <input class="landing-prompt-config-input" id="landingPromptLabel${index}" type="text" value="${escapeHtml(entry.label)}">
        </div>
        <div class="landing-prompt-config-field">
          <label class="landing-prompt-config-label" for="landingPromptColor${index}">固定主题色</label>
          <input class="landing-prompt-config-input" id="landingPromptColor${index}" type="text" value="${escapeHtml(entry.primaryHint || '')}" placeholder="#RRGGBB">
        </div>
        <div class="landing-prompt-config-field landing-prompt-config-field--full">
          <label class="landing-prompt-config-label" for="landingPromptPrompt${index}">长咒语 Prompt</label>
          <textarea class="landing-prompt-config-textarea" id="landingPromptPrompt${index}">${escapeHtml(entry.prompt)}</textarea>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function readPromptList(): LandingPromptEntry[] {
  const defaults = getDefaultLandingPromptEntries();
  return defaults.map((defaultEntry, index) => {
    const labelInput = document.getElementById(`landingPromptLabel${index}`) as HTMLInputElement | null;
    const promptInput = document.getElementById(`landingPromptPrompt${index}`) as HTMLTextAreaElement | null;
    const colorInput = document.getElementById(`landingPromptColor${index}`) as HTMLInputElement | null;
    return {
      label: labelInput?.value.trim() || defaultEntry.label,
      prompt: promptInput?.value.trim() || defaultEntry.prompt,
      primaryHint: normalizePrimaryHint(colorInput?.value) || defaultEntry.primaryHint,
    };
  });
}

function showStatus(message: string): void {
  const existing = document.querySelector('.landing-admin-toast');
  existing?.remove();
  const toast = document.createElement('div');
  toast.className = 'landing-admin-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  renderPromptList(getLandingPromptEntries());

  const saveBtn = document.getElementById('landingPromptSaveBtn');
  const resetBtn = document.getElementById('landingPromptResetBtn');

  saveBtn?.addEventListener('click', () => {
    saveLandingPromptEntries(readPromptList());
    showStatus('快捷指令配置已保存，首页刷新后立即生效');
  });

  resetBtn?.addEventListener('click', () => {
    resetLandingPromptEntries();
    renderPromptList(getDefaultLandingPromptEntries());
    showStatus('已恢复默认快捷指令配置');
  });
});
