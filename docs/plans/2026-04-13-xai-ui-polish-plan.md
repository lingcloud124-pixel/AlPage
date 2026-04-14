# xAI-style UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-style the Theme Studio workbench UI to feel much closer to x.ai’s cold, minimal, dark “lab console” aesthetic while preserving the current three-column product structure and export workflow.

**Architecture:** Keep the existing product layout, interaction model, and export architecture unchanged. Concentrate the visual redesign in shared shell styles, modal styling, chat shell styling, and workbench chrome, while leaving the OA preview templates themselves mostly untouched. Use TDD for any new rendering helpers and keep HTML structure changes minimal and deliberate.

**Tech Stack:** HTML, CSS, TypeScript, Vite, Vitest.

---

### Task 1: Lock the new shell tokens and visual intent in tests

**Files:**
- Create: `tests/unit/WebUiThemeTokens.test.ts`
- Modify: `web/src/styles.css`
- Reference: current shell styles in `web/src/styles.css`

**Step 1: Write the failing test**

Write a test that asserts the app shell styles include a cold dark token family consistent with the new direction, for example:
- near-black app background
- elevated dark panels
- strong/weak border tokens
- high-contrast primary text and muted secondary text

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/WebUiThemeTokens.test.ts`
Expected: FAIL because the existing shell styles still reflect the older mixed enterprise/assistant aesthetic.

**Step 3: Write minimal implementation**

Update `web/src/styles.css` to define the new shell token set and map shell components to those tokens without changing preview-template color logic.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/unit/WebUiThemeTokens.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/WebUiThemeTokens.test.ts web/src/styles.css
git commit -m "style: add xai-inspired shell tokens"
```

### Task 2: Restyle the three-column shell and project sidebar

**Files:**
- Modify: `web/index.html`
- Modify: `web/src/styles.css`
- Test: `tests/unit/WebEntryImports.test.ts` or new lightweight HTML structure test if needed

**Step 1: Write the failing test**

If structure changes are required, add a focused test asserting the shell keeps the current semantic regions while supporting the new class hooks needed for the redesign.

**Step 2: Run test to verify it fails**

Run the targeted test.
Expected: FAIL if new hooks/classes are missing.

**Step 3: Write minimal implementation**

Refine the shell layout to feel more x.ai-like:
- sharper panel separation
- colder sidebar styling
- quieter surfaces
- less decorative chrome
- stronger typography hierarchy

**Step 4: Run test to verify it passes**

Run the targeted test.
Expected: PASS

**Step 5: Commit**

```bash
git add web/index.html web/src/styles.css
git commit -m "style: restyle app shell and sidebar for xai aesthetic"
```

### Task 3: Rework chat surface and input area into a command-panel feel

**Files:**
- Modify: `web/src/styles.css`
- Modify: `web/index.html` if minimal hooks are needed
- Test: create `tests/unit/WebChatShellView.test.ts` if new structural hooks are introduced

**Step 1: Write the failing test**

If needed, add a test asserting the chat shell exposes stable hooks for assistant/user rows, input shell, and status chrome.

**Step 2: Run test to verify it fails**

Run the targeted test.
Expected: FAIL until the new hooks exist.

**Step 3: Write minimal implementation**

Restyle the chat area so it reads less like a colorful consumer chat app and more like a sparse control console:
- quieter message surfaces
- reduced bubble theatrics
- stronger spacing rhythm
- command-panel-like input shell
- neutral action buttons

**Step 4: Run test to verify it passes**

Run the targeted test.
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/styles.css web/index.html tests/unit/WebChatShellView.test.ts
git commit -m "style: convert chat panel to xai-inspired console shell"
```

### Task 4: Restyle preview top bar, package modal, settings modal, and export history panel

**Files:**
- Modify: `web/src/styles.css`
- Modify: `web/index.html`
- Reuse existing export history rendering modules

**Step 1: Write the failing test**

Create a small test if needed for any new modal/export-history hook classes. Otherwise use screenshot/manual verification notes in the plan.

**Step 2: Run test to verify it fails**

Run the targeted test when applicable.
Expected: FAIL until the hooks exist.

**Step 3: Write minimal implementation**

Make the task/control surfaces look consistent with the x.ai direction:
- tabs, buttons, modal sections, recent-export list
- thin borders instead of heavy shadows
- neutral status chips with restrained accent use
- completed exports and open-directory action feel like system tools, not marketing UI

**Step 4: Run test to verify it passes**

Run the targeted test when applicable.
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/styles.css web/index.html
git commit -m "style: polish preview controls and export task surfaces"
```

### Task 5: Final consistency pass on notifications, menus, and interaction polish

**Files:**
- Modify: `web/src/styles.css`
- Modify: small HTML hooks only if necessary

**Step 1: Write a verification checklist**

Checklist should cover:
- no emoji-heavy UI chrome
- hover states don’t jump or scale aggressively
- interactive controls have pointer/focus states
- shell colors remain neutral while preview colors stay theme-driven

**Step 2: Verify current state against checklist**

Manual review of current work-in-progress.
Expected: identify remaining mismatches.

**Step 3: Write minimal implementation**

Tighten toast, menus, dropdowns, focus rings, and separators to match the same visual system.

**Step 4: Verify checklist passes**

Manual review plus build verification.
Expected: coherent shell language across all workbench surfaces.

**Step 5: Commit**

```bash
git add web/src/styles.css web/index.html
git commit -m "style: finalize xai-inspired interaction polish"
```

### Task 6: Verification

**Files:**
- No new production files required

**Step 1: Run focused tests**

Run all new/changed UI-related tests.

**Step 2: Run broader validation**

```bash
cd /Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation && npm run test:types
cd /Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/web && npm run build
```

**Step 3: Manual visual review**

Open the app locally and check:
- sidebar
- chat shell
- preview toolbar
- package modal
- settings modal
- export history panel

**Step 4: Record verification evidence**

Capture exact passing commands and summarize the visual deltas.

**Step 5: Commit**

```bash
git add .
git commit -m "style: complete xai-inspired ui polish pass"
```
