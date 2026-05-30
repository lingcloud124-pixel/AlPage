import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor phase 1 contracts', () => {
  test('web types define workspace settings and item structures', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/types.ts'), 'utf8');

    expect(source).toContain('export interface WorkspaceSettings');
    expect(source).toContain('columns: number;');
    expect(source).toContain('gapX: number;');
    expect(source).toContain('gapY: number;');
    expect(source).toContain('paddingX: number;');
    expect(source).toContain('paddingY: number;');
    expect(source).toContain('export interface WorkspaceItem');
    expect(source).toContain('templateId: string;');
    expect(source).toContain('instanceProps?: Record<string, unknown>;');
    expect(source).toContain('export interface WorkspaceConfig');
    expect(source).toContain('settings: WorkspaceSettings;');
    expect(source).toContain('items: WorkspaceItem[];');
  });

  test('project manager persists workspace state and standard four-card starter layout', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/project-manager.ts'), 'utf8');

    expect(source).toContain('workspace?: WorkspaceConfig;');
    expect(source).toContain('export const DEFAULT_WORKSPACE_ITEMS');
    expect(source).toContain("templateId: 'message-todo'");
    expect(source).toContain("templateId: 'news-carousel'");
    expect(source).toContain("templateId: 'my-schedule'");
    expect(source).toContain("templateId: 'quick-access'");
    expect(source).toContain('settings: DEFAULT_WORKSPACE_SETTINGS');
  });

  test('database schema includes card templates, categories and project workspace tables', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(source).toContain('CREATE TABLE IF NOT EXISTS card_template_categories');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS card_templates');
    expect(source).toContain('default_props TEXT NOT NULL DEFAULT');
    expect(source).toContain('preview_image_url TEXT NOT NULL DEFAULT');
    expect(source).toContain('configurable INTEGER NOT NULL DEFAULT 1');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS project_workspaces');
    expect(source).toContain('workspace_settings TEXT NOT NULL DEFAULT');
    expect(source).toContain('workspace_items TEXT NOT NULL DEFAULT');
  });

  test('server mounts workspace editor routes for templates and project workspaces', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/index.ts'), 'utf8');

    expect(source).toContain("import('./routes/card-templates.js')");
    expect(source).toContain("import('./routes/workspace.js')");
    expect(source).toContain("app.use('/api/card-templates', authMiddleware, cardTemplatesRouter);");
    expect(source).toContain("app.use('/api/theme/projects', authMiddleware, workspaceRouter);");
  });

  test('admin panel exposes a card library tab with template preview thumbnails', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain(`onclick="switchTab('card-library')"`);
    expect(source).toContain('id="tab-card-library"');
    expect(source).toContain('id="cardLibraryGrid"');
    expect(source).toContain('id="cardLibraryCategoryFilter"');
    expect(source).toContain('id="cardLibrarySearchInput"');
    expect(source).toContain('class="card-library-preview-thumb"');
    expect(source).toContain('function renderCardLibraryTemplates(');
  });
});
