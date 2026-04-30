import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar doubao style', () => {
  test('uses the softer doubao-like sidebar surface, divider, button, and list item spacing', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('background-color: #f7f7fa;');
    expect(styles).toContain('border-right: 0.5px solid #e6e7eb;');
    expect(styles).toContain('padding: 12px;');
    expect(styles).toContain('margin: 8px 0 0;');
    expect(styles).toContain('padding: 8px 12px;');
    expect(styles).toContain('background: #eef4ff;');
    expect(styles).toContain('border: 0.5px solid #dbe7ff;');
    expect(styles).toContain('padding: 4px 0 0;');
    expect(styles).toContain('padding: 6px 0 0;');
    expect(styles).toContain('border-radius: 10px;');
    expect(styles).toContain('background-color: #f1f3f7;');
  });
});
