import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar footer spacing', () => {
  test('tightens the expanded sidebar footer shell and settings button padding', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const bottomBlock = [...styles.matchAll(/\.sidebar-bottom\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';
    const settingsBlock = [...styles.matchAll(/\.sidebar-settings-full\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';

    expect(bottomBlock).toContain('padding: 0;');
    expect(settingsBlock).toContain('padding: 8px 12px 0 5px;');
  });
});
