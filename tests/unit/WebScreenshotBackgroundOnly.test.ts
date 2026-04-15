import { describe, expect, test } from 'vitest';

import { buildDerivedImageTasks } from '../../web/scripts/screenshot';

describe('web generated asset contract', () => {
  test('keeps derived output filenames aligned with packaging rules', () => {
    const outputs = buildDerivedImageTasks('/tmp/theme-studio-assets').map((task) => task.outputFile);

    expect(outputs).toContain('/tmp/theme-studio-assets/background.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_thumb.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_bg/thumb-1.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/login_bg/thumb-2.jpg');
    expect(outputs).toContain('/tmp/theme-studio-assets/desktop.png');
    expect(outputs).toContain('/tmp/theme-studio-assets/layout-banner.jpg');
  });
});
