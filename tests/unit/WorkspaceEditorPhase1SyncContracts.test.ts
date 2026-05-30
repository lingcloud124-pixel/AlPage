import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor phase 1 sync contracts', () => {
  test('database seeds the default categories and starter templates for the four-card portal layout', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/src/db.ts'), 'utf8');

    expect(source).toContain('INSERT OR IGNORE INTO card_template_categories');
    expect(source).toContain("'基础门户'");
    expect(source).toContain('INSERT OR IGNORE INTO card_templates');
    expect(source).toContain("'message-todo'");
    expect(source).toContain("'news-carousel'");
    expect(source).toContain("'my-schedule'");
    expect(source).toContain("'quick-access'");
  });

  test('workspace store uses local-first persistence and server sync helpers', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/store.ts'), 'utf8');

    expect(source).toContain('theme-studio-workspace-');
    expect(source).toContain('localStorage.getItem');
    expect(source).toContain('localStorage.setItem');
    expect(source).toContain('fetchProjectWorkspace');
    expect(source).toContain('initializeProjectWorkspace');
    expect(source).toContain('updateProjectWorkspaceItems');
    expect(source).toContain('updateProjectWorkspaceSettings');
    expect(source).toContain('syncWorkspaceToServer');
  });

  test('workspace api client exposes initialize, fetch and update calls', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/api/workspace.ts'), 'utf8');

    expect(source).toContain("resolveApiUrl('/api/theme/projects')");
    expect(source).toContain('export async function initializeProjectWorkspace');
    expect(source).toContain('export async function fetchProjectWorkspace');
    expect(source).toContain('export async function updateProjectWorkspaceSettings');
    expect(source).toContain('export async function updateProjectWorkspaceItems');
  });

  test('main boot flow hydrates project workspace when restoring a project', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain("from './workspace/store'");
    expect(source).toContain('ensureProjectWorkspaceReady');
    expect(source).toContain('await ensureProjectWorkspaceReady(project.id');
  });
});
