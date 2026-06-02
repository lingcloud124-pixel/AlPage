import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('Phase G: publish read-only preview link', () => {
  // --- DB schema ---
  describe('database has published snapshot columns', () => {
    const dbSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/db.ts'),
      'utf8',
    );

    test('has published_snapshot column migration', () => {
      expect(dbSource).toContain('ALTER TABLE saved_portals ADD COLUMN published_snapshot');
    });

    test('has published_at column migration', () => {
      expect(dbSource).toContain('ALTER TABLE saved_portals ADD COLUMN published_at');
    });

    test('has project_snapshot column migration for full portal recovery', () => {
      expect(dbSource).toContain('ALTER TABLE saved_portals ADD COLUMN project_snapshot');
    });
  });

  // --- Server routes ---
  describe('server has publish and published endpoints', () => {
    const routeSource = fs.readFileSync(
      path.join(projectRoot, 'server/src/routes/saved-portals.ts'),
      'utf8',
    );

    test('has POST /:id/publish endpoint', () => {
      expect(routeSource).toContain('/:id/publish');
      expect(routeSource).toContain('published_snapshot');
    });

    test('publish sets status to published', () => {
      const publishIdx = routeSource.indexOf('/:id/publish');
      const publishBlock = routeSource.substring(publishIdx, publishIdx + 2000);
      expect(publishBlock).toContain('published');
      expect(publishBlock).toContain("status = ");
    });

    test('has GET /published/:id endpoint (no auth)', () => {
      expect(routeSource).toContain('/published/:id');
    });

    test('published endpoint returns snapshot data', () => {
      const publishedIdx = routeSource.indexOf('/published/:id');
      const publishedBlock = routeSource.substring(publishedIdx, publishedIdx + 2000);
      expect(publishedBlock).toContain('colors');
      expect(publishedBlock).toContain('workspace');
      expect(publishedBlock).toContain('portalPlan');
    });

    test('published endpoint does not require userId', () => {
      const publishedIdx = routeSource.indexOf("savedPortalsRouter.get('/published/:id'");
      const publishedBlock = routeSource.substring(publishedIdx, publishedIdx + 1000);
      // The published GET handler itself should not check userId for public access
      expect(publishedBlock).not.toContain('user_id');
    });

    test('snapshot is a JSON with templateType, colors, workspace, portalPlan', () => {
      const publishIdx = routeSource.indexOf('/:id/publish');
      const publishBlock = routeSource.substring(publishIdx, publishIdx + 2000);
      expect(publishBlock).toContain('JSON.stringify');
      expect(publishBlock).toContain('templateType');
      expect(publishBlock).toContain('colors');
      expect(publishBlock).toContain('workspace');
      expect(publishBlock).toContain('portalPlan');
    });

    test('save and update persist full projectSnapshot', () => {
      expect(routeSource).toContain('projectSnapshot');
      expect(routeSource).toContain('project_snapshot');
    });
  });

  // --- Frontend API ---
  describe('frontend API has publish functions', () => {
    const apiSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/api/saved-portals.ts'),
      'utf8',
    );

    test('has publishSavedPortal function', () => {
      expect(apiSource).toContain('export async function publishSavedPortal');
    });

    test('has getPublishedPortal function', () => {
      expect(apiSource).toContain('export async function getPublishedPortal');
    });

    test('create and update APIs accept full projectSnapshot', () => {
      expect(apiSource).toContain('projectSnapshot');
    });

    test('getPublishedPortal does not send credentials', () => {
      const fnStart = apiSource.indexOf('export async function getPublishedPortal');
      const fnBlock = apiSource.substring(fnStart, fnStart + 500);
      expect(fnBlock).not.toContain('credentials');
    });
  });

  // --- HTML ---
  describe('publish is merged into share button', () => {
    const html = fs.readFileSync(
      path.join(projectRoot, 'web/index.html'),
      'utf8',
    );

    test('standalone publish button removed', () => {
      expect(html).not.toContain('resultPublishBtn');
    });

    test('share button exists and handles publish', () => {
      expect(html).toContain('resultShareBtn');
      expect(html).toContain('保存并分享预览链接');
    });
  });
});
