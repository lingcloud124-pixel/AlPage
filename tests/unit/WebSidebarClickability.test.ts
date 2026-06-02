import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('sidebar clickability layering', () => {
  test('keeps expanded navigation above adjacent panes and accepts pointer events', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');
    const sidebarBlock = styles.match(/\.sidebar\s*\{([^}]*)\}/)?.[1] || '';
    const expandedBlock = styles.match(/\.sidebar\.expanded\s*\{([^}]*)\}/)?.[1] || '';
    const listBlock = styles.match(/\.sidebar-list\s*\{([^}]*)\}/)?.[1] || '';

    expect(sidebarBlock).toContain('position: relative;');
    expect(sidebarBlock).toContain('z-index: 120;');
    expect(sidebarBlock).toContain('pointer-events: auto;');
    expect(expandedBlock).toContain('z-index: 120;');
    expect(listBlock).toContain('pointer-events: auto;');
  });
});
