import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { getScreenshotTargets, type ScreenshotTarget } from '../src/export/screenshot-rules';
import { buildScreenshotThemeImageAssignments } from '../src/export/theme-image-overrides';
import { getTemplateConfig } from '../src/theme/template-registry';

const BASE_URL = 'http://localhost:5173';
const WEB_ROOT = path.resolve(import.meta.dirname, '..');

interface ScreenshotOptions {
  themeImageUrl?: string;
  templateType?: 'light-ui' | 'dark-ui';
}

async function captureElement(page: Page, target: ScreenshotTarget, outputDir: string): Promise<string> {
  const element = await page.$(target.selector);
  if (!element) {
    throw new Error(`元素未找到: ${target.selector}`);
  }

  await element.scrollIntoViewIfNeeded?.().catch(() => {});

  const ext = target.format === 'jpeg' ? 'jpg' : 'png';
  const filePath = path.join(outputDir, `${target.outputName}.${ext}`);

  await element.screenshot({
    path: filePath,
    type: target.format,
    quality: target.format === 'jpeg' ? 95 : undefined,
  });

  return filePath;
}

function requireTemplateId(target: ScreenshotTarget): string {
  if (!target.templateId) throw new Error(`截图目标缺少 templateId: ${target.outputName}`);
  return target.templateId;
}

function buildThemeVarCss(assignments: Record<string, string>): string {
  return Object.entries(assignments)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n');
}

function readTemplateHtml(templateId: string): string {
  const template = getTemplateConfig(templateId);
  if (!template) throw new Error(`未知模板: ${templateId}`);

  const relativePath = template.htmlPath.replace(/^\//, '');
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf-8');
}

function buildTemplateDocument(target: ScreenshotTarget, themeImageAssignments: Record<string, string>): string {
  const templateId = requireTemplateId(target);
  const template = getTemplateConfig(templateId);
  if (!template) throw new Error(`未知模板: ${templateId}`);

  const html = readTemplateHtml(templateId);
  const themeVarCss = buildThemeVarCss(themeImageAssignments);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${BASE_URL}/src/templates/theme-variables.css">
  <link rel="stylesheet" href="${BASE_URL}${template.cssPath}">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${target.width}px;
      height: ${target.height}px;
      overflow: hidden;
      background: transparent;
    }
    :root {
      ${themeVarCss}
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

async function renderTemplateTarget(browser: Browser, target: ScreenshotTarget, themeImageAssignments: Record<string, string>): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
  });

  await page.setContent(buildTemplateDocument(target, themeImageAssignments), {
    waitUntil: 'load',
  });

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(({ selector, width, height }) => {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) return;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.minWidth = `${width}px`;
    element.style.minHeight = `${height}px`;
    element.style.maxWidth = `${width}px`;
    element.style.maxHeight = `${height}px`;
    element.style.overflow = 'hidden';
    element.style.transform = 'none';
    element.style.margin = '0';
  }, {
    selector: target.selector,
    width: target.width,
    height: target.height,
  });

  return page;
}

export async function screenshotAll(outputDir: string, options: ScreenshotOptions = {}): Promise<Record<string, string>> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser: Browser | undefined;
  const results: Record<string, string> = {};
  const templateType = options.templateType ?? 'light-ui';
  const { login: LOGIN_TARGETS, header: HEADER_TARGETS, desktop: DESKTOP_TARGETS } = getScreenshotTargets(templateType);
  const themeImageUrl = options.themeImageUrl ?? process.env.THEME_STUDIO_SCREENSHOT_BG ?? '';
  const themeImageAssignments = buildScreenshotThemeImageAssignments(themeImageUrl);

  try {
    browser = await chromium.launch({ headless: true });

    for (const target of LOGIN_TARGETS) {
      const page = await renderTemplateTarget(browser, target, themeImageAssignments);
      try {
        const filePath = await captureElement(page, target, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
      } finally {
        await page.close();
      }
    }

    for (const target of DESKTOP_TARGETS) {
      const page = await renderTemplateTarget(browser, target, themeImageAssignments);
      try {
        const filePath = await captureElement(page, target, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
      } finally {
        await page.close();
      }
    }

    for (const target of HEADER_TARGETS) {
      const page = await renderTemplateTarget(browser, target, themeImageAssignments);
      try {
        const filePath = await captureElement(page, target, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
      } finally {
        await page.close();
      }
    }

    await generateDerivedImages(outputDir, results);

  } finally {
    await browser?.close();
  }

  return results;
}

async function generateDerivedImages(outputDir: string, results: Record<string, string>): Promise<void> {
  const { execSync } = await import('child_process');

  const derived = [
    { src: 'bg-login', cmd: `convert "${path.join(outputDir, 'bg-login.jpg')}" -crop 1920x1080+147+0 +repage "${path.join(outputDir, 'background.png')}"`, out: 'background.png' },
    { src: 'login_thumb', cmd: `convert "${path.join(outputDir, 'login_thumb.jpg')}" -resize 960x540! "${path.join(outputDir, 'login_thumb.jpg')}"`, out: 'login_thumb.jpg' },
    { src: 'bg-login', cmd: `convert "${path.join(outputDir, 'bg-login.jpg')}" -crop 800x390+0+345 +repage "${path.join(outputDir, 'thumb-1.jpg')}"`, out: 'thumb-1.jpg' },
    { src: 'bg-login', cmd: `convert "${path.join(outputDir, 'bg-login.jpg')}" -crop 800x390+800+345 +repage "${path.join(outputDir, 'thumb-2.jpg')}"`, out: 'thumb-2.jpg' },
    { src: 'desktop', cmd: `convert "${path.join(outputDir, 'desktop.png')}" -resize 1440x800! "${path.join(outputDir, 'desktop-resized.png')}"`, out: 'desktop-resized.png' },
    { src: 'desktop', cmd: `convert "${path.join(outputDir, 'desktop.png')}" -resize 1600x572! "${path.join(outputDir, 'layout-banner.jpg')}"`, out: 'layout-banner.jpg' },
    { src: 'desktop', cmd: `convert "${path.join(outputDir, 'desktop.png')}" -resize 1600x572! "${path.join(outputDir, 'fullscreen-sideheader.jpg')}"`, out: 'fullscreen-sideheader.jpg' },
    { src: 'desktop', cmd: `convert "${path.join(outputDir, 'desktop.png')}" -resize 1600x572! "${path.join(outputDir, 'fullscreen-sidenav.jpg')}"`, out: 'fullscreen-sidenav.jpg' },
    { src: 'desktop', cmd: `convert "${path.join(outputDir, 'desktop.png')}" -resize 1600x572! "${path.join(outputDir, 'center-sidenav.jpg')}"`, out: 'center-sidenav.jpg' },
  ];

  const loginBgDir = path.join(outputDir, 'login_bg');
  if (!fs.existsSync(loginBgDir)) fs.mkdirSync(loginBgDir, { recursive: true });

  for (const item of derived) {
    if (!results[item.src] && !fs.existsSync(path.join(outputDir, item.src.includes('.') ? item.src : `${item.src}.png`))) continue;
    try {
      if (item.out.startsWith('thumb-')) {
        const cmd = item.cmd.replace(`"${path.join(outputDir, 'thumb-')}`, `"${path.join(loginBgDir, 'thumb-')}`);
        execSync(cmd, { stdio: 'pipe' });
      } else {
        execSync(item.cmd, { stdio: 'pipe' });
      }
      console.log(`✅ ${item.out} (derived)`);
    } catch (e) {
      console.warn(`⚠️ ${item.out}: ${(e as Error).message}`);
    }
  }

  if (fs.existsSync(path.join(loginBgDir, 'thumb-1.jpg'))) {
    console.log(`✅ login_bg/thumb-1.jpg, login_bg/thumb-2.jpg`);
  }
}

if (process.argv[1]?.endsWith('screenshot.ts')) {
  const outputDir = process.argv[2] ?? './output/screenshot';
  const themeImageUrl = process.argv[3] ?? process.env.THEME_STUDIO_SCREENSHOT_BG;
  const templateType = (process.argv[4] ?? 'light-ui') as 'light-ui' | 'dark-ui';
  screenshotAll(outputDir, { themeImageUrl, templateType }).then(results => {
    console.log(`\n截图完成: ${Object.keys(results).length} 个文件`);
  }).catch(err => {
    console.error('截图失败:', err);
    process.exit(1);
  });
}
