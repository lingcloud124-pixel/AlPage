import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor modal shell', () => {
  test('workspace editor html exposes add modal and properties drawer shells', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="workspaceCardLibraryModal"');
    expect(html).toContain('id="workspaceCardLibraryCloseBtn"');
    expect(html).toContain('id="workspaceCardLibraryList"');
    expect(html).toContain('id="workspacePropertiesDrawer"');
    expect(html).toContain('id="workspacePropertiesDrawerCloseBtn"');
    expect(html).toContain('id="workspacePropertiesContent"');
  });

  test('workspace editor styles define modal and drawer presentation', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-card-library-modal');
    expect(css).toContain('.workspace-card-library-grid');
    expect(css).toContain('.workspace-card-library-item');
    expect(css).toContain('.workspace-properties-drawer');
    expect(css).toContain('.workspace-properties-section');
    expect(css).toContain('.workspace-editor-card.is-selected');
  });

  test('card template api client exposes list operation for workspace add modal', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/api/card-templates.ts'), 'utf8');

    expect(source).toContain("resolveApiUrl('/api/card-templates')");
    expect(source).toContain('export async function listCardTemplates');
  });

  test('runtime opens card library modal, fetches templates and switches properties context', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('selectedWorkspaceCardId');
    expect(source).toContain('openWorkspaceCardLibrary');
    expect(source).toContain('openWorkspacePropertiesDrawer');
    expect(source).toContain('renderWorkspacePropertyPanel');
    expect(source).toContain('listCardTemplates');
    expect(source).toContain('workspacePropertiesDrawer');
    expect(source).toContain('workspaceCardLibraryModal');
    expect(source).toContain('renderWorkspacePlanningView');
    expect(source).toContain('renderCardContentConfiguration');
  });
});
