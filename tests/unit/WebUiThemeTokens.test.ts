import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui theme tokens', () => {
  test('defines xai-inspired shell tokens for the workbench chrome', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('--app-bg: #111318;');
    expect(styles).toContain('--surface-0: #161920;');
    expect(styles).toContain('--surface-1: #1a1d25;');
    expect(styles).toContain('--surface-2: #1f2228;');
    expect(styles).toContain('--text-primary: #F5F5F5;');
    expect(styles).toContain('--text-secondary: rgba(255,255,255,0.68);');
    expect(styles).toContain('--text-muted: rgba(255,255,255,0.42);');
    expect(styles).toContain('--border-subtle: rgba(255,255,255,0.10);');
    expect(styles).toContain('--border-strong: rgba(255,255,255,0.18);');
    expect(styles).toContain('--surface-btn: rgba(255,255,255,0.04);');
  });
});
