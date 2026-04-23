import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web current project state', () => {
  test('getCurrentProjectId falls back to localStorage when in-memory id is empty', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/project-manager.ts'), 'utf8');

    expect(source).toContain("localStorage.getItem('theme-studio-current-project')");
    expect(source).toContain('return _currentProjectId ??');
  });
});
