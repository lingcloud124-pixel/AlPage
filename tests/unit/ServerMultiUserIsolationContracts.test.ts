import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server multi-user isolation contracts', () => {
  test('conversation routes scope list, detail, update, star, and delete operations by user_id', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/routes/conversations.ts'), 'utf8');

    expect(source).toContain('WHERE user_id = ? ORDER BY updated_at DESC');
    expect(source).toContain('WHERE id = ? AND user_id = ?');
    expect(source).toContain('DELETE FROM conversations WHERE id = ? AND user_id = ?');
    expect(source).toContain('UPDATE conversations SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ? AND user_id = ?');
  });

  test('export job APIs only read and mutate jobs through per-user lookups', () => {
    const routeSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/export-jobs.ts'), 'utf8');
    const storeSource = fs.readFileSync(path.join(projectRoot, 'server/src/export-jobs-memory-store.ts'), 'utf8');

    expect(routeSource).toContain('const userId = (req as any).userId as number;');
    expect(routeSource).toContain('getExportJobByIdAndUser(id, userId)');
    expect(storeSource).toContain('SELECT * FROM theme_export_jobs WHERE id = ? AND user_id = ?');
    expect(storeSource).toContain('INSERT INTO theme_export_jobs');
    expect(storeSource).toContain('user_id');
  });

  test('authenticated theme requests are bound to loginName-derived user ids before hitting business routes', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain("app.use('/api/theme', authMiddleware);");
    expect(source).toContain('req.userId = ensureUserByLoginName(loginName);');
    expect(source).toContain("app.use('/api/theme/conversations', conversationsRouter);");
    expect(source).toContain("app.use('/api/theme', exportJobsRouter);");
  });

  test('workspace and portal library routes bind authenticated users before route handlers', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain('function bindAuthenticatedUser');
    expect(source).toContain("app.use('/api/theme/projects', authMiddleware, bindAuthenticatedUser, workspaceRouter);");
    expect(source).toContain("app.use('/api/industry-cases', authMiddleware, bindAuthenticatedUser, industryCasesRouter);");
    expect(source).toContain("app.use('/api/saved-portals', authMiddleware, bindAuthenticatedUser, savedPortalsRouter);");
  });
});
