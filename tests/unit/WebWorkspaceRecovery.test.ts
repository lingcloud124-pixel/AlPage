import { describe, expect, test } from 'vitest';

import type { Project } from '../../web/src/project-manager';
import { pickFallbackWorkspaceProject } from '../../web/src/workspace-recovery';

function createProject(id: string): Project {
  return {
    id,
    name: `项目-${id}`,
    templateType: 'light-ui',
    colors: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('web workspace recovery', () => {
  test('switches to another available project when the stored project id is stale', async () => {
    const recovery = await pickFallbackWorkspaceProject('missing-project', {
      listProjects: async () => [createProject('project-1'), createProject('project-2')],
      createProject: async () => createProject('created-project'),
    });

    expect(recovery.reason).toBe('fallback');
    expect(recovery.project?.id).toBe('project-1');
  });

  test('creates a fresh project when no fallback project exists', async () => {
    const recovery = await pickFallbackWorkspaceProject('missing-project', {
      listProjects: async () => [],
      createProject: async () => createProject('created-project'),
    });

    expect(recovery.reason).toBe('created');
    expect(recovery.project?.id).toBe('created-project');
  });
});
