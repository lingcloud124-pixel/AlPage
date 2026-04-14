import { describe, expect, test } from 'vitest';

import { buildRuntimeOptionsFromExportJob } from '../../web/scripts/export-bridge';
import { buildExportJobRequest } from '../../web/src/export/export-job';
import type { Project } from '../../web/src/project-manager';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-runtime',
    name: '运行时测试',
    themeName: '运行时主题',
    templateType: 'dark-ui',
    colors: {
      'primary-color': '#2C615C',
      'header-font-color': '#333333',
    },
    bgImageUrl: 'https://example.com/bg.png',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('web export bridge runtime', () => {
  test('converts export jobs into build runtime options', () => {
    const request = buildExportJobRequest({
      project: createProject(),
      selectedProducts: ['mk', 'ekp_v17'],
      cssVariables: {
        'primary-color': '#2C615C',
        'header-font-color': '#333333',
      },
      exportRoot: '/Users/demo/Documents/Theme Studio',
      now: 1712999999000,
    });

    const runtime = buildRuntimeOptionsFromExportJob(request);

    expect(runtime).toMatchObject({
      name: '运行时主题',
      nameEn: 'project-runtime-project',
      templateType: 'dark-ui',
      themeColor: '#2C615C',
      themeImageUrl: 'https://example.com/bg.png',
      selectedProducts: ['mk', 'ekp_v17'],
      exportDir: '/Users/demo/Documents/Theme Studio/projects/project-runtime-project/exports/20240413-091959',
    });
  });
});
