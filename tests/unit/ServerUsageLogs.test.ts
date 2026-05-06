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

  test('export download route records usage log lifecycle events', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/export-jobs.ts'), 'utf8');

    expect(source).toContain('createUsageLog');
    expect(source).toContain('finalizeUsageLog');
    expect(source).toContain("scene: 'export'");
    expect(source).toContain("router.get('/export-jobs/:id/download'");
  });

  test('usage log helpers expose image-focused overview and trend aggregations', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/usage-logs.ts'), 'utf8');

    expect(source).toContain('export function getUserUsageOverview');
    expect(source).toContain('export function listUsersWithImageUsage');
    expect(source).toContain('export function buildDailyImageTrend');
    expect(source).toContain("scene = 'image'");
    expect(source).toContain('COUNT(*) AS total_image_calls');
    expect(source).toContain('COUNT(DISTINCT user_id) AS active_user_count');
    expect(source).toContain('COUNT(*) AS total_download_count');
  });

  test('admin route exposes image overview endpoint for users table and drawer data', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/usage-logs.ts'), 'utf8');

    expect(source).toContain("router.get('/overview'");
    expect(source).toContain("router.get('/users/:userId'");
    expect(source).toContain('getUserUsageOverview');
    expect(source).toContain('listUsersWithImageUsage');
  });

  test('admin panel shows image-focused overview, sparkline trends and drawer record list', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).not.toContain("onclick=\"switchTab('usage')\"");
    expect(source).toContain('id="userUsageDrawer"');
    expect(source).toContain('id="usageOverviewPanel"');
    expect(source).toContain('id="usageOverviewDownloadCount"');
    expect(source).toContain('id="userUsageCountValue"');
    expect(source).toContain('id="userUsageTrend"');
    expect(source).toContain('id="userDownloadCountValue"');
    expect(source).toContain('id="userUsageRecordList"');
    expect(source).toContain('id="userDownloadRecordList"');
    expect(source).toContain('function renderSparkline(');
    expect(source).toContain('function renderUsageOverview(');
    expect(source).toContain('function renderUserUsageRecords(');
    expect(source).toContain('function renderUserDownloadRecords(');
    expect(source).toContain('title="${escapeHtml(');
    expect(source).toContain('/api/admin/usage-logs/overview');
    expect(source).toContain('async function openUserUsageDrawer(');
    expect(source).toContain('/api/admin/usage-logs/users/');
    expect(source).toContain('查看使用情况');
    expect(source).not.toContain('全站近 7 天生图趋势');
    expect(source).not.toContain('<th>ID</th>');
    expect(source).not.toContain('<th>近 7 天生图趋势</th>');
  });
});
