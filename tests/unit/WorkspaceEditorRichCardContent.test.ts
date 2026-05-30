import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor rich card content', () => {
  test('shared card renderer provides richer card content builders for the first four templates', () => {
    const rendererSource = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/card-renderer.ts'), 'utf8');
    const runtimeSource = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(rendererSource).toContain('renderTodoCardContent');
    expect(rendererSource).toContain('renderNewsCardContent');
    expect(rendererSource).toContain('renderScheduleCardContent');
    expect(rendererSource).toContain('renderQuickAccessCardContent');
    expect(rendererSource).toContain('renderWorkspaceCardContent');
    expect(runtimeSource).toContain('renderWorkspaceCardShell');
  });

  test('styles define richer content patterns for card lists, hero blocks and quick links', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-card-list');
    expect(css).toContain('.workspace-card-news-hero');
    expect(css).toContain('.workspace-card-quick-links');
    expect(css).toContain('.workspace-card-schedule-item');
  });
});
