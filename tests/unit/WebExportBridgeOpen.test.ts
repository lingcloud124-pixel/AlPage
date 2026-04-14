import { afterEach, describe, expect, test } from 'vitest';

import { createExportBridgeServer } from '../../web/scripts/export-bridge';

const servers: Array<{ close: () => void }> = [];
afterEach(() => {
  while (servers.length) servers.pop()?.close();
});

describe('web export bridge open endpoint', () => {
  test('opens an export directory through the local bridge endpoint', async () => {
    const opened: string[] = [];
    const server = createExportBridgeServer(undefined, async (targetPath) => {
      opened.push(targetPath);
    });
    server.listen(0, '127.0.0.1');
    servers.push(server);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test server address');

    const response = await fetch(`http://127.0.0.1:${address.port}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959' }),
    });

    expect(response.status).toBe(200);
    expect(opened).toEqual(['/tmp/theme-studio-exports/projects/project-1/exports/20240413-091959']);
  });
});
