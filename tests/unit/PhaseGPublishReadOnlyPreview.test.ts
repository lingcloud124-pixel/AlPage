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

    test('getPublishedPortal does not send credentials', () => {
      const fnStart = apiSource.indexOf('export async function getPublishedPortal');
      const fnBlock = apiSource.substring(fnStart, fnStart + 500);
      expect(fnBlock).not.toContain('credentials');
    });
  });

  // --- HTML ---
  describe('publish button is enabled', () => {
    const html = fs.readFileSync(
      path.join(projectRoot, 'web/index.html'),
      'utf8',
    );

    test('publish button is not disabled', () => {
      const btnIdx = html.indexOf('resultPublishBtn');
      const btnBlock = html.substring(btnIdx - 20, btnIdx + 120);
      expect(btnBlock).not.toContain('disabled');
    });

    test('publish button has title', () => {
      expect(html).toContain('发布为只读预览链接');
    });
  });
});
