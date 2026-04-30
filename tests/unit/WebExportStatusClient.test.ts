import { describe, expect, test } from 'vitest';

import { buildExportJobStatusUrl, fetchExportJobStatus } from '../../web/src/export/export-status-client';

describe('web export status client', () => {
  test('builds theme export job status URLs from export batch ids', () => {
    expect(buildExportJobStatusUrl('export-123')).toBe('/api/theme/export-jobs/export-123');
  });

  test('loads export job status from the theme export API', async () => {
    const status = await fetchExportJobStatus(async () => new Response(JSON.stringify({
      id: 'export-123',
      status: 'packaging',
      exportDir: '/tmp/export',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }), 'export-123');

    expect(status).toMatchObject({
      id: 'export-123',
      status: 'packaging',
      exportDir: '/tmp/export',
    });
  });
});
