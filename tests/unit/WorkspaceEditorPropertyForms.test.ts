import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readAllCSS } from '../helpers/read-css';

const projectRoot = process.cwd();

describe('workspace editor property forms', () => {
  test('properties drawer renders workspace planning content', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/workspace-configuration.ts'), 'utf8');

    expect(source).toContain('工作区规划');
    expect(source).toContain('门户编辑会自动保存');
    expect(source).toContain('getWorkspaceSummary');
  });

  test('single card properties expose a basic editable title field and size summary', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/components/card-content-configuration.ts'), 'utf8');

    const runtime = fs.readFileSync(path.join(projectRoot, 'web/src/workspace/runtime.ts'), 'utf8');

    expect(source).toContain('workspace-card-title-input');
    expect(runtime).toContain('updateWorkspaceCardInstanceProps');
    expect(runtime).toContain('instanceProps');
    expect(source).toContain('当前尺寸');
  });

  test('property form styles define field groups and compact inputs', () => {
    const css = readAllCSS();

    expect(css).toContain('.workspace-properties-form');
    expect(css).toContain('.workspace-properties-input');
    expect(css).toContain('.workspace-properties-grid');
  });
});
