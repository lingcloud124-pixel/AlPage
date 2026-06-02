import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar icon row consistency', () => {
  test('toggle button toggles expanded state based on current state', () => {
    const sidebarSource = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');
    expect(sidebarSource).toContain("classList.contains('expanded')");
    expect(sidebarSource).toContain("toggleSidebar(!isExpanded)");
  });

  test('new chat icon and full button share consistent sizing', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');

    expect(styles).toContain('.sidebar-new-chat-full svg,');
    expect(styles).toContain('width: 32px;');
    expect(styles).toContain('height: 32px;');
    expect(styles).toContain('padding: 6px;');
    expect(styles).toContain('border-radius: 10px;');
    expect(styles).toContain('box-sizing: border-box;');
  });
});
