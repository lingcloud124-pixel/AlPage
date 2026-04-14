import { describe, expect, test } from 'vitest';

import { openExportDirectory } from '../../web/src/export/export-open-client';

describe('web export open client', () => {
  test('posts the selected export directory to the local export API bridge', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    const opened = await openExportDirectory(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }, '/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959');

    expect(opened).toBe(true);
    expect(String(calls[0].input)).toBe('/api/export/open');
    expect(calls[0].init?.method).toBe('POST');
    expect(String(calls[0].init?.body)).toContain('/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959');
  });
});
