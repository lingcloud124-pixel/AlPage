import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web preview panel border', () => {
  test('does not render an outer left border on the expanded preview column', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');
    const match = styles.match(/\.preview-panel\.expanded\s*\{([^}]*)\}/);
    expect(match?.[1] || '').not.toContain('border-left');
  });
});
