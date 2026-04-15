import { describe, expect, test } from 'vitest';

import { buildDerivedImageTasks } from '../../web/scripts/screenshot';

describe('web screenshot derived assets', () => {
  test('uses packaging-aligned final filenames for derived assets', () => {
    const tasks = buildDerivedImageTasks('/tmp/theme-studio-assets');
    const outputs = tasks.map((task) => task.outputFile);

    expect(outputs).toContain('/tmp/theme-studio-assets/background.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_thumb.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_bg/thumb-1.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_bg/thumb-2.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/desktop.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/layout-banner.jpg');
    expect(outputs).not.toContain('/tmp/theme-studio-assets/desktop-resized.png');
  });
});
