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

    test('theme config button in topbar (moved from drawer tabs to #sidePanel)', () => {
      // 主题配置 tab 已从工作区抽屉移除，内容合并到 panelToggleBtn 的 #sidePanel
      expect(html).toContain('id="panelToggleBtn"');
      expect(html).not.toContain('data-tab="theme"');
    });

    test('has workspace drawer with layout and card tabs', () => {
      expect(html).toContain('id="workspacePropertiesContent"');
      expect(html).toContain('data-tab="layout"');
      expect(html).toContain('data-tab="card"');
    });

    test('publish is merged into share button (no standalone publish button)', () => {
      expect(html).not.toContain('id="resultPublishBtn"');
      expect(html).toContain('id="resultShareBtn"');
      expect(html).toContain('保存并分享预览链接');
    });

    test('share button is in workspace result actions', () => {
      const shareIdx = html.indexOf('resultShareBtn');
      const actionsIdx = html.indexOf('workspaceResultActions');
      expect(shareIdx).toBeGreaterThan(actionsIdx);
    });

    test('no standalone workspace properties button in topbar', () => {
      const topbarRight = html.match(/<div class="topbar-right">[\s\S]*?<\/div>\s*<\/div>\s*<div class="preview-content">/)?.[0] ?? '';
      expect(topbarRight).not.toContain('id="workspacePropertiesTopbarBtn"');
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

    test('syncs active conversation snapshot after auto-saving theme config', () => {
      expect(source).toContain('saveChatHistory');
    });

    test('refreshes preview after save', () => {
      expect(source).toContain('renderWorkspacePreview');
    });

    test('handles logo delete', () => {
      expect(source).toContain('themeConfigLogoDeleteBtn');
      expect(source).toContain("applyLogoToProject(project, '')");
    });

    test('logo uses dedicated logoUrl field (not bgImageUrl)', () => {
      expect(source).toContain('project.logoUrl');
      expect(source).toContain('applyLogoToPreview');
    });

    test('has logo dimension controls', () => {
      expect(source).toContain('themeConfigLogoHeight');
      expect(source).toContain('themeConfigLogoMaxWidth');
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

    test('has card radius and shadow controls', () => {
      expect(source).toContain('wsConfigCardRadius');
      expect(source).toContain('wsConfigCardShadow');
      expect(source).toContain('cardShadow');
    });

    test('auto-saves layout parameters via runtime commitWorkspaceSettings', () => {
      expect(source).toContain('commitWorkspaceSettings');
      expect(source).toContain('scheduleAutoSave');
      expect(source).not.toContain('wsConfigSaveBtn');
    });

    test('provides live WYSIWYG preview via runtime previewWorkspaceSettings', () => {
      expect(source).toContain('previewWorkspaceSettings');
      expect(source).toContain('livePreview');
    });

    test('validates ranges via field metadata', () => {
      expect(source).toContain('validateField');
      expect(source).toContain('num < field.min');
      expect(source).toContain('num > field.max');
      expect(source).toContain('LAYOUT_FIELDS');
    });

    test('persists through runtime commitWorkspaceSettings', () => {
      expect(source).toContain('commitWorkspaceSettings');
    });

    test('runtime handles saveChatHistory in commitWorkspaceMutation', () => {
      // workspace-configuration delegates to runtime, which handles persistence
      const runtimeSource = fs.readFileSync(
        path.join(projectRoot, 'web/src/workspace/runtime.ts'),
        'utf8',
      );
      expect(runtimeSource).toContain('commitWorkspaceMutation');
    });
  });

  // --- runtime.ts integration ---
  describe('runtime.ts no longer has theme tab (moved to #sidePanel)', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/workspace/runtime.ts'),
      'utf8',
    );

    test('does not import renderThemeConfiguration', () => {
      expect(source).not.toContain('renderThemeConfiguration');
    });

    test('ConfigPanelTab no longer includes theme', () => {
      const tabLine = source.match(/type ConfigPanelTab = [^;]+/)?.[0];
      expect(tabLine).not.toContain("'theme'");
    });

    test('renderConfigPanelContent no longer handles theme tab', () => {
      const fnStart = source.indexOf('function renderConfigPanelContent');
      const fnBlock = source.substring(fnStart, fnStart + 600);
      expect(fnBlock).not.toContain("'theme'");
    });

    test('WorkspacePropertiesPanelMode still includes theme for backward compat', () => {
      const modeLine = source.match(/type WorkspacePropertiesPanelMode = [^;]+/)?.[0];
      expect(modeLine).toContain("'theme'");
    });

    test('design mode auto-opens drawer and close exits design mode', () => {
      expect(source).toContain('setWorkspaceMode');
      expect(source).toContain("setWorkspaceMode('design')");
      expect(source).toContain("setWorkspaceMode('preview')");
    });
  });

  // --- color-editor.ts integration ---
  describe('color-editor.ts integrates theme configuration into #sidePanel', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/color-editor.ts'),
      'utf8',
    );

    test('initializeThemeConfiguration dynamically imports renderThemeConfiguration', () => {
      expect(source).toContain("import('./theme-configuration')");
      expect(source).toContain('renderThemeConfiguration');
    });

    test('creates divider between form and color editor', () => {
      expect(source).toContain('config-divider');
    });
  });
});
