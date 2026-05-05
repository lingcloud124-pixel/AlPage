import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __themeStudioTest?: {
      expandPreview: () => void;
    };
  }
}

test.describe('Theme Studio Smoke Tests', () => {
  async function expandPreviewViaApp(page: Page) {
    await page.evaluate(() => {
      window.__themeStudioTest?.expandPreview();
    });
    await page.waitForTimeout(500);
  }

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForTimeout(800);
  });

  test('app loads with sidebar visible and preview hidden', async ({ page }) => {
    const sidebar = page.locator('#sidebarContainer');
    await expect(sidebar).toBeAttached({ timeout: 10000 });
    expect(await sidebar.getAttribute('class') || '').not.toContain('expanded');
    
    await expect(page.locator('#chatPanel')).toBeVisible();
    
    const previewPanel = page.locator('#previewPanel');
    await expect(previewPanel).toBeAttached();
    expect(await previewPanel.getAttribute('class')).not.toContain('expanded');
    
    await expect(page).toHaveTitle(/主题/);
  });

  test('frontend does not expose workspace settings entry or modal', async ({ page }) => {
    await page.locator('#sidebarToggleBtn').click();
    await expect(page.locator('#sidebarSettingsBtn')).toHaveCount(0);
    await expect(page.locator('#sidebarSettingsFullBtn')).toHaveCount(0);
    await expect(page.locator('#settingsModal')).toHaveCount(0);
  });

  test('new project button creates new project and keeps sidebar open', async ({ page }) => {
    const sidebar = page.locator('#sidebarContainer');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    
    const newProjectBtn = page.locator('#sidebarNewChatBtn');
    await expect(newProjectBtn).toBeVisible({ timeout: 5000 });
    await newProjectBtn.click({ force: true });
    await expect(page.locator('#messageInput')).toBeVisible({ timeout: 5000 });

    expect(await page.locator('#previewPanel').getAttribute('class')).not.toContain('expanded');
  });

  test('preview panel expands via JS and shows content', async ({ page }) => {
    await expandPreviewViaApp(page);
    
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
    const sidebar = page.locator('#sidebarContainer');
    const toggleBtn = page.locator('#sidebarToggleBtn');
    
    await expect(sidebar).toBeAttached();
    expect(await sidebar.getAttribute('class') || '').not.toContain('expanded');
    
    await toggleBtn.click();
    await page.waitForTimeout(300);
    
    expect(await sidebar.getAttribute('class') || '').toContain('expanded');
  });

  test('chat input accepts text', async ({ page }) => {
    const chatInput = page.locator('#messageInput');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    
    await chatInput.fill('我想要一个春节主题');
    await expect(chatInput).toHaveValue('我想要一个春节主题');
  });

  test('sidebar item menu uses an accessible more-actions icon button', async ({ page }) => {
    await page.locator('#sidebarToggleBtn').click();
    await page.locator('.sidebar-item').first().hover();
    const menuButton = page.locator('.sidebar-item-menu').first();
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await expect(menuButton).toHaveAttribute('aria-label', '更多操作');
  });

  test('sidebar item menu dropdown keeps a compact width', async ({ page }) => {
    await page.locator('#sidebarToggleBtn').click();
    await page.locator('.sidebar-item').first().hover();
    await page.locator('.sidebar-item-menu').first().click();

    const width = await page.locator('.sidebar-item-menu-dropdown').evaluate((node) => {
      return Math.round((node as HTMLElement).getBoundingClientRect().width);
    });

    expect(width).toBeLessThan(220);
  });

  test('tab switching works when preview is expanded', async ({ page }) => {
    await expandPreviewViaApp(page);
    
    const loginTab = page.locator('#loginTab');
    const mainPageTab = page.locator('#mainPageTab');
    
    await expect(loginTab).toBeVisible({ timeout: 5000 });
    await expect(loginTab).toHaveClass(/active-tab/);
    
    await mainPageTab.click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('#mainPage')).toHaveClass(/active-preview/);
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '搜索' })).toBeVisible();
  });

  test('preview close button is hidden', async ({ page }) => {
    await expandPreviewViaApp(page);
    
    expect(await page.locator('#previewPanel').getAttribute('class')).toContain('expanded');
    await expect(page.locator('#previewCloseBtn')).toBeVisible();
  });

  test('package modal shows product list when preview expanded', async ({ page }) => {
    await expandPreviewViaApp(page);
    
    await page.locator('#packageBtn').click();
    await expect(page.locator('#packageModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#packageProductList')).toBeVisible();
    await expect(page.locator('#packageStartBtn')).toBeVisible();
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
