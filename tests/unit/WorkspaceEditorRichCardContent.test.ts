import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor rich card content', () => {
  test('runtime renders richer card content builders for the first four templates', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('renderTodoCardContent');
    expect(source).toContain('renderNewsCardContent');
    expect(source).toContain('renderScheduleCardContent');
    expect(source).toContain('renderQuickAccessCardContent');
    expect(source).toContain('renderWorkspaceCardContent');
  });

  test('styles define richer content patterns for card lists, hero blocks and quick links', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-card-list');
    expect(css).toContain('.workspace-card-news-hero');
    expect(css).toContain('.workspace-card-quick-links');
    expect(css).toContain('.workspace-card-schedule-item');
  });
});
