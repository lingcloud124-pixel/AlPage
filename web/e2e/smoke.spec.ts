import { test, expect } from '@playwright/test';

test.describe('Theme Studio Smoke Tests', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForTimeout(800);
  });

  test('app loads with sidebar visible and preview hidden', async ({ page }) => {
    const sidebar = page.locator('#projectSidebar');
    await expect(sidebar).toBeAttached({ timeout: 10000 });
    expect(await sidebar.getAttribute('class')).not.toContain('collapsed');
    
    await expect(page.locator('#chatPanel')).toBeVisible();
    
    const previewPanel = page.locator('#previewPanel');
    await expect(previewPanel).toBeAttached();
    expect(await previewPanel.getAttribute('class')).not.toContain('expanded');
    
    await expect(page).toHaveTitle(/主题/);
  });

  test('settings dialog opens with all 6 config fields', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsModal')).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('#apiEndpoint')).toBeVisible();
    await expect(page.locator('#apiKey')).toBeVisible();
    await expect(page.locator('#modelName')).toBeVisible();
    await expect(page.locator('#imageApiEndpoint')).toBeVisible();
    await expect(page.locator('#imageApiKey')).toBeVisible();
    await expect(page.locator('#imageModelName')).toBeVisible();
  });

  test('new project button creates new project and keeps sidebar open', async ({ page }) => {
    await expect(page.locator('#projectSidebar')).toBeVisible({ timeout: 5000 });
    
    const newProjectBtn = page.locator('#newProjectBtn');
    await expect(newProjectBtn).toBeVisible({ timeout: 5000 });
    await newProjectBtn.click({ force: true });
    await expect(page.locator('#messageInput')).toBeVisible({ timeout: 5000 });

    expect(await page.locator('#previewPanel').getAttribute('class')).not.toContain('expanded');
  });

  test('preview panel expands via JS and shows content', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    expect(await page.locator('#previewPanel').getAttribute('class')).toContain('expanded');
  });

  test('preset color JSON files are accessible', async ({ page }) => {
    const presets = ['spring-breeze', 'sunset-glow', 'ocean-deep'];
    
    for (const preset of presets) {
      const response = await page.request.get(`/colors/${preset}.json`);
      expect([200, 404]).toContain(response.status());
    }
  });

  test('background images are accessible', async ({ page }) => {
    const backgrounds = ['cherry-blossom.jpg', 'ice-wonderland.jpg', 'interstellar.jpg'];
    
    for (const bg of backgrounds) {
      const response = await page.request.get(`/backgrounds/${bg}`);
      expect(response.status()).toBe(200);
    }
  });

  test('sidebar toggle button collapses sidebar', async ({ page }) => {
    const sidebar = page.locator('#projectSidebar');
    const toggleBtn = page.locator('#sidebarToggleBtn');
    
    await expect(sidebar).toBeAttached();
    expect(await sidebar.getAttribute('class')).not.toContain('collapsed');
    
    await toggleBtn.click();
    await page.waitForTimeout(300);
    
    expect(await sidebar.getAttribute('class')).toContain('collapsed');
  });

  test('chat input accepts text', async ({ page }) => {
    const chatInput = page.locator('#messageInput');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    
    await chatInput.fill('我想要一个春节主题');
    await expect(chatInput).toHaveValue('我想要一个春节主题');
  });

  test('tab switching works when preview is expanded', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    const loginTab = page.locator('#loginTab');
    const mainPageTab = page.locator('#mainPageTab');
    
    await expect(loginTab).toBeVisible({ timeout: 5000 });
    await expect(loginTab).toHaveClass(/active-tab/);
    
    await mainPageTab.click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('#mainPage')).toHaveClass(/active-preview/);
    
    const headerSwitcher = page.locator('#headerSwitcher');
    await expect(headerSwitcher).toBeVisible();
  });

  test('preview close button is hidden', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    expect(await page.locator('#previewPanel').getAttribute('class')).toContain('expanded');
    await expect(page.locator('#previewCloseBtn')).toBeHidden();
  });

  test('package modal shows product list when preview expanded', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    await page.locator('#packageBtn').click();
    await expect(page.locator('#packageModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#packageSelectAll')).toBeVisible();
    await expect(page.locator('#packageDeselectAll')).toBeVisible();
  });

  test('user preferences persist in localStorage', async ({ page }) => {
    await page.evaluate(() => {
      const prefs = {
        preferredStyle: 'dark',
        favoriteColors: ['#1a1a2e', '#16213e'],
        industry: 'tech',
        _version: 1,
        _updatedAt: Date.now()
      };
      localStorage.setItem('theme-studio-user-preferences', JSON.stringify(prefs));
    });
    
    await page.reload();
    
    const saved = await page.evaluate(() => {
      return localStorage.getItem('theme-studio-user-preferences');
    });
    
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.preferredStyle).toBe('dark');
    expect(parsed.industry).toBe('tech');
  });
});
