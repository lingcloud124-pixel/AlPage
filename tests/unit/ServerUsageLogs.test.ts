import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server usage logs', () => {
  test('database schema includes usage_logs table and audit fields', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(source).toContain('CREATE TABLE IF NOT EXISTS usage_logs');
    expect(source).toContain('raw_input TEXT NOT NULL DEFAULT');
    expect(source).toContain('final_prompt TEXT NOT NULL DEFAULT');
    expect(source).toContain('model_provider TEXT NOT NULL DEFAULT');
    expect(source).toContain('model_name TEXT NOT NULL DEFAULT');
    expect(source).toContain('credits_cost INTEGER NOT NULL DEFAULT 0');
    expect(source).toContain('duration_ms INTEGER NOT NULL DEFAULT 0');
    expect(source).toContain('status TEXT NOT NULL DEFAULT');
  });

  test('server mounts an admin usage logs route', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain("import('./routes/usage-logs.js')");
    expect(source).toContain("app.use('/api/admin/usage-logs', adminAuthMiddleware, usageLogsRouter);");
  });

  test('chat and image routes record usage log lifecycle events', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/ai-proxy.ts'), 'utf8');

    expect(source).toContain('createUsageLog');
    expect(source).toContain('finalizeUsageLog');
    expect(source).toContain("scene: 'chat'");
    expect(source).toContain("scene: 'image'");
  });

  test('usage log helpers expose per-user summary and recent logs for drawer details', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/usage-logs.ts'), 'utf8');

    expect(source).toContain('export function getUserUsageDetails');
    expect(source).toContain('COUNT(*) AS total_calls');
    expect(source).toContain('COALESCE(SUM(credits_cost), 0) AS total_credits_cost');
    expect(source).toContain('MAX(started_at) AS latest_started_at');
    expect(source).toContain("WHERE user_id = ? AND scene IN ('chat', 'image')");
  });

  test('admin route exposes per-user usage detail endpoint for drawer data', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/usage-logs.ts'), 'utf8');

    expect(source).toContain("router.get('/users/:userId'");
    expect(source).toContain('getUserUsageDetails');
  });

  test('admin panel exposes user drawer instead of top-level usage tab', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).not.toContain("onclick=\"switchTab('usage')\"");
    expect(source).toContain('id="userUsageDrawer"');
    expect(source).toContain('id="userUsageSummary"');
    expect(source).toContain('id="userUsageLogTableBody"');
    expect(source).toContain('async function openUserUsageDrawer(');
    expect(source).toContain('/api/admin/usage-logs/users/');
    expect(source).toContain('查看使用情况');
  });
});
