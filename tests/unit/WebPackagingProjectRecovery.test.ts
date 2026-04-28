import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web packaging project recovery', () => {
  test('packaging flow recreates a missing current project from the workspace state before exporting', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');

    expect(source).toContain('async function ensureProjectForPackaging()');
    expect(source).toContain("const createdProject = await createProject(projectTitle, 'light-ui');");
    expect(source).toContain('setCurrentProjectId(createdProject.id);');
    expect(source).toContain('const project = await ensureProjectForPackaging();');
  });

  test('package buttons use overwriting handlers so hot reload does not keep stale listeners', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/package-manager.ts'), 'utf8');

    expect(source).toContain('packageBtn.onclick = showPackageModal;');
    expect(source).toContain('startBtn.onclick = startPackagingProcess;');
    expect(source).toContain('closeBtn.onclick = closePackageModal;');
    expect(source).toContain('cancelBtn.onclick = closePackageModal;');
  });
});
