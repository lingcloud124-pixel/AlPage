# PortalPlan Main Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first PortalPlan-centered main flow so AlPage can collect required customer information, confirm a summary, generate a PortalPlan, derive workspace preview from it, sync GridStack layout changes back into it, and save it as the current portal result.

**Architecture:** Add `PortalPlan` as the primary state object while keeping existing `Project`, `portalProfile`, `portalSummary`, `portalDraft`, and `workspace` fields as transition compatibility. Put conversion logic in a focused `web/src/portal-plan.ts` module, then wire existing chat and workspace flows to read/write `project.portalPlan` first.

**Tech Stack:** Vanilla TypeScript, Vite, Vitest source/unit tests, existing GridStack workspace integration.

---

## File Structure

- Modify: `web/src/types.ts`
  - Add `PortalPlan`, layer types, card placement types, and `PortalPlanStatus`.
- Create: `web/src/portal-plan.ts`
  - Own PortalPlan creation, project application, workspace derivation, workspace layout sync, and status helpers.
- Modify: `web/src/project-manager.ts`
  - Add `portalPlan` and `portalPlanStatus` to `Project`.
  - Re-export or use PortalPlan helpers where existing project mutations need saved status.
- Modify: `web/src/chat-manager.ts`
  - On confirm, create/apply a PortalPlan instead of only applying `portalDraft`.
  - When profile changes, keep `portalPlanStatus` aligned with collection/summary stages.
- Modify: `web/src/workspace/runtime.ts`
  - After workspace mutations, sync workspace layout back into `project.portalPlan.workspaceRuleLayer.cardPlacements`.
- Test: `tests/unit/PortalPlanTypes.test.ts`
  - Source contract for exported types and project fields.
- Test: `tests/unit/PortalPlanMapping.test.ts`
  - Runtime unit tests for PortalPlan creation and workspace mapping helpers.
- Test: `tests/unit/PortalAgentWorkflow.test.ts`
  - Extend existing workflow tests to cover status names and summary-confirmation handoff.
- Test: `tests/unit/WorkspaceGridStackContracts.test.ts`
  - Extend source contract to assert workspace runtime syncs PortalPlan from workspace mutations.

---

### Task 1: Add PortalPlan type contracts

**Files:**
- Modify: `web/src/types.ts`
- Test: `tests/unit/PortalPlanTypes.test.ts`

- [ ] **Step 1: Write the failing type/source contract test**

Create `tests/unit/PortalPlanTypes.test.ts`:

```ts
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

    expect(source).toContain('export interface PortalPlan');
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/unit/PortalPlanTypes.test.ts
```

Expected: FAIL because `PortalPlan` and `PortalPlanStatus` are not exported yet.

- [ ] **Step 3: Add PortalPlan types**

In `web/src/types.ts`, insert the following after `PortalResultState` and before `WorkspaceSettings`:

```ts
export type PortalPlanStatus = 'collecting' | 'summary_pending' | 'generated' | 'editing' | 'saved';

export interface PortalEnterpriseProfile {
  customerName: string;
  industry: string;
  customerFunctions: string[];
  portalPurpose: string;
  highlightedCards: string[];
  visualPreference: string;
  summary: string;
  sourceProfile?: PortalCustomerProfile;
}

export interface PortalThemeLayer {
  themeDirection: string;
  colors: Record<string, string>;
  headerStyle: string;
  navigationStyle: string;
  bannerStrategy: string;
  visualKeywords: string[];
}

export type PortalCardDensity = 'compact' | 'standard' | 'comfortable';
export type PortalLayoutMode = 'dense' | 'showcase' | 'dashboard';

export interface PortalRegion {
  id: string;
  name: string;
  columns: number;
  rowHeight: number;
  padding: number;
}

export interface PortalCardPlacement {
  cardId: string;
  templateId: string;
  regionId: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  minColumnSpan?: number;
  maxColumnSpan?: number;
  minRowSpan?: number;
  maxRowSpan?: number;
}

export interface PortalWorkspaceRuleLayer {
  cardRadius: number;
  cardGap: number;
  cardDensity: PortalCardDensity;
  shadowStyle: string;
  gridColumns: number;
  rowHeight: number;
  layoutMode: PortalLayoutMode;
  regions: PortalRegion[];
  cardPlacements: PortalCardPlacement[];
}

export interface PortalCardContent {
  id: string;
  templateId: string;
  title: string;
  summary?: string;
  badge?: string;
  headline?: string;
  items?: Array<Record<string, unknown>>;
  links?: string[];
  enterpriseMappingReason: string;
}

export interface PortalCardContentLayer {
  cards: PortalCardContent[];
}

export interface PortalEditHistoryItem {
  source: 'agent' | 'config';
  layer: 'theme' | 'workspaceRules' | 'cardContent';
  summary: string;
  createdAt: number;
}

export interface PortalPlan {
  id: string;
  status: PortalPlanStatus;
  enterpriseProfile: PortalEnterpriseProfile;
  themeLayer: PortalThemeLayer;
  workspaceRuleLayer: PortalWorkspaceRuleLayer;
  cardContentLayer: PortalCardContentLayer;
  editHistory: PortalEditHistoryItem[];
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 4: Add Project fields**

In `web/src/project-manager.ts`, update the type import block to include `PortalPlan` and `PortalPlanStatus`:

```ts
import type {
  ExportBatch,
  PortalCustomerProfile,
  PortalDraft,
  PortalPlan,
  PortalPlanStatus,
  PortalResultState,
  PortalSummary,
  ServerExportJob,
  WorkspaceConfig,
  WorkspaceItem,
  WorkspaceSettings,
} from './types';
```

Then add fields to `Project` after `portalResult?: PortalResultState;`:

```ts
  portalPlan?: PortalPlan;
  portalPlanStatus?: PortalPlanStatus;
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npx vitest run tests/unit/PortalPlanTypes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

---

### Task 2: Create PortalPlan mapping helpers

**Files:**
- Create: `web/src/portal-plan.ts`
- Test: `tests/unit/PortalPlanMapping.test.ts`

- [ ] **Step 1: Write failing unit tests for PortalPlan creation and workspace mapping**

Create `tests/unit/PortalPlanMapping.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { buildPortalDraft, buildPortalSummary, extractPortalProfileFromMessage, mergePortalProfile } from '../../web/src/portal-agent';
import { createWorkspaceConfigFromPortalDraft, type Project } from '../../web/src/project-manager';
import {
  applyPortalPlanToProject,
  createPortalPlanFromProject,
  createWorkspaceFromPortalPlan,
  syncPortalPlanFromWorkspace,
} from '../../web/src/portal-plan';

function createProjectFixture(): Project {
  const profile = mergePortalProfile(undefined, extractPortalProfileFromMessage(`
客户名称：申能集团
客户行业：能源
客户核心职能/业务特征：安全生产、设备巡检、调度协同
本次门户用途：运营门户
希望突出哪些卡片或信息：快捷入口、待办事务、新闻公告
品牌/视觉倾向：稳重企业蓝
  `), 'chat');
  const summary = { ...buildPortalSummary(profile), confirmedAt: 1780000000000 };
  const draft = buildPortalDraft(summary);
  const workspace = createWorkspaceConfigFromPortalDraft(draft);

  return {
    id: 'project-1',
    name: '申能集团门户',
    lifecycle: 'active',
    templateType: 'light-ui',
    colors: { primary: '#2C615C' },
    portalProfile: profile,
    portalSummary: summary,
    portalDraft: draft,
    workspace,
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  };
}

describe('PortalPlan mapping helpers', () => {
  test('creates a generated PortalPlan from existing project profile, draft, colors, and workspace', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);

    expect(plan.status).toBe('generated');
    expect(plan.enterpriseProfile.customerName).toBe('申能集团');
    expect(plan.enterpriseProfile.industry).toBe('能源');
    expect(plan.themeLayer.colors.primary).toBe('#2C615C');
    expect(plan.themeLayer.themeDirection).toContain('能源');
    expect(plan.workspaceRuleLayer.cardPlacements).toHaveLength(project.workspace?.items.length ?? 0);
    expect(plan.cardContentLayer.cards[0]?.title).toContain('申能集团');
  });

  test('derives a WorkspaceConfig from PortalPlan card placements and card content', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);
    const workspace = createWorkspaceFromPortalPlan(plan);

    expect(workspace.settings.columns).toBe(plan.workspaceRuleLayer.gridColumns);
    expect(workspace.items[0]?.x).toBe(plan.workspaceRuleLayer.cardPlacements[0]?.column);
    expect(workspace.items[0]?.w).toBe(plan.workspaceRuleLayer.cardPlacements[0]?.columnSpan);
    expect(workspace.items[0]?.instanceProps?.title).toBe(plan.cardContentLayer.cards[0]?.title);
  });

  test('applies PortalPlan to project and keeps transition fields aligned', () => {
    const project = createProjectFixture();
    const plan = createPortalPlanFromProject(project);
    const updated = applyPortalPlanToProject(project, plan);

    expect(updated.portalPlan).toBe(plan);
    expect(updated.portalPlanStatus).toBe('generated');
    expect(updated.workspace?.items).toHaveLength(plan.workspaceRuleLayer.cardPlacements.length);
  });

  test('syncs workspace layout changes back into PortalPlan card placements', () => {
    const project = applyPortalPlanToProject(createProjectFixture(), createPortalPlanFromProject(createProjectFixture()));
    const workspace = project.workspace!;
    const movedWorkspace = {
      ...workspace,
      items: workspace.items.map((item, index) => index === 0 ? { ...item, x: 1, y: 2, w: 3, h: 10 } : item),
    };

    const updated = syncPortalPlanFromWorkspace({ ...project, workspace: movedWorkspace });
    const placement = updated.portalPlan?.workspaceRuleLayer.cardPlacements.find((item) => item.cardId === movedWorkspace.items[0]?.id);

    expect(placement).toMatchObject({ column: 1, row: 2, columnSpan: 3, rowSpan: 10 });
    expect(updated.portalPlan?.status).toBe('editing');
    expect(updated.portalPlanStatus).toBe('editing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/unit/PortalPlanMapping.test.ts
```

Expected: FAIL because `web/src/portal-plan.ts` does not exist.

- [ ] **Step 3: Implement PortalPlan helper module**

Create `web/src/portal-plan.ts`:

```ts
import type {
  PortalCardContent,
  PortalCardPlacement,
  PortalPlan,
  PortalPlanStatus,
  PortalSummary,
  WorkspaceConfig,
  WorkspaceItem,
} from './types';
import type { Project } from './project-manager';
import { DEFAULT_WORKSPACE_SETTINGS, createWorkspaceConfigFromPortalDraft } from './project-manager';

const DEFAULT_REGION_ID = 'main';

function now(): number {
  return Date.now();
}

function createPlanId(project: Project): string {
  return project.portalPlan?.id ?? `portal-plan-${project.id}`;
}

function resolveSummary(project: Project): PortalSummary {
  if (project.portalSummary) return project.portalSummary;
  const profile = project.portalProfile;
  return {
    customerName: profile?.customerName ?? project.name ?? '当前客户',
    customerIndustry: profile?.customerIndustry ?? '综合行业',
    customerFunctions: profile?.customerFunctions ?? [],
    portalPurpose: profile?.portalPurpose ?? '门户方案',
    highlightedCards: profile?.highlightedCards ?? [],
    visualPreference: profile?.visualPreference ?? '专业简洁',
    structureUnderstanding: [],
    styleUnderstanding: profile?.visualPreference ?? '专业简洁',
  };
}

function resolveWorkspace(project: Project): WorkspaceConfig {
  if (project.workspace) return project.workspace;
  if (project.portalDraft) return createWorkspaceConfigFromPortalDraft(project.portalDraft);
  const timestamp = now();
  return {
    settings: DEFAULT_WORKSPACE_SETTINGS,
    items: [],
    meta: {
      initializedAt: timestamp,
      updatedAt: timestamp,
      source: 'default',
    },
  };
}

function placementFromWorkspaceItem(item: WorkspaceItem): PortalCardPlacement {
  return {
    cardId: item.id,
    templateId: item.templateId,
    regionId: DEFAULT_REGION_ID,
    column: item.x,
    row: item.y,
    columnSpan: item.w,
    rowSpan: item.h,
    ...(typeof item.minW === 'number' ? { minColumnSpan: item.minW } : {}),
    ...(typeof item.maxW === 'number' ? { maxColumnSpan: item.maxW } : {}),
    ...(typeof item.minH === 'number' ? { minRowSpan: item.minH } : {}),
    ...(typeof item.maxH === 'number' ? { maxRowSpan: item.maxH } : {}),
  };
}

function cardContentFromWorkspaceItem(item: WorkspaceItem, summary: PortalSummary): PortalCardContent {
  const props = item.instanceProps ?? {};
  return {
    id: item.id,
    templateId: item.templateId,
    title: String(props.title ?? `${summary.customerName}门户卡片`),
    ...(typeof props.summary === 'string' ? { summary: props.summary } : {}),
    ...(typeof props.badge === 'string' ? { badge: props.badge } : {}),
    ...(typeof props.headline === 'string' ? { headline: props.headline } : {}),
    ...(Array.isArray(props.items) ? { items: props.items as Array<Record<string, unknown>> } : {}),
    ...(Array.isArray(props.links) ? { links: props.links.map(String) } : {}),
    enterpriseMappingReason: `${summary.customerIndustry} / ${summary.portalPurpose} 场景下的门户内容映射`,
  };
}

function workspaceItemFromPlacement(placement: PortalCardPlacement, card: PortalCardContent | undefined): WorkspaceItem {
  return {
    id: placement.cardId,
    templateId: placement.templateId,
    x: placement.column,
    y: placement.row,
    w: placement.columnSpan,
    h: placement.rowSpan,
    ...(typeof placement.minColumnSpan === 'number' ? { minW: placement.minColumnSpan } : {}),
    ...(typeof placement.maxColumnSpan === 'number' ? { maxW: placement.maxColumnSpan } : {}),
    ...(typeof placement.minRowSpan === 'number' ? { minH: placement.minRowSpan } : {}),
    ...(typeof placement.maxRowSpan === 'number' ? { maxH: placement.maxRowSpan } : {}),
    instanceProps: {
      ...(card?.title ? { title: card.title } : {}),
      ...(card?.summary ? { summary: card.summary } : {}),
      ...(card?.badge ? { badge: card.badge } : {}),
      ...(card?.headline ? { headline: card.headline } : {}),
      ...(card?.items ? { items: card.items } : {}),
      ...(card?.links ? { links: card.links } : {}),
    },
  };
}

export function setPortalPlanStatus(project: Project, status: PortalPlanStatus): Project {
  const timestamp = now();
  const nextPlan = project.portalPlan
    ? { ...project.portalPlan, status, updatedAt: timestamp }
    : undefined;
  return {
    ...project,
    portalPlan: nextPlan,
    portalPlanStatus: status,
    updatedAt: timestamp,
  };
}

export function createPortalPlanFromProject(project: Project): PortalPlan {
  const timestamp = now();
  const summary = resolveSummary(project);
  const workspace = resolveWorkspace(project);
  const existing = project.portalPlan;

  return {
    id: createPlanId(project),
    status: existing?.status ?? 'generated',
    enterpriseProfile: {
      customerName: summary.customerName,
      industry: summary.customerIndustry,
      customerFunctions: summary.customerFunctions,
      portalPurpose: summary.portalPurpose,
      highlightedCards: summary.highlightedCards,
      visualPreference: summary.visualPreference,
      summary: summary.structureUnderstanding.join(' ') || summary.styleUnderstanding,
      ...(project.portalProfile ? { sourceProfile: project.portalProfile } : {}),
    },
    themeLayer: {
      themeDirection: project.portalDraft?.themeDirection ?? `${summary.customerIndustry}行业下的${summary.visualPreference}门户视觉方向`,
      colors: { ...project.colors },
      headerStyle: project.headerBgImageUrl ? 'image-header' : 'standard-header',
      navigationStyle: 'sidebar-navigation',
      bannerStrategy: project.bgImageUrl ? 'image-banner' : 'theme-banner',
      visualKeywords: [summary.customerIndustry, summary.visualPreference].filter(Boolean),
    },
    workspaceRuleLayer: {
      cardRadius: 16,
      cardGap: workspace.settings.gapX,
      cardDensity: 'standard',
      shadowStyle: 'soft',
      gridColumns: workspace.settings.columns,
      rowHeight: workspace.settings.rowHeight,
      layoutMode: 'dashboard',
      regions: [
        {
          id: DEFAULT_REGION_ID,
          name: '主工作区',
          columns: workspace.settings.columns,
          rowHeight: workspace.settings.rowHeight,
          padding: workspace.settings.paddingX,
        },
      ],
      cardPlacements: workspace.items.map(placementFromWorkspaceItem),
    },
    cardContentLayer: {
      cards: workspace.items.map((item) => cardContentFromWorkspaceItem(item, summary)),
    },
    editHistory: existing?.editHistory ?? [
      {
        source: 'agent',
        layer: 'cardContent',
        summary: '根据客户摘要生成 PortalPlan',
        createdAt: timestamp,
      },
    ],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function createWorkspaceFromPortalPlan(portalPlan: PortalPlan): WorkspaceConfig {
  const timestamp = now();
  const cardsById = new Map(portalPlan.cardContentLayer.cards.map((card) => [card.id, card]));
  return {
    settings: {
      ...DEFAULT_WORKSPACE_SETTINGS,
      columns: portalPlan.workspaceRuleLayer.gridColumns,
      rowHeight: portalPlan.workspaceRuleLayer.rowHeight,
      gapX: portalPlan.workspaceRuleLayer.cardGap,
      gapY: portalPlan.workspaceRuleLayer.cardGap,
    },
    items: portalPlan.workspaceRuleLayer.cardPlacements.map((placement) => workspaceItemFromPlacement(placement, cardsById.get(placement.cardId))),
    meta: {
      initializedAt: timestamp,
      updatedAt: timestamp,
      source: 'portal-draft',
    },
  };
}

export function applyPortalPlanToProject(project: Project, portalPlan: PortalPlan): Project {
  return {
    ...project,
    portalPlan,
    portalPlanStatus: portalPlan.status,
    workspace: createWorkspaceFromPortalPlan(portalPlan),
    updatedAt: now(),
  };
}

export function ensureProjectPortalPlan(project: Project): Project {
  if (project.portalPlan) return project;
  return applyPortalPlanToProject(project, createPortalPlanFromProject(project));
}

export function updateProjectPortalPlan(project: Project, updater: (portalPlan: PortalPlan) => PortalPlan): Project {
  const basePlan = project.portalPlan ?? createPortalPlanFromProject(project);
  const nextPlan = updater(basePlan);
  return applyPortalPlanToProject(project, nextPlan);
}

export function syncPortalPlanFromWorkspace(project: Project): Project {
  if (!project.portalPlan || !project.workspace) return project;
  const timestamp = now();
  const previousCardsById = new Map(project.portalPlan.cardContentLayer.cards.map((card) => [card.id, card]));
  const nextCards = project.workspace.items.map((item) => ({
    ...(previousCardsById.get(item.id) ?? cardContentFromWorkspaceItem(item, resolveSummary(project))),
    id: item.id,
    templateId: item.templateId,
  }));
  const nextPlan: PortalPlan = {
    ...project.portalPlan,
    status: 'editing',
    workspaceRuleLayer: {
      ...project.portalPlan.workspaceRuleLayer,
      gridColumns: project.workspace.settings.columns,
      rowHeight: project.workspace.settings.rowHeight,
      cardGap: project.workspace.settings.gapX,
      cardPlacements: project.workspace.items.map(placementFromWorkspaceItem),
    },
    cardContentLayer: {
      cards: nextCards,
    },
    editHistory: [
      ...project.portalPlan.editHistory,
      {
        source: 'config',
        layer: 'workspaceRules',
        summary: '同步工作区布局到 PortalPlan',
        createdAt: timestamp,
      },
    ],
    updatedAt: timestamp,
  };
  return {
    ...project,
    portalPlan: nextPlan,
    portalPlanStatus: 'editing',
    updatedAt: timestamp,
  };
}
```

- [ ] **Step 4: Run mapping tests**

Run:

```bash
npx vitest run tests/unit/PortalPlanMapping.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

---

### Task 3: Wire PortalPlan into summary confirmation generation

**Files:**
- Modify: `web/src/chat-manager.ts`
- Test: `tests/unit/PortalAgentWorkflow.test.ts`

- [ ] **Step 1: Extend workflow source tests to require PortalPlan generation on confirmation**

Add this test to `tests/unit/PortalAgentWorkflow.test.ts` inside the existing `describe` block:

```ts
  test('chat confirmation flow creates and applies a PortalPlan before rendering workspace', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'web/src/chat-manager.ts'), 'utf8');
    const confirmHandler = source.match(/onPortalConfirmSubmit\(async \(project\) => \{[\s\S]*?\n  \}\);/)?.[0] ?? '';

    expect(confirmHandler).toContain('createPortalPlanFromProject(project)');
    expect(confirmHandler).toContain('applyPortalPlanToProject(project, portalPlan)');
    expect(confirmHandler).toContain("portalPlan.status = 'generated'");
    expect(confirmHandler).toContain('renderWorkspaceEditorShell(project.workspace ?? null)');
    expect(confirmHandler).toContain('renderWorkspacePreview(document.getElementById(\'mainPage\'), project.workspace ?? null)');
  });
```

Also add imports to the top of the test file:

```ts
import fs from 'node:fs';
import path from 'node:path';
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/unit/PortalAgentWorkflow.test.ts
```

Expected: FAIL because `chat-manager.ts` does not import/use PortalPlan helpers yet.

- [ ] **Step 3: Import PortalPlan helpers**

In `web/src/chat-manager.ts`, add this import after the existing `portal-agent` import block:

```ts
import {
  applyPortalPlanToProject,
  createPortalPlanFromProject,
  setPortalPlanStatus,
} from './portal-plan';
```

- [ ] **Step 4: Update confirm handler to create PortalPlan**

In `web/src/chat-manager.ts`, replace the current `onPortalConfirmSubmit` handler body with:

```ts
  onPortalConfirmSubmit(async (project) => {
    if (!project.portalProfile) return;
    const portalSummary = project.portalSummary ?? buildPortalSummary(project.portalProfile);
    const portalDraft = buildPortalDraft(portalSummary);
    Object.assign(project, applyPortalDraftToProject(project, portalDraft));
    project.portalSummary = {
      ...portalSummary,
      confirmedAt: Date.now(),
    };
    let portalPlan = createPortalPlanFromProject(project);
    portalPlan = {
      ...portalPlan,
      status: 'generated',
      updatedAt: Date.now(),
    };
    Object.assign(project, applyPortalPlanToProject(project, portalPlan));
    await saveProject(project);
    await syncProjectWorkspaceSnapshot(project);
    renderWorkspaceEditorShell(project.workspace ?? null);
    renderWorkspacePreview(document.getElementById('mainPage'), project.workspace ?? null);
    const prompt = createPortalGenerationPrompt(project.portalSummary);
    await callAI(prompt);
  });
```

- [ ] **Step 5: Keep profile workflow status aligned**

In `resolvePortalWorkflowForMessage`, after setting `project.portalProfile = nextProfile;`, insert:

```ts
    Object.assign(project, setPortalPlanStatus(project, 'collecting'));
```

Then after `project.portalSummary = buildPortalSummary(nextProfile);`, insert:

```ts
    Object.assign(project, setPortalPlanStatus(project, 'summary_pending'));
```

This keeps `portalPlanStatus` meaningful before the plan exists.

- [ ] **Step 6: Run workflow tests**

Run:

```bash
npx vitest run tests/unit/PortalAgentWorkflow.test.ts tests/unit/PortalPlanMapping.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

---

### Task 4: Sync workspace mutations back into PortalPlan

**Files:**
- Modify: `web/src/workspace/runtime.ts`
- Test: `tests/unit/WorkspaceGridStackContracts.test.ts`

- [ ] **Step 1: Add failing source contract**

In `tests/unit/WorkspaceGridStackContracts.test.ts`, extend the existing test with these assertions after `expect(runtime).toContain('mountWorkspaceGrid');`:

```ts
    expect(runtime).toContain('syncPortalPlanFromWorkspace');
    expect(runtime).toMatch(/project\.workspace = currentWorkspace;[\s\S]*?Object\.assign\(project, syncPortalPlanFromWorkspace\(project\)\);[\s\S]*?await saveProject\(project\);/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/unit/WorkspaceGridStackContracts.test.ts
```

Expected: FAIL because `runtime.ts` does not call `syncPortalPlanFromWorkspace`.

- [ ] **Step 3: Import sync helper**

In `web/src/workspace/runtime.ts`, add:

```ts
import { syncPortalPlanFromWorkspace } from '../portal-plan';
```

- [ ] **Step 4: Sync project after workspace mutation**

In `commitWorkspaceMutation`, replace:

```ts
  if (project) {
    project.workspace = currentWorkspace;
    await saveProject(project);
  }
```

with:

```ts
  if (project) {
    project.workspace = currentWorkspace;
    Object.assign(project, syncPortalPlanFromWorkspace(project));
    await saveProject(project);
  }
```

- [ ] **Step 5: Run GridStack contract test**

Run:

```bash
npx vitest run tests/unit/WorkspaceGridStackContracts.test.ts tests/unit/PortalPlanMapping.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

---

### Task 5: Save current portal result as PortalPlan-backed state

**Files:**
- Modify: `web/src/project-manager.ts`
- Test: `tests/unit/PortalPlanTypes.test.ts`

- [ ] **Step 1: Add failing save contract**

Append this test to `tests/unit/PortalPlanTypes.test.ts`:

```ts
  test('saving a portal result marks the active PortalPlan as saved', () => {
    const source = read('web/src/project-manager.ts');
    const saveFn = source.match(/export function markPortalResultSaved\(project: Project\): Project \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(saveFn).toContain("portalPlanStatus: 'saved'");
    expect(saveFn).toContain("status: 'saved'");
    expect(saveFn).toContain('project.portalPlan');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/unit/PortalPlanTypes.test.ts
```

Expected: FAIL because `markPortalResultSaved` only updates `portalResult.savedAt`.

- [ ] **Step 3: Update `markPortalResultSaved`**

In `web/src/project-manager.ts`, replace `markPortalResultSaved` with:

```ts
export function markPortalResultSaved(project: Project): Project {
  const savedAt = Date.now();
  return {
    ...project,
    portalPlan: project.portalPlan
      ? {
          ...project.portalPlan,
          status: 'saved',
          updatedAt: savedAt,
        }
      : project.portalPlan,
    portalPlanStatus: 'saved',
    portalResult: {
      ...project.portalResult,
      savedAt,
    },
    updatedAt: savedAt,
  };
}
```

- [ ] **Step 4: Run save contract test**

Run:

```bash
npx vitest run tests/unit/PortalPlanTypes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

---

### Task 6: Verify the full PortalPlan main-flow slice

**Files:**
- No code changes expected.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
npx vitest run tests/unit/PortalPlanTypes.test.ts tests/unit/PortalPlanMapping.test.ts tests/unit/PortalAgentWorkflow.test.ts tests/unit/WorkspaceGridStackContracts.test.ts
```

Expected: all listed test files PASS.

- [ ] **Step 2: Run full type check**

Run:

```bash
npm run test:types
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm test
```

Expected: PASS. If unrelated existing failures appear, record the exact failure and do not claim full suite success.

- [ ] **Step 4: Manual browser verification if dev servers are running**

Open `http://127.0.0.1:5173/` and verify:

```text
输入包含 6 项客户信息的需求
→ 页面进入摘要确认
→ 点击或回复确认
→ 生成 PortalPlan-backed workspace preview
→ 拖动或缩放一张卡片
→ 保存门户
```

Expected browser evidence:

- No `workspace.items.map(...).replace is not a function` console error.
- Preview remains visible after confirmation.
- Workspace edits still update preview.
- Saving does not throw client-side errors.

---

## Self-Review Notes

- Spec coverage: Tasks cover type model, project state, summary confirmation, PortalPlan generation, workspace derivation, GridStack sync, saved status, and verification.
- Scope intentionally excludes full industry case library, full three-tab configuration UI, and export-chain refactor per spec non-goals.
- Type consistency: `PortalPlanStatus`, `PortalPlan`, `PortalWorkspaceRuleLayer`, `PortalCardPlacement`, `createPortalPlanFromProject`, `applyPortalPlanToProject`, `createWorkspaceFromPortalPlan`, and `syncPortalPlanFromWorkspace` are introduced before use.
- No placeholders remain in implementation steps.
