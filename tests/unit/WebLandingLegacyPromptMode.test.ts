import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { getLandingPromptEntries } from '../../web/src/landing-prompts';

const projectRoot = process.cwd();

describe('web landing legacy prompt mode', () => {
  test('landing quick prompts render the current eight curated entries', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    const entries = getLandingPromptEntries();

    expect(entries).toHaveLength(8);
    expect(html).toContain('landing-starter-pills theme-suggestions');
    expect(html).not.toContain('landing-prompt-trigger');
    expect(entries.map((entry) => entry.label)).toContain('做一套春节氛围主题，热闹一点');
    expect(entries.map((entry) => entry.label)).toContain('想要一个高级蓝色商务主题');
    expect(entries.map((entry) => entry.label)).toContain('生成一套金融行业办公主题');
    expect(entries.map((entry) => entry.label)).not.toContain('来一套春日气息的清明节主题皮肤');
  });

  test('landing prompt map keeps the latest long prompts behind short labels', () => {
    const entries = getLandingPromptEntries();

    expect(entries[0]).toMatchObject({
      label: '做一套春节氛围主题，热闹一点',
      primaryHint: '#C90808',
    });
    expect(entries[0].prompt).toContain('萌系3D卡通风格，营造新年喜庆且温馨的视觉氛围');
    expect(entries[2]).toMatchObject({
      label: '想要一个高级蓝色商务主题',
      primaryHint: '#138AEB',
    });
    expect(entries[2].prompt).toContain('流畅极少蓝白色渐变小笔刷发光在变换');
    expect(entries[7]).toMatchObject({
      label: '生成一套金融行业办公主题',
      primaryHint: '#9E7A37',
    });
    expect(entries[7].prompt).toContain('科技感背景设计，矢量风格，数字化');
  });

  test('landing prompt clicks pass the fixed primary hint into generation', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(chatManager).toContain('directPreviewPrimaryHint?: string;');
    expect(chatManager).toContain("...(directPreviewPrimaryHint ? { primaryHint: directPreviewPrimaryHint } : {}),");
    expect(chatManager).toContain('const preset = resolveLegacyLandingPreset(displayPrompt);');
    expect(chatManager).toContain('directPreviewPrimaryHint: preset.primaryHint,');
    expect(chatManager).toContain('renderLandingPromptButtons(landingPromptContainer);');
    expect(chatManager).toContain("landingPromptContainer.onclick = (event) => {");
    expect(chatManager).toContain("const button = target?.closest<HTMLElement>('.landing-prompt-trigger[data-prompt]');");
    expect(chatManager).toContain("void sendUserMessage('default', {");
  });

  test('landing prompt clicks force single-image generation pipeline', () => {
    const chatManager = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const toolUtils = fs.readFileSync(path.join(projectRoot, 'web/src/tools/executor.ts'), 'utf8');

    expect(chatManager).toContain('directPreviewPrompt?: string;');
    expect(chatManager).toContain('const preset = resolveLegacyLandingPreset(displayPrompt);');
    expect(chatManager).toContain("tool: 'generate_theme_pipeline'");
    expect(chatManager).toContain("prompt: directPreviewPrompt");
    expect(toolUtils).toContain("case 'generate_theme_pipeline':");
  });
});
