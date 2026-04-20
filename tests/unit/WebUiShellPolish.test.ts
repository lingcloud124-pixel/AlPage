import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui shell polish', () => {
  test('applies command-panel and task-surface refinements for the xai-style shell', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('backdrop-filter: blur(18px);');
    expect(styles).toContain('max-width: 920px;');
    expect(styles).toContain('letter-spacing: 0.01em;');
    expect(styles).toContain('border-radius: 14px;');
    expect(styles).toContain('backdrop-filter: blur(20px);');
  });
});
