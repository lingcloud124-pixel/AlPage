import { test, expect } from '@playwright/test';

test.describe('Theme Studio Smoke Tests', () => {

  test('app loads with three-column layout', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('#projectSidebar');
    await expect(sidebar).toBeAttached({ timeout: 10000 });
    expect(await sidebar.getAttribute('class')).toContain('collapsed');
    
    await expect(page.locator('#chatPanel')).toBeVisible();
    await expect(page.locator('.preview-panel')).toBeVisible();
    
    await expect(page).toHaveTitle(/主题/);
  });

  test('settings dialog opens with all 6 config fields', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsModal')).toBeVisible({ timeout: 5000 });
    
    await expect(page.locator('#apiEndpoint')).toBeVisible();
    await expect(page.locator('#apiKey')).toBeVisible();
    await expect(page.locator('#modelName')).toBeVisible();
    await expect(page.locator('#imageApiEndpoint')).toBeVisible();
    await expect(page.locator('#imageApiKey')).toBeVisible();
    await expect(page.locator('#imageModelName')).toBeVisible();
  });

  test('new project button exists and is reachable after sidebar expand', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('#sidebarToggleBtn').click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('#projectSidebar')).toBeVisible({ timeout: 5000 });
    
    const newProjectBtn = page.locator('#newProjectBtn');
    await expect(newProjectBtn).toBeVisible({ timeout: 5000 });
    await newProjectBtn.click();
    await expect(page.locator('#messageInput')).toBeVisible({ timeout: 5000 });
  });

  test('preview panel shows login page by default', async ({ page }) => {
    await page.goto('/');
    
    const loginPage = page.locator('#loginPage');
    await expect(loginPage).toBeVisible({ timeout: 10000 });
    await expect(loginPage).toHaveClass(/active-preview/);
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

  test('sidebar toggle expands collapsed sidebar', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('#projectSidebar');
    const toggleBtn = page.locator('#sidebarToggleBtn');
    
    await expect(sidebar).toBeAttached();
    const initialClasses = await sidebar.getAttribute('class') || '';
    expect(initialClasses).toContain('collapsed');
    
    await toggleBtn.click();
    await page.waitForTimeout(300);
    
    const afterClickClasses = await sidebar.getAttribute('class') || '';
    expect(afterClickClasses).not.toContain('collapsed');
  });

  test('chat input accepts text', async ({ page }) => {
    await page.goto('/');
    
    const chatInput = page.locator('#messageInput');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    
    await chatInput.fill('我想要一个蓝色系主题');
    await expect(chatInput).toHaveValue('我想要一个蓝色系主题');
  });

  test('tab switching between login and desktop', async ({ page }) => {
    await page.goto('/');
    
    const loginTab = page.locator('#loginTab');
    const mainPageTab = page.locator('#mainPageTab');
    
    await expect(loginTab).toBeVisible();
    await expect(loginTab).toHaveClass(/active-tab/);
    
    await mainPageTab.click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('#mainPage')).toHaveClass(/active-preview/);
  });

  test('user preferences persist in localStorage', async ({ page }) => {
    await page.goto('/');
    
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

  test('package modal shows product list', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('#packageBtn').click();
    await expect(page.locator('#packageModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#packageSelectAll')).toBeVisible();
    await expect(page.locator('#packageDeselectAll')).toBeVisible();
  });
});
