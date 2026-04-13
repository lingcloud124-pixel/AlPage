import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { getScreenshotTargets, type ScreenshotTarget } from '../src/export/screenshot-rules';
import { buildScreenshotThemeImageAssignments } from '../src/export/theme-image-overrides';

const BASE_URL = 'http://localhost:5173';

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

async function captureFullSize(page: Page, target: ScreenshotTarget, outputDir: string): Promise<string> {
  const ext = target.format === 'jpeg' ? 'jpg' : 'png';
  const filePath = path.join(outputDir, `${target.outputName}.${ext}`);

  await page.setViewportSize({ width: target.width, height: target.height });

  const clip = target.clipY !== undefined
    ? { x: 0, y: target.clipY, width: target.width, height: target.clipHeight ?? target.height }
    : undefined;

  await page.screenshot({
    path: filePath,
    type: target.format,
    quality: target.format === 'jpeg' ? 95 : undefined,
    clip,
    fullPage: false,
  });

  return filePath;
}

async function applyScreenshotLayout(page: Page, themeImageAssignments: Record<string, string>): Promise<void> {
  await page.evaluate((assignments) => {
    (window as any).expandPreview?.();
    const root = document.getElementById('previewPanel') ?? document.documentElement;

    Object.entries(assignments).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });

    document.body.style.overflow = 'visible';
    const app = document.querySelector('.app-container') as HTMLElement | null;
    if (app) app.style.overflow = 'visible';

    const previewContent = document.querySelector('.preview-content') as HTMLElement | null;
    if (previewContent) {
      previewContent.style.overflow = 'visible';
      previewContent.style.display = 'block';
    }

    const loginPage = document.getElementById('loginPage');
    if (loginPage) {
      loginPage.style.transform = 'none';
      loginPage.style.width = '2215px';
      loginPage.style.height = '1080px';
      loginPage.style.minWidth = '2215px';
      loginPage.style.overflow = 'visible';
      loginPage.style.position = 'relative';
    }
  }, themeImageAssignments);
}

async function normalizeMainPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mainPage = document.getElementById('mainPage');
    if (mainPage) {
      mainPage.style.transform = 'none';
      mainPage.style.width = 'auto';
      mainPage.style.height = 'auto';
      mainPage.style.overflow = 'visible';
    }

    const container = mainPage?.querySelector('.header-variants-container') as HTMLElement | null;
    if (container) {
      container.style.overflow = 'visible';
    }
  });
}

async function selectHeaderVariant(page: Page, templateId: string): Promise<void> {
  await page.selectOption('#headerSelect', templateId);
  await page.waitForTimeout(250);
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
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await applyScreenshotLayout(page, themeImageAssignments);

    await page.waitForTimeout(400);

    await page.setViewportSize({ width: 2215, height: 1080 });

    for (const target of LOGIN_TARGETS) {
      try {
        const filePath = await captureFullSize(page, { ...target, width: 2215, height: 1080 }, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
      }
    }

    await page.click('#mainPageTab', { force: true });
    await page.waitForTimeout(300);
    await normalizeMainPage(page);

    for (const target of DESKTOP_TARGETS) {
      try {
        const filePath = await captureElement(page, target, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
      }
    }

    for (const target of HEADER_TARGETS) {
      try {
        if (target.templateId) {
          await selectHeaderVariant(page, target.templateId);
          await normalizeMainPage(page);
        }
        const filePath = await captureElement(page, target, outputDir);
        results[target.outputName] = filePath;
        console.log(`✅ ${target.outputName}: ${path.basename(filePath)}`);
      } catch (e) {
        console.error(`❌ ${target.outputName}: ${(e as Error).message}`);
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
