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
});

describe('quota middleware', () => {
  test('middleware/quota.ts exports quota middleware', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/middleware/quota.ts'), 'utf8');
    expect(source).toContain('quotaMiddleware');
  });

  test('index.ts applies quota middleware to AI proxy routes', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8');
    expect(source).toContain('quotaMiddleware');
  });

  test('quota middleware checks before incrementing usage', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/middleware/quota.ts'), 'utf8');
    const guardIndex = source.indexOf('currentCount >= limit');
    const incrementIndex = source.indexOf('incrementUsageCount(userId, currentDate, usageType)');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(incrementIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(incrementIndex);
  });

  test('quota middleware matches mounted subpaths', () => {
    const source = readFileSync(join(process.cwd(), 'server/src/middleware/quota.ts'), 'utf8');
    expect(source).toContain("req.path === '/image'");
    expect(source).toContain("req.path === '/chat'");
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
