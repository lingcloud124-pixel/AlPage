import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../web/node_modules/playwright/index.mjs';

const outDir = path.resolve(process.cwd(), 'output/playwright');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.screenshot({
  path: path.join(outDir, 'release-visual-home.png'),
  fullPage: true,
});

await page.locator('#sidebarToggleBtn').click();
await page.waitForTimeout(300);
const itemCount = await page.locator('.sidebar-item').count();
if (itemCount > 0) {
  await page.locator('.sidebar-item').first().hover();
  await page.locator('.sidebar-item-menu').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, 'release-visual-sidebar-menu.png'),
    fullPage: true,
  });
}

await page.evaluate(() => {
  window.__themeStudioTest?.expandPreview();
});
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(outDir, 'release-visual-expanded-preview.png'),
  fullPage: true,
});

console.log(path.join(outDir, 'release-visual-home.png'));
console.log(path.join(outDir, 'release-visual-sidebar-menu.png'));
console.log(path.join(outDir, 'release-visual-expanded-preview.png'));

await browser.close();
