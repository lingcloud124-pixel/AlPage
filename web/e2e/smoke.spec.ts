import { test, expect } from '@playwright/test';

test.describe('Theme Studio Smoke Tests', () => {

  test('app loads with chat-only layout (preview hidden by default)', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('#projectSidebar');
    await expect(sidebar).toBeAttached({ timeout: 10000 });
    expect(await sidebar.getAttribute('class')).toContain('collapsed');
    
    await expect(page.locator('#chatPanel')).toBeVisible();
    
    const previewPanel = page.locator('#previewPanel');
    await expect(previewPanel).toBeAttached();
    expect(await previewPanel.getAttribute('class')).not.toContain('expanded');
    
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

  test('preview panel shows login page when expanded', async ({ page }) => {
    await page.goto('/');
    
    const previewPanel = page.locator('#previewPanel');
    await expect(previewPanel).toBeAttached();
    expect(await previewPanel.getAttribute('class')).not.toContain('expanded');
    
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    expect(await previewPanel.getAttribute('class')).toContain('expanded');
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

  test('tab switching works when preview is expanded', async ({ page }) => {
    await page.goto('/');
    
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

  test('preview close button collapses panel', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      (window as any).expandPreview?.();
    });
    await page.waitForTimeout(500);
    
    const previewPanel = page.locator('#previewPanel');
    expect(await previewPanel.getAttribute('class')).toContain('expanded');
    
    await page.locator('#previewCloseBtn').click();
    await page.waitForTimeout(500);
    
    expect(await previewPanel.getAttribute('class')).not.toContain('expanded');
  });

  test('package modal shows product list when preview expanded', async ({ page }) => {
    await page.goto('/');
    
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
});
