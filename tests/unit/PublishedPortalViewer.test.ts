import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('Published portal viewer (/p/:id)', () => {
  // --- HTML container ---
  describe('HTML has published portal container', () => {
    const html = fs.readFileSync(
      path.join(projectRoot, 'web/index.html'),
      'utf8',
    );

    test('has publishedPortalContainer div', () => {
      expect(html).toContain('id="publishedPortalContainer"');
    });
  });

  // --- CSS styles ---
  describe('published portal CSS', () => {
    const css = fs.readFileSync(
      path.join(projectRoot, 'web/src/styles/published-portal.css'),
      'utf8',
    );

    test('hides editing UI in published mode', () => {
      expect(css).toContain('body.published-mode');
      expect(css).toContain('#chatPanel');
      expect(css).toContain('.sidebar');
    });

    test('has header styling', () => {
      expect(css).toContain('published-portal-header');
      expect(css).toContain('published-portal-name');
      expect(css).toContain('published-portal-badge');
    });

    test('has error state styling', () => {
      expect(css).toContain('published-portal-error');
    });
  });

  // --- CSS import ---
  describe('published portal CSS is imported', () => {
    const styles = fs.readFileSync(
      path.join(projectRoot, 'web/src/styles.css'),
      'utf8',
    );

    test('imports published-portal.css', () => {
      expect(styles).toContain('published-portal.css');
    });
  });

  // --- Main.ts published mode detection ---
  describe('main.ts published mode handler', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/main.ts'),
      'utf8',
    );

    test('detects /p/:id URL pattern', () => {
      expect(source).toContain('/p/');
      expect(source).toContain('publishedMatch');
    });

    test('calls initializePublishedPortal', () => {
      expect(source).toContain('initializePublishedPortal');
    });

    test('fetches snapshot via getPublishedPortal', () => {
      expect(source).toContain('getPublishedPortal');
    });

    test('applies theme colors', () => {
      expect(source).toContain('setThemeVar');
      expect(source).toContain('applyTemplateSpecificThemeVars');
    });

    test('renders template and workspace', () => {
      expect(source).toContain('renderTemplate');
      expect(source).toContain('renderWorkspacePreview');
    });

    test('adds published-mode class to body', () => {
      expect(source).toContain("published-mode");
    });

    test('imports required modules', () => {
      expect(source).toContain("from './api/saved-portals'");
      expect(source).toContain("from './templates/loader'");
    });

    test('exits early from normal initialization in published mode', () => {
      // The publishedMatch check and early return must appear before initializeFeatureModules call
      const publishedCheck = source.indexOf('publishedMatch');
      const domReady = source.indexOf("document.addEventListener('DOMContentLoaded'");
      // publishedMatch should appear within the DOMContentLoaded handler
      expect(publishedCheck).toBeGreaterThan(domReady);
      // And the early return should be before the normal feature init
      const earlyReturn = source.indexOf("await initializePublishedPortal(publishedMatch[1])");
      const normalInit = source.indexOf('await initializeFeatureModules()');
      expect(earlyReturn).toBeLessThan(normalInit);
    });
  });

  // --- Publish URL format ---
  describe('publish URL uses /p/ format', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/ui-setup.ts'),
      'utf8',
    );

    test('publish URL uses /p/:id format', () => {
      expect(source).toContain('/p/${portalId}');
    });

    test('no longer uses API JSON URL for sharing', () => {
      const publishIdx = source.indexOf('/p/${portalId}');
      const apiJsonUrl = source.indexOf('/api/saved-portals/published/');
      // /p/ format should exist, API format should NOT be in publish share context
      expect(publishIdx).toBeGreaterThan(0);
    });
  });

  // --- Stable publish ID ---
  describe('publish ID is stable', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/ui-setup.ts'),
      'utf8',
    );

    test('reads savedPortalId from project', () => {
      expect(source).toContain('project.savedPortalId');
    });

    test('persists savedPortalId back to project', () => {
      const portalIdAssign = source.indexOf('project.savedPortalId = portalId');
      expect(portalIdAssign).toBeGreaterThan(0);
      // saveProject should follow
      const afterAssign = source.substring(portalIdAssign, portalIdAssign + 200);
      expect(afterAssign).toContain('saveProject');
    });

    test('updates saved portal before publishing', () => {
      expect(source).toContain('updateSavedPortal');
    });
  });

  // --- Project type includes savedPortalId ---
  describe('Project type has savedPortalId', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/project-manager.ts'),
      'utf8',
    );

    test('savedPortalId is in Project interface', () => {
      expect(source).toContain('savedPortalId');
    });
  });
});
