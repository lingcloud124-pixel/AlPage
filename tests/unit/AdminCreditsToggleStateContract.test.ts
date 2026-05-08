import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('admin credits toggle state contract', () => {
  test('credits toggle uses explicit state sync helpers when reading and writing quota state', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'server/admin/index.html'), 'utf8');

    expect(html).toContain('function getCreditsLimitEnabled()');
    expect(html).toContain('function syncCreditsToggleUi(enabled)');
    expect(html).toContain('onclick="event.preventDefault(); toggleCreditsSettings();"');
    expect(html).toContain('quota: getCreditsLimitEnabled(),');
    expect(html).toContain('syncCreditsToggleUi(creditsEnabled);');
  });
});
