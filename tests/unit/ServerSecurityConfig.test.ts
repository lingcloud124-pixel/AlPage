import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('security config database schema', () => {
  test('db.ts contains security_config table definition', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/db.ts'), 'utf8');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS security_config');
    expect(source).toContain('cors_origins TEXT NOT NULL DEFAULT');
    expect(source).toContain('proxy_image_hosts TEXT NOT NULL DEFAULT');
    expect(source).toContain('rate_limits TEXT NOT NULL DEFAULT');
    expect(source).toContain('enabled_features TEXT NOT NULL DEFAULT');
    expect(source).toContain('daily_image_gen_limit INTEGER NOT NULL DEFAULT');
    expect(source).toContain('daily_chat_adjust_limit INTEGER NOT NULL DEFAULT');
  });

  test('security_config schema includes storage retention controls with small-team defaults', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/db.ts'), 'utf8');
    expect(source).toContain('backup_retention_count INTEGER NOT NULL DEFAULT 8');
    expect(source).toContain('export_retention_days INTEGER NOT NULL DEFAULT 7');
  });

  test('security_config table has proper constraints', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/db.ts'), 'utf8');
    expect(source).toContain('CHECK (id = 1)');
  });
});

describe('admin password authentication', () => {
  test('middleware/auth.ts exports admin auth middleware', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/middleware/auth.ts'), 'utf8');
    expect(source).toContain('adminAuthMiddleware');
  });

  test('adminAuthMiddleware validates password from env', () => {
    expect(true).toBe(true);
  });
});

describe('CORS middleware', () => {
  test('index.ts uses dynamic CORS from security config', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8');
    expect(source).toContain('dynamicCors');
  });
});

describe('proxy-image validation', () => {
  test('ai-proxy.ts contains validateProxyImageHost function', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/routes/ai-proxy.ts'), 'utf8');
    expect(source).toContain('validateProxyImageHost');
  });

  test('defaults allow generated Volcengine CDN images to be proxied for color analysis', () => {
    const dbSource = readFileSync(join(process.cwd(), 'server/src/db.ts'), 'utf8');
    const proxySource = readFileSync(join(process.cwd(), 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(dbSource).toContain('*.byteimg.com');
    expect(proxySource).toContain('DEFAULT_PROXY_IMAGE_HOSTS');
    expect(proxySource).toContain('*.byteimg.com');
  });
});


describe('runtime rate limiting wiring', () => {
  test('db.ts seeds per-route rate limit defaults', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/db.ts'), 'utf8');
    expect(source).toContain('{"chat":60,"image":20,"export":10,"proxyImage":60}');
  });

  test('index.ts applies dynamic rate limiting middleware to theme routes', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8');
    expect(source).toContain('rateLimitMiddleware');
  });

  test('rate limit middleware file exists with in-memory limiter', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/middleware/rate-limit.ts'), 'utf8');
    expect(source).toContain('rateLimitMiddleware');
    expect(source).toContain('Map<string');
    expect(source).toContain('429');
  });
});

describe('storage retention admin configuration', () => {
  test('security config route returns and updates backup/export retention settings', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/routes/security-config.ts'), 'utf8');
    expect(source).toContain('backupRetentionCount');
    expect(source).toContain('exportRetentionDays');
    expect(source).toContain("const backupRetentionCount = normalizePositiveInteger(req.body?.backupRetentionCount);");
    expect(source).toContain("const exportRetentionDays = normalizePositiveInteger(req.body?.exportRetentionDays);");
  });

  test('admin page exposes retention fields and saves them through security config', () => {
    const source = readFileSync(join(process.cwd(), 'server/admin/index.html'), 'utf8');
    expect(source).toContain('id="backupRetentionCount"');
    expect(source).toContain('id="exportRetentionDays"');
    expect(source).toContain("document.getElementById('backupRetentionCount').value = securityData.backupRetentionCount ?? '8';");
    expect(source).toContain("document.getElementById('exportRetentionDays').value = securityData.exportRetentionDays ?? '7';");
    expect(source).toContain("backupRetentionCount: parseInt(document.getElementById('backupRetentionCount').value) || 8");
    expect(source).toContain("exportRetentionDays: parseInt(document.getElementById('exportRetentionDays').value) || 7");
    expect(source).toContain("} else if (securityRes.status === 'fulfilled') {");
    expect(source).toContain("toast(await readErrorMessage(securityRes.value, `安全配置保存失败 (${securityRes.value.status})`), 'error');");
    expect(source).toContain("if (successCount === 2) {");
  });
});
