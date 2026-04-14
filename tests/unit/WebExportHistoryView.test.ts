import { describe, expect, test } from 'vitest';

import { renderExportHistoryHtml } from '../../web/src/export/export-history-view';
import type { ExportBatch } from '../../web/src/types';

const baseBatch: ExportBatch = {
  id: 'export-1',
  createdAt: 1712999999000,
  status: 'queued',
  selectedProducts: ['mk'],
  projectSnapshot: {
    projectId: 'project-1',
    name: '测试主题',
    nameEn: 'project-1',
    templateType: 'light-ui',
    colors: {},
  },
};

describe('web export history view', () => {
  test('renders completed exports with an open-directory action', () => {
    const html = renderExportHistoryHtml([
      {
        ...baseBatch,
        status: 'completed',
        exportDir: '/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959',
      },
    ]);

    expect(html).toContain('已完成');
    expect(html).toContain('打开目录');
    expect(html).toContain('/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959');
  });

  test('renders failed exports with error details when present', () => {
    const html = renderExportHistoryHtml([
      {
        ...baseBatch,
        status: 'failed',
        error: 'verify-build failed',
      },
    ]);

    expect(html).toContain('失败');
    expect(html).toContain('verify-build failed');
  });
});
