import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor view shell', () => {
  test('preview panel exposes a workspace design mode switch and editor shell container', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="workspacePreviewModeBtn"');
    expect(html).toContain('id="workspaceDesignModeBtn"');
    expect(html).toContain('id="workspaceEditorView"');
    expect(html).toContain('id="workspaceEditorAddBtn"');
    expect(html).toContain('id="workspaceEditorPropertiesBtn"');
    expect(html).toContain('id="workspaceCardCanvas"');
  });

  test('styles define workspace editor toolbar, canvas and static card shell sections', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-mode-switch');
    expect(css).toContain('.workspace-editor-view');
    expect(css).toContain('.workspace-editor-toolbar');
    expect(css).toContain('.workspace-card-canvas');
    expect(css).toContain('.workspace-editor-card');
    expect(css).toContain('.workspace-editor-card-header');
    expect(css).toContain('.workspace-editor-card-content');
  });

  test('runtime renders the four starter cards into a static editor canvas', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('export function renderWorkspaceEditorShell');
    expect(source).toContain('workspaceCardCanvas');
    expect(source).toContain('message-todo');
    expect(source).toContain('news-carousel');
    expect(source).toContain('my-schedule');
    expect(source).toContain('quick-access');
  });

  test('main boot wires workspace design mode toggle and shell rendering', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('setupWorkspaceEditorShell');
    expect(source).toContain('renderWorkspaceEditorShell');
    expect(source).toContain('ensureProjectWorkspaceReady');
  });
});
