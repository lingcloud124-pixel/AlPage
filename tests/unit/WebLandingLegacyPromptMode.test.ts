import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web landing legacy prompt mode', () => {
  test('landing quick prompts are reduced to the requested seven entries', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const buttonCount = (html.match(/landing-prompt-trigger/g) ?? []).length;

    expect(buttonCount).toBe(7);
    expect(html).toContain('来一套春日气息的清明节主题皮肤');
    expect(html).toContain('需要一套国风端午节主题包');
    expect(html).toContain('推行科技创新，做一套科技主题包');
    expect(html).toContain('做一套温馨的中秋节主题');
    expect(html).toContain('为祖国庆生，做一个国庆节主题包');
    expect(html).not.toContain('来一套绿色低碳主题皮肤');
    expect(html).not.toContain('来一套协同办公主题皮肤');
  });

  test('landing prompt map keeps long legacy prompts behind short labels', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/landing-prompts.ts'), 'utf8');

    expect(source).toContain('LEGACY_LANDING_PROMPTS');
    expect(source).toContain('想做一套有新年氛围的主题皮肤，整体轻盈喜庆，适合门户首页和工作台展示。');
    expect(source).toContain('一张 2026 年元旦主题的节日海报');
    expect(source).toContain('展开的古典画卷、卷轴左右展开');
  });

  test('landing prompt clicks force single-image generation pipeline', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const toolUtils = fs.readFileSync(path.join(projectRoot, 'web/src/tools/executor.ts'), 'utf8');

    expect(chatManager).toContain('directPreviewPrompt?: string;');
    expect(chatManager).toContain('const directPreviewPrompt = resolveLegacyLandingPrompt(displayPrompt);');
    expect(chatManager).toContain("tool: 'generate_theme_pipeline'");
    expect(chatManager).toContain("prompt: directPreviewPrompt");
    expect(toolUtils).toContain("case 'generate_theme_pipeline':");
  });
});
