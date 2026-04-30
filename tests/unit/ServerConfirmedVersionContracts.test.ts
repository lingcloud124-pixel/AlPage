import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('server confirmed version contracts', () => {
  test('registers a confirmed versions route and export jobs require confirmedVersionId', () => {
    const indexSource = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');
    const exportJobsSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/export-jobs.ts'), 'utf8');
    const routeSource = fs.readFileSync(path.join(projectRoot, 'server/src/routes/confirmed-versions.ts'), 'utf8');

    expect(indexSource).toContain("import('./routes/confirmed-versions.js')");
    expect(indexSource).toContain('confirmedVersionsRouter');
    expect(exportJobsSource).toContain('confirmedVersionId');
    expect(exportJobsSource).not.toContain('projectSnapshot and selectedProducts are required');
    expect(routeSource).toContain("router.post('/projects/:projectId/confirmed-versions'");
    expect(routeSource).toContain("router.get('/projects/:projectId/confirmed-versions'");
  });
});
