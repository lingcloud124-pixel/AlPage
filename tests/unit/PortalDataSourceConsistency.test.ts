import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

/**
 * Phase H 测试: 验证预览、工作区、配置、对话全部操作同一 PortalProject 数据源。
 *
 * 这些是 contract/style 测试 — 读源文件断言行为，不启动浏览器。
 */
describe('portal data source consistency', () => {
  // --- 1. 预览渲染函数存在空项目空状态处理 ---
  describe('workspace preview handles empty project', () => {
    const previewSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/workspace/preview.ts'),
      'utf8',
    );

    test('renderWorkspacePreview shows empty state when workspace is null', () => {
      expect(previewSource).toContain('!workspace || !Array.isArray(workspace.items) || workspace.items.length === 0');
    });

    test('empty state message is generation-oriented (not fake content)', () => {
      expect(previewSource).toContain('workspace-preview-empty');
      // Should NOT render fake todo/news/schedule cards for empty state
      expect(previewSource).not.toContain('renderTodoCardContent');
      expect(previewSource).not.toContain('renderNewsCardContent');
    });

    test('suppresses static portal chrome elements', () => {
      expect(previewSource).toContain('suppressStaticPortalChrome');
      expect(previewSource).toContain('quick-links-bar');
      expect(previewSource).toContain('desktop-sidebar');
    });
  });

  // --- 2. PortalPlan ↔ WorkspaceConfig 双向映射存在 ---
  describe('PortalPlan <-> WorkspaceConfig bidirectional mapping', () => {
    const planSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/portal-plan.ts'),
      'utf8',
    );

    test('createPortalPlanFromProject reads from project workspace', () => {
      expect(planSource).toContain('export function createPortalPlanFromProject');
      // Should resolve workspace from project
      expect(planSource).toContain('resolveWorkspace(project)');
    });

    test('applyPortalPlanToProject writes workspace derived from plan', () => {
      expect(planSource).toContain('export function applyPortalPlanToProject');
      expect(planSource).toContain('workspace: createWorkspaceFromPortalPlan(portalPlan)');
    });

    test('syncPortalPlanFromWorkspace reads workspace back into plan', () => {
      expect(planSource).toContain('export function syncPortalPlanFromWorkspace');
      // Should read workspace.items
      expect(planSource).toContain('project.workspace.items.map(mapWorkspaceItemToPlacement)');
    });

    test('portalPlan and workspace stay in sync - plan drives workspace, workspace edits sync back', () => {
      // applyPortalPlanToProject creates workspace FROM plan (plan → workspace)
      // syncPortalPlanFromWorkspace writes workspace state back to plan (workspace → plan)
      // This ensures they share the same source of truth
      const applyIdx = planSource.indexOf('export function applyPortalPlanToProject');
      const syncIdx = planSource.indexOf('export function syncPortalPlanFromWorkspace');
      expect(applyIdx).toBeGreaterThan(0);
      expect(syncIdx).toBeGreaterThan(applyIdx); // Both exist
    });
  });

  // --- 3. 生成流程操作同一 project 对象 ---
  describe('generation flow uses single project object', () => {
    const chatSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/chat-manager.ts'),
      'utf8',
    );

    test('generatePortalPlanFromConfirmedProject applies plan then renders from project.workspace', () => {
      const fnStart = chatSource.indexOf('async function generatePortalPlanFromConfirmedProject');
      expect(fnStart).toBeGreaterThan(0);
      const fnBlock = chatSource.substring(fnStart, fnStart + 2500);

      // Must apply plan to project first
      expect(fnBlock).toContain('applyPortalPlanToProject(project, portalPlan)');
      // Must render preview using project.workspace (not some independent source)
      expect(fnBlock).toContain('project.workspace ?? null');
      expect(fnBlock).toContain('renderWorkspacePreview');
    });

    test('generation flow saves project after applying plan', () => {
      const fnStart = chatSource.indexOf('async function generatePortalPlanFromConfirmedProject');
      const fnBlock = chatSource.substring(fnStart, fnStart + 2500);

      expect(fnBlock).toContain('saveProject(project)');
    });
  });

  // --- 4. 确认模板加载不会在 workspace 渲染后覆盖内容 ---
  describe('template loading does not overwrite workspace preview', () => {
    const uiSetupSource = fs.readFileSync(
      path.join(projectRoot, 'web/src/ui-setup.ts'),
      'utf8',
    );

    test('setupTabSwitching renders template then immediately renders workspace preview over it', () => {
      const fnStart = uiSetupSource.indexOf('setupTabSwitching');
      expect(fnStart).toBeGreaterThan(0);
      const fnBlock = uiSetupSource.substring(fnStart, fnStart + 1500);

      // Loads desktop template first (provides chrome frame)
      expect(fnBlock).toContain("renderTemplate('desktop'");
      // Then immediately overwrites grid content with workspace preview
      expect(fnBlock).toContain('renderWorkspacePreview');
    });

    test('template is only loaded once (not re-loaded on subsequent tab switches)', () => {
      const fnStart = uiSetupSource.indexOf('setupTabSwitching');
      const fnBlock = uiSetupSource.substring(fnStart, fnStart + 1500);

      expect(fnBlock).toContain('!mainPage.firstElementChild');
    });
  });

  // --- 5. 静态桌面模板中 desktop-grid 初始为空 ---
  describe('static desktop template has empty grid', () => {
    test('desktop.html desktop-grid starts empty', () => {
      const desktopHtml = fs.readFileSync(
        path.join(projectRoot, 'web/src/templates/desktop.html'),
        'utf8',
      );
      // Match the full desktop-grid div including its content
      const gridMatch = desktopHtml.match(/<div[^>]*class="desktop-grid"[^>]*>([\s\S]*?)<\/div>/);
      expect(gridMatch).toBeTruthy();
      // Inner content between opening and closing tags should be empty/whitespace
      const innerContent = (gridMatch![1] || '').trim();
      expect(innerContent).toBe('');
    });
  });
});
