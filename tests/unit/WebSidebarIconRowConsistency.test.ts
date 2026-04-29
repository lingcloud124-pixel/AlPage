import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar icon row consistency', () => {
  test('makes the expanded collapse row clickable across the full row', () => {
    const sidebarSource = fs.readFileSync(path.join(projectRoot, 'web/src/components/sidebar.ts'), 'utf8');
    expect(sidebarSource).toContain("const headerRow = container?.querySelector('.sidebar-header');");
    expect(sidebarSource).toContain("headerRow?.addEventListener('click', () => toggleSidebar(false));");
  });

  test('aligns collapse, new chat, and settings icon box sizing and row affordance', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(styles).toContain('.sidebar-header .sidebar-icon-btn,');
    expect(styles).toContain('.sidebar-new-chat-full svg,');
    expect(styles).toContain('.sidebar-settings-full svg {');
    expect(styles).toContain('width: 32px;');
    expect(styles).toContain('height: 32px;');
    expect(styles).toContain('padding: 6px;');
    expect(styles).toContain('border-radius: 10px;');
    expect(styles).toContain('box-sizing: border-box;');
    expect(styles).toContain('.sidebar-header:hover {');
    expect(styles).toContain('background-color: #f1f3f7;');
  });
});
