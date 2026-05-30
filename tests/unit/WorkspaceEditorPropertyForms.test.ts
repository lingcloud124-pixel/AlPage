import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor property forms', () => {
  test('properties drawer renders editable global layout controls', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('workspace-setting-columns');
    expect(source).toContain('workspace-setting-gapX');
    expect(source).toContain('workspace-setting-gapY');
    expect(source).toContain('workspace-setting-paddingX');
    expect(source).toContain('workspace-setting-paddingY');
    expect(source).toContain('updateWorkspaceSettings');
  });

  test('single card properties expose a basic editable title field and size summary', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('workspace-card-title-input');
    expect(source).toContain('updateWorkspaceCardInstanceProps');
    expect(source).toContain('instanceProps');
    expect(source).toContain('当前尺寸');
  });

  test('property form styles define field groups and compact inputs', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-properties-form');
    expect(css).toContain('.workspace-properties-input');
    expect(css).toContain('.workspace-properties-grid');
  });
});
