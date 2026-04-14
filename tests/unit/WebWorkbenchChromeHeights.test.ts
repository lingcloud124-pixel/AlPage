import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web workbench chrome heights', () => {
  test('locks brand header, chat header, settings button presence, and topbar tab scoping', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-brand-header');
    expect(styles).toContain('height: 52px;');
    expect(styles).toContain('.chat-header');
    expect(styles).toContain('height: 70px;');
    expect(styles).toContain('.sidebar-settings-btn');
    expect(styles).toContain('.topbar-tabs');
    expect(styles).toContain('.tab-btn');
    expect(styles).toContain('.topbar-tabs .tab-indicator');
  });
});
