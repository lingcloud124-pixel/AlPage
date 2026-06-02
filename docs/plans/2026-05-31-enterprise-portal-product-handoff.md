# Enterprise Portal Product Handoff Implementation Plan

> **For Claude / Codex / Other AI:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or an equivalent task-by-task execution workflow to implement this plan. Do not start coding before reading the product decisions, data ownership rules, and phase-one boundaries below.

**Goal:** Build AlPage into a conversation-driven enterprise portal generator where AI creates a customer-specific portal from structured project data, users can configure details, publish a read-only customer preview link, and save accepted projects into a reusable case library.

**Architecture:** The preview, workspace design view, conversation patches, manual configuration, publishing, and case-library saving must all operate on one shared `PortalProject` data model. The preview must never render independent static template content that is unrelated to the project/workspace state. AI must generate structured portal plans by selecting existing backend card templates, not by inventing cards or raw HTML.

**Tech Stack:** Existing Vite/TypeScript frontend under `web/src`, Vitest, TypeScript project checks, existing workspace modules under `web/src/workspace`, portal agent flow under `web/src/portal-agent.ts` and `web/src/portal-plan.ts`, API client modules under `web/src/api`.

## 1. Product Vision

AlPage should help internal users generate enterprise portal pages for customers through conversation.

The intended workflow:

1. User describes the customer, industry, portal goal, desired modules, and visual direction.
2. AI summarizes requirements before generation.
3. User confirms the summary.
4. AI generates a structured portal project.
5. Preview renders the generated portal from project data.
6. User can refine the result through conversation or manual configuration.
7. User publishes a fixed read-only customer preview link.
8. Accepted projects can be saved into the backend case library.
9. Future projects can use the case library as reference.

This is not a static template editor. It is a structured portal-project generator.

## 2. Confirmed Product Decisions

### 2.1 One Shared Content Source

Conversation, preview, workspace design, configuration, publishing, and case saving all read and write the same `PortalProject`.

Forbidden behavior:

- Preview loads hard-coded portal content unrelated to the workspace.
- Preview has one content model while workspace design has another.
- Default preview shows fake todo/news/schedule/knowledge cards when the project has no generated workspace.

Required behavior:

- Empty project preview shows a generation-oriented empty state.
- Generated project preview renders the actual project.
- Workspace design renders the same card instances as preview.
- Manual configuration updates immediately affect the same project data used by preview.

### 2.2 AI Generation Mode

AI must ask clearly before generating.

Required flow:

1. Parse user conversation into a requirement summary.
2. Show the summary and generated assumptions.
3. List cards that can be covered by the current card library.
4. List needs not covered by the current card library.
5. Generate only after user confirmation.

### 2.3 Card Generation Rule

AI must not invent card types.

Cards can only be selected from the backend card library.

If the customer asks for unsupported capabilities, AI should:

- Generate the portal using available matching cards.
- Clearly list uncovered needs.
- Save uncovered needs into a future card backlog or pending-card list.

Example:

Customer asks for an energy group portal with safety production status, business indicators, todos, news, and dispatch center.

If the current card library only has todo, news, quick links, schedule, and knowledge cards, AI should generate todo/news/quick-link parts and list safety production status, business indicators, and dispatch center as uncovered needs.

### 2.4 Card Content Rule

Card content is controlled by backend card field schema.

AI can only fill fields where `aiWritable: true`.

AI cannot:

- Change card structure.
- Add fields not defined by schema.
- Create new component layouts inside a card.
- Mutate card internals beyond allowed instance props.

### 2.5 AI Matching Rule

AI uses semantic matching to select the closest existing backend card templates.

Matching should consider:

- Card category.
- Industry tags.
- Capability tags.
- Use scenarios.
- Field capabilities.
- Default size/layout constraints.

AI may choose close matches, but it must explain missing coverage when a card library gap exists.

### 2.6 Case Library Rule

The case library has two purposes:

1. Internal AI generation reference.
2. Frontend recommended-case display later.

AI can use cases as reference for industry style, layout direction, and card combinations.

AI must not directly copy old customer-specific business content into a new project.

Case records therefore need both AI-reference fields and frontend-display fields.

### 2.7 Customer Preview Link Rule

Published customer preview is a fixed read-only online link.

Phase one uses overwrite publishing:

- One stable preview link per published project.
- Each publish updates the content behind that link.
- Customer has no editing controls.
- Versioned customer publishing is not phase-one scope.

### 2.8 Conversation Modification Rule

Default behavior is local patching.

If user says:

- "把新闻放前面" -> patch card order.
- "背景换成更科技感" -> patch theme config.
- "工作区分三栏" -> patch workspace config.
- "重新生成一版" -> regenerate whole portal.

Do not regenerate the whole page for small changes.

## 3. Editable Layers

Portal editing has three levels.

### 3.1 Theme Effect Layer

Includes:

- Customer logo.
- Customer name.
- Header style.
- Overall color theme.
- Background image or background texture.
- Industry visual direction.

Important: customer logo must always be editable.

Theme and workspace configuration entry belongs in the preview area's top-right controls.

### 3.2 Workspace Display Layer

Includes:

- Workspace width.
- Outer margin.
- Inner padding.
- Border radius.
- Column count.
- Card gap.
- Workspace background treatment.
- General card layout density.

Workspace configuration entry also belongs in the preview area's top-right controls.

### 3.3 Card Content Layer

Includes card-level editable fields:

- Title.
- Summary.
- List items.
- Metrics.
- Images.
- Links.
- Buttons.
- Other schema-defined fields.

Card configuration entry belongs on cards inside "workspace design", not on arbitrary preview clicks.

## 4. Configuration Interaction Model

Confirmed model:

- Preview top-right controls open theme configuration and workspace configuration.
- Workspace design cards expose card-level configuration.
- Conversation and manual configuration modify the same project data.

Not the intended model:

- Clicking any arbitrary preview object to edit it.
- Separate preview template config unrelated to workspace.
- A complex permanent three-tab settings panel as the main entry.

Recommended UI behavior:

- Preview area shows final portal effect.
- Preview top-right has concise controls: theme, workspace, publish, maybe design mode.
- Workspace design shows editable card instances.
- Each design card has content/settings actions.
- Empty workspace still has a real project empty state and workspace config access.

## 5. Theme Background Source

Theme/background selection rule:

1. Prefer backend theme/background library assets.
2. AI can recommend theme direction based on industry and customer need.
3. If no fitting asset exists, use generated/placeholder background as fallback.
4. Do not generate a new random background every time by default.

Theme assets should eventually include:

- Header style templates.
- Color theme tokens.
- Background images/textures.
- Industry tags.
- Preview thumbnails.
- AI recommendation metadata.

## 6. Demo Content Rule

AI may generate reasonable demo content based on customer industry and requirements.

Constraints:

- Demo content must be editable.
- Demo content must fit the industry context.
- Do not claim fake data is real system data.
- Only write into schema-approved fields.
- Real business system integration is not required for phase one.

## 7. Proposed Data Model

Names are recommendations. Adapt to existing code patterns.

### 7.1 PortalProject

```ts
type PortalProject = {
  id: string;
  name: string;
  customerName: string;
  industry?: string;
  status: "draft" | "generated" | "published" | "archived";
  requirementSummary?: RequirementSummary;
  theme: ThemeConfig;
  workspace: WorkspaceConfig;
  cards: CardInstance[];
  uncoveredNeeds: UncoveredNeed[];
  caseReferenceIds?: string[];
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 7.2 RequirementSummary

```ts
type RequirementSummary = {
  customerName?: string;
  industry?: string;
  portalGoal: string;
  requestedCapabilities: string[];
  stylePreferences: string[];
  assumptions: string[];
};
```

### 7.3 ThemeConfig

```ts
type ThemeConfig = {
  logoUrl?: string;
  customerName?: string;
  headerStyle: string;
  colorThemeId?: string;
  colors?: Record<string, string>;
  backgroundAssetId?: string;
  backgroundUrl?: string;
  backgroundMode?: "library" | "generated" | "placeholder";
};
```

### 7.4 WorkspaceConfig

```ts
type WorkspaceConfig = {
  width: "narrow" | "standard" | "wide" | "full";
  maxWidth?: number;
  outerPadding: number;
  innerPadding: number;
  radius: number;
  columns: number;
  gap: number;
  background?: string;
};
```

### 7.5 CardTemplate

```ts
type CardTemplate = {
  id: string;
  name: string;
  category: string;
  industryTags: string[];
  capabilityTags: string[];
  scenarioTags: string[];
  defaultW: number;
  defaultH: number;
  previewImageUrl?: string;
  fields: CardFieldSchema[];
  enabled: boolean;
};
```

### 7.6 CardFieldSchema

```ts
type CardFieldSchema = {
  key: string;
  label: string;
  type: "text" | "number" | "image" | "link" | "list" | "select" | "boolean";
  aiWritable: boolean;
  required?: boolean;
  options?: string[];
  itemSchema?: Record<string, string>;
};
```

### 7.7 CardInstance

```ts
type CardInstance = {
  id: string;
  templateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  instanceProps: Record<string, unknown>;
};
```

### 7.8 UncoveredNeed

```ts
type UncoveredNeed = {
  id: string;
  label: string;
  reason: string;
  requestedCapability: string;
  suggestedCardType?: string;
};
```

### 7.9 CaseRecord

```ts
type CaseRecord = {
  id: string;
  title: string;
  customerName?: string;
  industry: string;
  summary: string;
  highlights: string[];
  coverImageUrl?: string;
  displayEnabled: boolean;
  referenceEnabled: boolean;
  themeSnapshot: ThemeConfig;
  workspaceSnapshot: WorkspaceConfig;
  cardTemplateIds: string[];
  anonymizedRequirementSummary?: RequirementSummary;
  createdFromProjectId?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 8. Existing Code Areas To Inspect

Start by inspecting these files before editing:

- `web/src/portal-plan.ts` - current portal plan types and generation structures.
- `web/src/portal-agent.ts` - AI portal generation flow.
- `web/src/chat-manager.ts` - conversation orchestration.
- `web/src/workspace/store.ts` - workspace state ownership.
- `web/src/workspace/preview.ts` - workspace-to-preview rendering.
- `web/src/workspace/card-renderer.ts` - card rendering.
- `web/src/workspace/design-mode.ts` - design mode behavior.
- `web/src/components/workspace-configuration.ts` - workspace config UI.
- `web/src/components/card-content-configuration.ts` - card config UI.
- `web/src/api/card-templates.ts` - card template API client.
- `web/src/api/industry-cases.ts` - case/reference API client.
- `web/src/api/saved-portals.ts` - saved portal/project API client.
- `web/src/api/workspace.ts` - workspace API client.
- `web/src/styles/portal-config-panel.css` - config panel styling.
- `web/src/styles/workspace.css` - workspace styling.
- `web/src/styles/preview-panel.css` - preview styling.

## 9. Phase-One Scope

Must build:

- Shared structured `PortalProject` source of truth.
- Preview default empty state driven by project state.
- AI requirement summary before generation.
- AI semantic selection from card library.
- AI writes only `aiWritable` card fields.
- Uncovered needs list.
- Preview top-right theme/workspace config entry.
- Editable logo in theme config.
- Workspace design card configuration entry.
- Fixed read-only publish link with overwrite update.
- Backend card library management for templates, tags, schema, size, preview image.
- Case library saving with AI-reference and frontend-display fields.

Should build if already close:

- Case retrieval before generation.
- Theme/background library recommendation.
- Pending card backlog from uncovered needs.

Not phase one:

- AI-created new card structures.
- Full visual card designer.
- Customer-side editing.
- Versioned customer publish links.
- Real business system data integration.
- Direct HTML generation as primary source.

## 10. Implementation Tasks

### Task 1: Confirm Current Source Of Truth

**Files:**

- Inspect: `web/src/workspace/store.ts`
- Inspect: `web/src/workspace/preview.ts`
- Inspect: `web/src/portal-plan.ts`
- Inspect: `web/src/portal-agent.ts`

**Steps:**

1. Trace how generated portal data becomes workspace cards.
2. Trace how preview is initialized.
3. Confirm no static preview template can overwrite project/workspace data.
4. Add or update tests around empty project preview and generated workspace preview.

**Acceptance:**

- Empty project preview shows empty generation state.
- Generated project preview shows project cards.
- Opening workspace design does not change preview content source.

### Task 2: Formalize PortalProject Types

**Files:**

- Modify: `web/src/portal-plan.ts`
- Modify if needed: `web/src/types.ts`
- Test: add or update relevant Vitest files near existing portal/workspace tests.

**Steps:**

1. Add explicit types for `PortalProject`, `ThemeConfig`, `WorkspaceConfig`, `CardInstance`, `UncoveredNeed`.
2. Map existing portal/workspace structures into the new shape without large unrelated refactors.
3. Ensure defaults produce an empty-state portal, not fake content.

**Acceptance:**

- Type checks pass.
- Existing generation flow can create a valid project object.

### Task 3: Backend Card Library Contract

**Files:**

- Modify: `web/src/api/card-templates.ts`
- Modify: `web/src/portal-agent.ts`
- Modify: `web/src/portal-plan.ts`

**Steps:**

1. Define frontend contract for `CardTemplate` and `CardFieldSchema`.
2. Ensure AI selection references `templateId`.
3. Ensure generated card props are filtered by `aiWritable`.
4. Ensure unmatched needs become `uncoveredNeeds`.

**Acceptance:**

- AI output cannot introduce unknown card template IDs.
- AI output cannot write fields missing from schema.
- Unsupported requested capabilities appear in uncovered needs.

### Task 4: Requirement Summary Before Generation

**Files:**

- Inspect/modify: `web/src/chat-manager.ts`
- Inspect/modify: `web/src/portal-agent.ts`
- Inspect/modify: `web/src/components/portal-confirm-form.ts`

**Steps:**

1. Generate requirement summary from conversation.
2. Show requirement summary before generation.
3. Include available coverage and uncovered needs.
4. Generate portal only after confirmation.

**Acceptance:**

- User can review assumptions before generation.
- Generation is not triggered blindly from first prompt.

### Task 5: Theme And Workspace Configuration Entry

**Files:**

- Modify: `web/src/components/workspace-configuration.ts`
- Modify: `web/src/styles/portal-config-panel.css`
- Modify: `web/src/styles/preview-panel.css`
- Modify where preview top-right controls are defined.

**Steps:**

1. Add preview top-right entry for theme config.
2. Add preview top-right entry for workspace config.
3. Ensure logo upload/replace/remove is part of theme config.
4. Ensure config updates patch `PortalProject.theme` or `PortalProject.workspace`.

**Acceptance:**

- Theme config and workspace config are accessible from preview top-right.
- Logo can be changed.
- Changes immediately affect preview and workspace design.

### Task 6: Card Configuration In Workspace Design

**Files:**

- Modify: `web/src/workspace/design-mode.ts`
- Modify: `web/src/components/card-content-configuration.ts`
- Modify: `web/src/workspace/card-renderer.ts`

**Steps:**

1. Put card content config entry on workspace design cards.
2. Build form fields from selected card template schema.
3. Save changes to `CardInstance.instanceProps`.
4. Prevent editing fields not present in schema.

**Acceptance:**

- Card fields are editable in workspace design.
- Preview reflects card content changes.
- Unknown fields cannot be saved through UI.

### Task 7: Case Library Dual Use

**Files:**

- Modify: `web/src/api/industry-cases.ts`
- Modify: `web/src/portal-agent.ts`
- Add or modify case saving UI where current project save flow lives.

**Steps:**

1. Extend case record contract for `displayEnabled` and `referenceEnabled`.
2. Save accepted project into case library with anonymized requirement summary.
3. Add fields needed by future frontend recommended-case display: title, industry, cover, summary, highlights.
4. Use reference-enabled cases for AI retrieval.

**Acceptance:**

- A project can be saved as a reusable case.
- Case record can be used by AI reference and frontend display later.
- Customer-specific sensitive content is not copied into new projects by default.

### Task 8: Publish Overwrite Preview Link

**Files:**

- Inspect/modify: `web/src/api/saved-portals.ts`
- Inspect/modify: `web/src/export/live-preview-snapshot.ts`
- Inspect/modify publish UI files.

**Steps:**

1. Ensure publish writes a read-only snapshot from current `PortalProject`.
2. Ensure each publish overwrites the stable project preview link.
3. Ensure customer preview has no edit controls.

**Acceptance:**

- Same link shows latest published content after each publish.
- Customer link does not expose design/configuration controls.

### Task 9: Verification

Run:

```bash
npm run test:types
npm run test -- --run
npm run build
```

Expected:

- TypeScript checks pass.
- Vitest suite passes.
- Production build passes.

## 11. AI Prompt / Tooling Requirements

AI generation prompt must enforce:

- Output structured project data, not raw HTML.
- Use only card templates from card library.
- Use only schema-approved `aiWritable` fields.
- Return uncovered needs explicitly.
- Prefer local patch for follow-up changes.
- Regenerate whole portal only when user explicitly asks.
- Reference case library for style/layout/card-combo guidance, not customer-specific copying.

Recommended AI output shape:

```ts
type PortalGenerationResult = {
  requirementSummary: RequirementSummary;
  projectPatch: {
    theme: ThemeConfig;
    workspace: WorkspaceConfig;
    cards: CardInstance[];
    uncoveredNeeds: UncoveredNeed[];
  };
  selectedCaseReferences: string[];
  selectedCardTemplates: string[];
  notes: string[];
};
```

## 12. Regression Risks

Watch these risks carefully:

- Static desktop template reappears as preview source.
- Preview and workspace diverge after initialization.
- AI writes card fields not allowed by schema.
- Manual config writes local UI state but not project data.
- Logo is treated as decorative and omitted from theme config.
- Case library stores customer-specific content in a way that later leaks into new projects.
- Publish link accidentally exposes edit controls.

## 13. Success Criteria

The phase-one work is successful when:

1. A user can describe a customer portal need through chat.
2. AI shows a requirement summary before generation.
3. AI generates a portal using existing card library templates.
4. Preview and workspace design show the same generated content.
5. User can edit logo/theme/workspace from preview top-right.
6. User can edit card content from workspace design cards.
7. User can publish a fixed read-only customer preview link.
8. User can save the accepted project as a case.
9. Unsupported card needs are clearly listed and saved for future card-library expansion.

