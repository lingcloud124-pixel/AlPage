import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('web sidebar header style', () => {
  test('toggle button has vertical margin for spacing', () => {
    const styles = fs.readFileSync(path.join(projectRoot, 'web/src/styles/sidebar.css'), 'utf8');
    const matches = [...styles.matchAll(/#sidebarToggleBtn\s*\{([^}]*)\}/g)];
    const activeBlock = matches[matches.length - 1]?.[1] || '';

    expect(activeBlock).toContain('margin-top: 16px;');
    expect(activeBlock).toContain('margin-bottom: 16px;');
  });

  test('sidebar uses single-element expand/collapse without header wrapper', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');
    expect(html).not.toContain('sidebarCollapsed');
    expect(html).not.toContain('sidebarExpanded');
    expect(html).not.toContain('sidebarCollapseBtn');
  });
});
