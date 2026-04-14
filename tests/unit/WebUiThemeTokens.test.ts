import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web ui theme tokens', () => {
  test('defines xai-inspired shell tokens for the workbench chrome', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('--app-bg: #0A0A0A;');
    expect(styles).toContain('--surface-0: #111111;');
    expect(styles).toContain('--surface-1: #151515;');
    expect(styles).toContain('--surface-2: #1A1A1A;');
    expect(styles).toContain('--text-primary: #F5F5F5;');
    expect(styles).toContain('--text-secondary: rgba(255,255,255,0.68);');
    expect(styles).toContain('--text-muted: rgba(255,255,255,0.42);');
    expect(styles).toContain('--border-subtle: rgba(255,255,255,0.10);');
    expect(styles).toContain('--border-strong: rgba(255,255,255,0.18);');
  });
});
