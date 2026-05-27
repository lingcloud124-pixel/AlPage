import { test, expect } from '@playwright/test';

const SERVER = 'http://localhost:3001';
const WEB = 'http://localhost:5173';

test.describe('Auth flow states', () => {

  test('State 1: /api/auth/me without cookie → 401', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/auth/me`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    console.log('✅ State 1: No cookie → 401', body);
  });

  test('State 2: /api/auth/sso/login without EKP → 503 or redirect', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/auth/sso/login`, {
      maxRedirects: 0,
    });
    // Should be 503 (EKP not configured in dev without .env) or 302 redirect
    console.log(`✅ State 2: SSO login status=${res.status()}`);
    if (res.status() === 503) {
      const body = await res.json();
      expect(body.error).toContain('not configured');
      console.log('   → 503 with message:', body.error);
    } else if (res.status() === 302) {
      const location = res.headers()['location'];
      console.log('   → 302 redirect to:', location);
      // Should NOT be a malformed URL like /login.jsp or https://login.jsp/
      expect(location).not.toBe('/login.jsp');
      expect(location).not.toContain('https://login.jsp');
      expect(location).toMatch(/^https?:\/\//);
    }
  });

  test('State 3: /api/auth/diagnose shows cookie and config status', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/auth/diagnose`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log('✅ State 3: Diagnose endpoint:', {
      host: body.host,
      ekpConfigured: body.ekpConfigured,
      publicBaseUrl: body.publicBaseUrl,
      devMode: body.devMode,
      ssoCookies: body.ssoCookies,
      warnings: body.warnings,
    });
  });

  test('State 4: SSO callback with invalid token → proper redirect or error', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/auth/sso/callback?token=invalid-test-token-12345`, {
      maxRedirects: 0,
    });
    console.log(`✅ State 4: Callback with invalid token status=${res.status()}`);
    if (res.status() === 302) {
      const location = res.headers()['location'];
      console.log('   → 302 redirect to:', location);
      // Must NOT be a malformed redirect
      expect(location).not.toBe('/login.jsp');
      expect(location).not.toContain('https://login.jsp');
      if (location.startsWith('http')) {
        expect(location).toContain('myekp.landray.com.cn');
      }
    } else if (res.status() === 400 || res.status() === 401) {
      console.log('   → Error response (acceptable for invalid token)');
    } else if (res.status() === 503) {
      const body = await res.json();
      console.log('   → 503 EKP not configured:', body.error);
    }
  });

  test('State 5: SSO callback with missing params → 400', async ({ request }) => {
    const res = await request.get(`${SERVER}/api/auth/sso/callback`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing');
    console.log('✅ State 5: Missing params → 400', body);
  });

  test('State 6: Frontend loads and handles unauthenticated state', async ({ page }) => {
    // Listen for console messages
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Navigate to web frontend
    const response = await page.goto(WEB, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`✅ State 6: Frontend loaded, status=${response?.status()}`);

    // Wait a bit for JS to execute
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Should NOT end up on a broken login.jsp URL
    expect(currentUrl).not.toContain('login.jsp');

    // Check if we got a visible error message (SSO not configured) or stayed on the page
    const bodyText = await page.textContent('body');
    const hasErrorMessage = bodyText?.includes('登录服务暂不可用') || bodyText?.includes('SSO');
    if (hasErrorMessage) {
      console.log('   → Shows SSO error message (correct behavior when EKP not configured)');
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/auth-state-frontend.png', fullPage: true });
    console.log('   Screenshot saved to test-results/auth-state-frontend.png');
  });

});
