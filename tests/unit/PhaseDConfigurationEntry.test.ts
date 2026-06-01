import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('Phase D: theme and workspace configuration entry', () => {
  // --- HTML structure ---
  describe('HTML has config panel entries', () => {
    const html = fs.readFileSync(
      path.join(projectRoot, 'web/index.html'),
      'utf8',
    );

    test('has theme tab in config panel tabs', () => {
      expect(html).toContain('data-tab="theme"');
      expect(html).toContain('主题配置');
    });

    test('has layout tab in config panel tabs', () => {
      expect(html).toContain('data-tab="layout"');
    });

    test('has publish button', () => {
      expect(html).toContain('id="resultPublishBtn"');
      expect(html).toContain('发布为只读预览链接');
    });

    test('publish button is in workspace result actions', () => {
      const publishIdx = html.indexOf('resultPublishBtn');
      const actionsIdx = html.indexOf('workspaceResultActions');
      expect(publishIdx).toBeGreaterThan(actionsIdx);
    });
  });

  // --- theme-configuration.ts ---
  describe('theme configuration component', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/theme-configuration.ts'),
      'utf8',
    );

    test('exports renderThemeConfiguration', () => {
      expect(source).toContain('export async function renderThemeConfiguration');
    });

    test('has logo upload area', () => {
      expect(source).toContain('themeConfigLogoArea');
      expect(source).toContain('themeConfigLogoInput');
    });

    test('logo is always editable (no toggle)', () => {
      expect(source).toContain('Logo');
      expect(source).not.toContain('logoEditable');
      expect(source).not.toContain('showLogoToggle');
    });

    test('has customer name input', () => {
      expect(source).toContain('themeConfigCustomerName');
    });

    test('has header style select', () => {
      expect(source).toContain('themeConfigHeaderStyle');
      expect(source).toContain('standard');
      expect(source).toContain('compact');
      expect(source).toContain('extended');
    });

    test('has template type select', () => {
      expect(source).toContain('themeConfigTemplateType');
      expect(source).toContain('light-ui');
      expect(source).toContain('dark-ui');
    });

    test('saves to project data', () => {
      expect(source).toContain('saveProject(project)');
    });

    test('refreshes preview after save', () => {
      expect(source).toContain('renderWorkspacePreview');
    });

    test('handles logo delete', () => {
      expect(source).toContain('themeConfigLogoDeleteBtn');
      expect(source).toContain("applyLogoToProject(project, '')");
    });
  });

  // --- workspace-configuration.ts ---
  describe('workspace configuration is editable', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/workspace-configuration.ts'),
      'utf8',
    );

    test('has editable layout parameters', () => {
      expect(source).toContain('wsConfigColumns');
      expect(source).toContain('wsConfigRowHeight');
      expect(source).toContain('wsConfigGapX');
      expect(source).toContain('wsConfigGapY');
    });

    test('has padding controls', () => {
      expect(source).toContain('wsConfigPaddingX');
      expect(source).toContain('wsConfigPaddingY');
    });

    test('has save button', () => {
      expect(source).toContain('wsConfigSaveBtn');
    });

    test('validates ranges', () => {
      expect(source).toContain('Math.max(2, Math.min(12, columns))');
      expect(source).toContain('Math.max(16, Math.min(80, rowHeight))');
    });

    test('saves project and refreshes preview', () => {
      expect(source).toContain('saveProject(project)');
      expect(source).toContain('renderWorkspacePreview');
    });
  });

  // --- runtime.ts integration ---
  describe('runtime.ts wires theme tab', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/workspace/runtime.ts'),
      'utf8',
    );

    test('imports renderThemeConfiguration', () => {
      expect(source).toContain('renderThemeConfiguration');
      expect(source).toContain('theme-configuration');
    });

    test('ConfigPanelTab includes theme', () => {
      const tabLine = source.match(/type ConfigPanelTab = [^;]+/)?.[0];
      expect(tabLine).toContain("'theme'");
    });

    test('renderConfigPanelContent handles theme tab', () => {
      const fnStart = source.indexOf('function renderConfigPanelContent');
      const fnBlock = source.substring(fnStart, fnStart + 600);
      expect(fnBlock).toContain("'theme'");
      expect(fnBlock).toContain('renderThemeConfiguration');
    });

    test('WorkspacePropertiesPanelMode includes theme', () => {
      const modeLine = source.match(/type WorkspacePropertiesPanelMode = [^;]+/)?.[0];
      expect(modeLine).toContain("'theme'");
    });
  });
});
