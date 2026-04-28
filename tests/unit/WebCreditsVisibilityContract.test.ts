import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web credits visibility contract', () => {
  test('landing and sidebar credits are hidden by default in markup until runtime config loads', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="creditsBar" class="credits-bar" style="display: none;"');
    expect(html).toContain('id="landingCreditsChip" class="landing-credits-chip" type="button" title="当前积分" style="display: none;"');
    expect(html).toContain('class="chat-cost-hint" style="display: none;"');
  });

  test('credits module hides credits UI and cost hints when quota is disabled', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/credits.ts'), 'utf8');

    expect(source).toContain("const quotaEnabled = info.quotaEnabled !== false;");
    expect(source).toContain("creditsBar.style.display = quotaEnabled ? '' : 'none';");
    expect(source).toContain("landingCreditsChip.style.display = quotaEnabled ? '' : 'none';");
    expect(source).toContain("updateCostHints(info.costPerImage, quotaEnabled);");
    expect(source).toContain("(el as HTMLElement).style.display = enabled ? '' : 'none';");
  });
});
