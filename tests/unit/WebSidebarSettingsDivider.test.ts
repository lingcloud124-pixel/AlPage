import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar settings divider', () => {
  test('uses a single divider treatment above the settings button instead of overlapping lines', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-settings-btn');
    expect(styles).not.toContain('.sidebar-settings-btn::before');
  });
});
