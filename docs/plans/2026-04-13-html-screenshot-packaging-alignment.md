# HTML Screenshot Packaging Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Theme Studio use HTML templates as the sole rendering source, generate packaging screenshots in the background from current project state, and route export through the standard `screenshot.ts + theme_builder.py` pipeline.

**Architecture:** Keep `.pen` files as design reference only. The Web app owns project state and export-intent selection, a local export bridge owns execution, `screenshot.ts` owns screenshot asset generation, and `theme_builder.py` remains the packaging truth. Remove the browser-only zip-building path from the product-critical flow.

**Tech Stack:** HTML, CSS, TypeScript, Vite, Playwright, Vitest, Python (`theme_builder.py`), local filesystem export batches.

---

### Task 1: Freeze screenshot requirements in tests

**Files:**
- Modify: `web/src/export/screenshot-rules.ts`
- Create: `web/src/export/__tests__/screenshot-rules.test.ts`
- Reference: `config/pen-export-rules.json`, `theme_builder.py`, sample zips under `assets/references/samples/主题样例包/`

**Step 1: Write the failing test**

Add tests that assert the screenshot planning layer returns:
- login assets: `bg-login`, `login_thumb`
- desktop asset: `desktop`
- header assets needed by packaging: default, complex/classic, menu, banner, sideheader
- product-facing names aligned with packaging requirements

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/export/__tests__/screenshot-rules.test.ts`
Expected: FAIL because current screenshot rules are incomplete and/or tied to old assumptions.

**Step 3: Write minimal implementation**

Update `screenshot-rules.ts` so it becomes a packaging-facing screenshot plan generator instead of a thin mirror of old pen export ids.

**Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/export/__tests__/screenshot-rules.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/export/screenshot-rules.ts web/src/export/__tests__/screenshot-rules.test.ts
git commit -m "test: lock screenshot asset planning"
```

### Task 2: Remove screenshot dependence on deleted UI controls

**Files:**
- Modify: `web/scripts/screenshot.ts`
- Add/Modify Test: `web/tests` or `tests/unit` coverage for screenshot planning helpers if practical
- Reference: `web/index.html`, `web/src/templates/*`, `config/web-template-registry.json`

**Step 1: Write the failing test**

Add a focused test around the screenshot selection helper(s) proving screenshot generation does not require `#headerSelect` or `#headerSwitcher` and can render requested header variants directly.

**Step 2: Run test to verify it fails**

Run the specific test file.
Expected: FAIL because current implementation still calls `page.selectOption('#headerSelect', ...)`.

**Step 3: Write minimal implementation**

Refactor `screenshot.ts` to:
- stop querying deleted UI controls
- render/select required variants directly from script logic
- enforce exact screenshot dimensions rather than relying on current DOM size
- fail fast if a required target is missing

**Step 4: Run test to verify it passes**

Run the focused test file.
Expected: PASS

**Step 5: Commit**

```bash
git add web/scripts/screenshot.ts
git commit -m "fix: decouple screenshot pipeline from preview UI controls"
```

### Task 3: Align build-time image mapping with `theme_builder.py`

**Files:**
- Modify: `web/scripts/build.ts`
- Create: `web/scripts/__tests__/build-config.test.ts` or equivalent unit test near config generation logic
- Reference: `theme_builder.py: image_map / ekl_image_map`

**Step 1: Write the failing test**

Test that generated export config includes every required image key used by packaging, especially `headerMenu`, and that selected products only request required outputs.

**Step 2: Run test to verify it fails**

Run the new targeted test.
Expected: FAIL because current YAML omits `headerMenu` and hardcodes all products.

**Step 3: Write minimal implementation**

Refactor config generation so:
- selected products drive the `products` list
- all required screenshot image keys are present
- screenshot mapping names match `theme_builder.py`

**Step 4: Run test to verify it passes**

Run the targeted test.
Expected: PASS

**Step 5: Commit**

```bash
git add web/scripts/build.ts web/scripts/__tests__/build-config.test.ts
git commit -m "fix: align build config with packaging image requirements"
```

### Task 4: Replace browser zip-building path with export job creation

**Files:**
- Modify: `web/src/package-manager.ts`
- Modify: `web/src/project-manager.ts`
- Modify or deprecate: `web/src/packaging/package-builder.ts`
- Create: `web/src/types/export-job.ts` if helpful
- Test: `tests/unit` or `web/src/**/__tests__`

**Step 1: Write the failing test**

Add tests that verify package actions:
- require selected products
- read current project snapshot
- create an export job payload instead of calling browser zip builder
- preserve project-based export metadata for future re-export

**Step 2: Run test to verify it fails**

Run the focused package-manager/project-manager tests.
Expected: FAIL because current code still calls `buildPackages(...)` directly.

**Step 3: Write minimal implementation**

Implement export-job creation and project/export-batch metadata.
Do not yet implement the final local bridge; just move the product flow onto job creation and standard pipeline inputs.

**Step 4: Run test to verify it passes**

Run the focused tests.
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/package-manager.ts web/src/project-manager.ts web/src/packaging/package-builder.ts web/src/types/export-job.ts
git commit -m "refactor: route packaging UI through export jobs"
```

### Task 5: Add user-configured export root and project-based batch directories

**Files:**
- Modify: `web/src/ui-setup.ts`
- Modify: `web/src/types.ts` or new settings type file
- Modify: settings persistence code in `web/src/agent/chat-client.ts` if shared settings stay there
- Test: focused settings tests

**Step 1: Write the failing test**

Test that export settings support:
- user-configured export root
- validation that it exists/is non-empty at config level
- derived directory shape: `projects/{projectId}-{nameEn}/exports/{timestamp}/`

**Step 2: Run test to verify it fails**

Run the focused settings test.
Expected: FAIL because export root is not part of settings yet.

**Step 3: Write minimal implementation**

Add export-root setting and batch path helper(s). Keep browser-side validation lightweight; real writability validation belongs to the local bridge.

**Step 4: Run test to verify it passes**

Run the focused settings test.
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/ui-setup.ts web/src/types.ts web/src/agent/chat-client.ts
git commit -m "feat: add export root settings and batch path planning"
```

### Task 6: Update docs to match the new export truth

**Files:**
- Modify: `AGENTS.md`
- Modify: `DESIGN.md`
- Modify: `SKILL.md`
- Modify: relevant files under `docs/`

**Step 1: Write the failing doc checklist**

Create a checklist of statements that must be true after the implementation:
- HTML templates are sole rendering source
- screenshots are background export assets
- packaging is product functionality using standard scripts
- user selects products; export is not all-products by default
- output root is user-configured and batches are per project export

**Step 2: Verify current docs fail the checklist**

Run: manual grep review across docs.
Expected: mismatches found.

**Step 3: Write minimal doc updates**

Update docs to match the product model without reintroducing old Pencil-flow assumptions.

**Step 4: Verify docs match implementation**

Run: grep/manual review for the updated phrases.
Expected: consistent wording.

**Step 5: Commit**

```bash
git add AGENTS.md DESIGN.md SKILL.md docs
git commit -m "docs: align export flow with html screenshot packaging pipeline"
```

### Task 7: End-to-end verification

**Files:**
- No new production files required
- Verify existing scripts and tests

**Step 1: Run focused tests**

Run the new/changed targeted test files first.

**Step 2: Run broader validation**

```bash
cd /Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation && npm run test:types
cd /Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation && npm test
cd /Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/web && npm run build
```

Expected: all pass.

**Step 3: Run export dry verification**

Run the screenshot/build path in a controlled local environment and confirm required assets exist before packaging proceeds.

**Step 4: Record evidence**

Capture exact passing commands and any generated artifact directories.

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify html-to-screenshot-to-package export pipeline"
```
