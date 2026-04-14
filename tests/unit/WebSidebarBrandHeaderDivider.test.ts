import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar brand header divider', () => {
  test('removes the bottom divider line from the sidebar brand header', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toMatch(/\.sidebar-brand-header\s*\{[^}]*height:\s*52px;[^}]*border-bottom:\s*none;[^}]*\}/s);
  });
});
