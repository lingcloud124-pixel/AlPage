import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

describe('PortalPlan type contracts', () => {
  test('types.ts exports PortalPlan and its three editable layers', () => {
    const source = read('web/src/types.ts');

    expect(source).toContain('export type PortalPlanStatus');
    expect(source).toContain("'collecting'");
    expect(source).toContain("'summary_pending'");
    expect(source).toContain("'generated'");
    expect(source).toContain("'editing'");
    expect(source).toContain("'saved'");

    expect(source).toContain('export interface PortalEnterpriseProfile');
    expect(source).toContain('export interface PortalThemeLayer');
    expect(source).toContain('export interface PortalWorkspaceRuleLayer');
    expect(source).toContain('export interface PortalCardContentLayer');
    expect(source).toContain('export interface PortalEditHistoryItem');
    expect(source).toContain('export interface PortalRegion');
    expect(source).toContain('export interface PortalCardPlacement');
    expect(source).toContain('export interface PortalCardContent');

    expect(source).toContain('export interface PortalPlan');
    expect(source).toContain('id: string');
    expect(source).toContain('status: PortalPlanStatus');
    expect(source).toContain('createdAt: number');
    expect(source).toContain('updatedAt: number');
    expect(source).toContain('enterpriseProfile: PortalEnterpriseProfile');
    expect(source).toContain('themeLayer: PortalThemeLayer');
    expect(source).toContain('workspaceRuleLayer: PortalWorkspaceRuleLayer');
    expect(source).toContain('cardContentLayer: PortalCardContentLayer');
    expect(source).toContain('editHistory: PortalEditHistoryItem[]');
  });

  test('project model can hold the active PortalPlan and status', () => {
    const source = read('web/src/project-manager.ts');

    expect(source).toContain('PortalPlan');
    expect(source).toContain('PortalPlanStatus');
    expect(source).toContain('portalPlan?: PortalPlan');
    expect(source).toContain('portalPlanStatus?: PortalPlanStatus');
  });

  test('saving a portal result marks the active PortalPlan as saved', () => {
    const source = read('web/src/project-manager.ts');
    const saveFn = source.match(/export function markPortalResultSaved\(project: Project\): Project \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(saveFn).toContain("portalPlanStatus: 'saved'");
    expect(saveFn).toContain("status: 'saved'");
    expect(saveFn).toContain('project.portalPlan');
  });
});
