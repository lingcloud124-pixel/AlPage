import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web new project flow', () => {
  test('creates a project directly from the sidebar button without invoking the old dialog flow', () => {
    const main = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');
    const projectManager = fs.readFileSync(path.join(projectRoot, 'web/src/project-manager.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(main).not.toContain('showNewProjectDialog');
    expect(main).toContain("createProject('未命名项目', 'light-ui')");
    expect(projectManager).not.toContain('export function showNewProjectDialog');
    expect(styles).toContain('.sidebar-new-btn');
  });
});
