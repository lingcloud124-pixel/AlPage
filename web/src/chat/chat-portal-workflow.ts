/**
 * chat-portal-workflow.ts
 *
 * Portal Agent 工作流相关函数：客户画像提取、摘要构建、工作区同步。
 * 从 chat-manager.ts 拆分而来。
 */

import type { Project } from '../project-manager';
import type { PortalCustomerProfile } from '../types';
import {
  mergePortalProfile,
  extractPortalProfileFromMessage,
  didPortalProfileChange,
  buildPortalSummary,
  buildPortalDraft,
  getPortalWorkflowState,
} from '../portal-agent';
import {
  loadProject,
  saveProject,
  getCurrentProjectId,
  applyPortalDraftToProject,
  updateProjectNameDisplay,
} from '../project-manager';
import {
  setPortalPlanStatus,
  applyPortalPlanToProject,
  createPortalPlanFromProject,
} from '../portal-plan';
import { persistWorkspaceToLocal, syncWorkspaceToServer } from '../workspace/store';
import {
  renderWorkspaceEditorShell,
  ensureWorkspaceTemplateCache,
  getWorkspaceTemplateCache,
} from '../workspace/runtime';
import { renderWorkspacePreview } from '../workspace/preview';

// ---------------------------------------------------------------------------
// Portal profile patch detection
// ---------------------------------------------------------------------------

export function hasPortalProfilePatch(patch: Partial<PortalCustomerProfile>): boolean {
  return Object.values(patch).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}

// ---------------------------------------------------------------------------
// Workspace snapshot sync
// ---------------------------------------------------------------------------

export async function syncProjectWorkspaceSnapshot(project: Project): Promise<void> {
  if (!project.workspace) return;
  persistWorkspaceToLocal(project.id, project.workspace);
  await syncWorkspaceToServer(project.id, project.workspace);
}

// ---------------------------------------------------------------------------
// Needs-driven workspace
// ---------------------------------------------------------------------------

export async function ensureNeedsDrivenWorkspace(project: Project): Promise<Project> {
  if (!project.portalProfile) return project;
  if (project.workspace?.meta?.source !== 'default' && project.portalPlanStatus === 'editing') return project;

  const portalSummary = project.portalSummary ?? buildPortalSummary(project.portalProfile);
  const portalDraft = buildPortalDraft(portalSummary);
  Object.assign(project, applyPortalDraftToProject(project, portalDraft));
  project.portalSummary = project.portalSummary?.confirmedAt
    ? { ...portalSummary, confirmedAt: project.portalSummary.confirmedAt }
    : portalSummary;
  const portalPlan = createPortalPlanFromProject(project);
  portalPlan.status = project.portalPlanStatus === 'editing' ? 'editing' : 'generated';
  portalPlan.updatedAt = Date.now();
  Object.assign(project, applyPortalPlanToProject(project, portalPlan));
  await saveProject(project);
  await syncProjectWorkspaceSnapshot(project);
  return project;
}

// ---------------------------------------------------------------------------
// Refresh needs-driven workspace preview
// ---------------------------------------------------------------------------

export async function refreshNeedsDrivenWorkspacePreview(): Promise<void> {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  const project = await loadProject(projectId);
  if (!project) return;
  const hydratedProject = await ensureNeedsDrivenWorkspace(project);
  await ensureWorkspaceTemplateCache();
  renderWorkspaceEditorShell(hydratedProject.workspace ?? null);
  renderWorkspacePreview(document.getElementById('mainPage'), hydratedProject.workspace ?? null, getWorkspaceTemplateCache());
}

// ---------------------------------------------------------------------------
// Resolve portal workflow for a user message
// ---------------------------------------------------------------------------

export async function resolvePortalWorkflowForMessage(project: Project, userMessage: string): Promise<{
  project: Project;
}> {
  const extracted = extractPortalProfileFromMessage(userMessage);
  const previousProfile = project.portalProfile;
  const nextProfile = hasPortalProfilePatch(extracted)
    ? mergePortalProfile(previousProfile, extracted, 'chat')
    : previousProfile;
  const profileChanged = didPortalProfileChange(previousProfile, nextProfile);

  if (nextProfile) {
    project.portalProfile = nextProfile;
    if (!project.portalPlanStatus) {
      Object.assign(project, setPortalPlanStatus(project, 'collecting'));
    }
    if (project.name === '未命名项目' && nextProfile.customerName) {
      project.name = `${nextProfile.customerName}门户`;
      project.themeName = project.name;
      updateProjectNameDisplay(project);
    }
  }

  if (profileChanged && project.portalSummary?.confirmedAt) {
    project.portalSummary = undefined;
    project.portalDraft = undefined;
  }

  if (profileChanged && nextProfile) {
    project.portalSummary = buildPortalSummary(nextProfile);
    Object.assign(project, setPortalPlanStatus(project, 'summary_pending'));
  }

  await saveProject(project);
  await refreshNeedsDrivenWorkspacePreview();

  return { project };
}
