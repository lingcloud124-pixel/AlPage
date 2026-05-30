import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('workspace editor phase 1 creation contracts', () => {
  test('project creation flow ensures workspace initialization for fresh projects and presets', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/project-manager.ts'), 'utf8');

    expect(source).toContain("from './workspace/store'");
    expect(source).toContain('await ensureProjectWorkspaceReady(newProject.id, newProject.workspace);');
    expect(source).toContain('createProjectWithPreset');
  });

  test('workspace module exposes skeleton entry points for runtime, registry and design mode', () => {
    const files = [
      'web/src/workspace/index.ts',
      'web/src/workspace/runtime.ts',
      'web/src/workspace/registry.ts',
      'web/src/workspace/design-mode.ts',
    ];

    for (const relativePath of files) {
      const absolutePath = path.join(projectRoot, relativePath);
      expect(fs.existsSync(absolutePath)).toBe(true);
      const source = fs.readFileSync(absolutePath, 'utf8');
      expect(source.length).toBeGreaterThan(0);
    }
  });

  test('admin authenticate flow loads card library data immediately after successful login', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(source).toContain('async function authenticateAdmin()');
    expect(source).toContain('loadCardLibrary();');
    expect(source).toContain('fetch(\'/api/card-templates\'');
  });
});
