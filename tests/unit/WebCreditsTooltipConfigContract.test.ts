import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('credits tooltip config contract', () => {
  test('admin security settings expose editable credits tooltip content', () => {
    const adminHtml = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');
    const securityRoute = fs.readFileSync(path.join(projectRoot, 'server/src/routes/security-config.ts'), 'utf8');
    const creditsRoute = fs.readFileSync(path.join(projectRoot, 'server/src/routes/credits.ts'), 'utf8');

    expect(adminHtml).toContain('id="creditsTooltipContent"');
    expect(adminHtml).toContain('creditsTooltipContent: document.getElementById(\'creditsTooltipContent\').value');
    expect(adminHtml).toContain('document.getElementById(\'creditsTooltipContent\').value = securityData.creditsTooltipContent || \'\'');
    expect(securityRoute).toContain('creditsTooltipContent');
    expect(creditsRoute).toContain('creditsTooltipContent: config?.credits_tooltip_content ?? \'\'');
  });

  test('web credits tooltip renders backend-provided lines into the landing tooltip list', () => {
    const webHtml = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const creditsSource = fs.readFileSync(path.join(projectRoot, 'web/src/credits.ts'), 'utf8');

    expect(webHtml).toContain('id="landingCreditsTooltipList"');
    expect(creditsSource).toContain('function updateCreditsTooltipContent(content?: string): void');
    expect(creditsSource).toContain("const finalLines = lines.length > 0 ? lines : DEFAULT_CREDITS_TOOLTIP_LINES;");
    expect(creditsSource).toContain('updateCreditsTooltipContent(info.creditsTooltipContent);');
  });
});
