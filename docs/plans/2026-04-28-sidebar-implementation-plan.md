# Sidebar Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Gemini-style left sidebar navigation with conversation history, favorites, and project restore.

**Architecture:** Server-side SQLite stores conversation snapshots (messages + project state). Frontend sidebar is a flex child before chat-panel, toggling between 60px collapsed and 260px expanded. Auto-save hooks in chat-manager persist state after each message/theme change.

**Tech Stack:** sql.js (server SQLite), vanilla TypeScript + DOM (frontend), Vite, Tailwind CSS

---

## Task 1: Server DB Schema — conversations table

**Files:**
- Modify: `server/src/db.ts` — add `CREATE TABLE conversations` in `initDb()`

**Step 1: Add table creation after user_credits table**

Insert after the user_credits seeding block (~line 165 in db.ts):

```typescript
// Create conversations table for sidebar history
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '未命名项目',
    messages TEXT NOT NULL DEFAULT '[]',
    project_snapshot TEXT NOT NULL DEFAULT '{}',
    image_data TEXT,
    has_generated_theme INTEGER DEFAULT 0,
    is_starred INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
```

**Step 2: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 3: Commit**

```bash
git add server/src/db.ts
git commit -m "feat(server): add conversations table for sidebar history"
```

---

## Task 2: Server CRUD API — conversations routes

**Files:**
- Create: `server/src/routes/conversations.ts`
- Modify: `server/src/index.ts` — register route

**Step 1: Create conversations.ts**

Follow existing route pattern (Router + try/catch + `export { router }`). Implement:

```
GET    /                  → list conversations (id, title, isStarred, hasGeneratedTheme, updatedAt) for current user
GET    /:id               → full detail (messages, projectSnapshot, imageData)
POST   /                  → create new conversation (auto-cleanup if >30)
PUT    /:id               → update (messages, projectSnapshot, title, imageData)
PUT    /:id/star          → toggle is_starred
DELETE /:id               → delete conversation
```

Key implementation details:
- `const userId = (req as any).userId as number` — matches existing auth middleware
- Use `db.prepare(sql).bind([values])` → `.step()` → `.getAsObject()` → `.free()` → `saveDb()` pattern
- POST auto-cleanup: count user's conversations, delete oldest non-starred if ≥ 30
- PUT /star: `UPDATE conversations SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END WHERE id = ? AND user_id = ?`

**Step 2: Register route in index.ts**

```typescript
import { conversationsRouter } from './routes/conversations.js';
// Add after existing route registrations, within the /api/theme middleware stack:
app.use('/api/theme/conversations', conversationsRouter);
```

**Step 3: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 4: Commit**

```bash
git add server/src/routes/conversations.ts server/src/index.ts
git commit -m "feat(server): add conversations CRUD API routes"
```

---

## Task 3: Frontend types + API client

**Files:**
- Modify: `web/src/types.ts` — add ConversationListItem, ConversationDetail, ConversationImageData
- Create: `web/src/api/conversations.ts` — API call wrappers

**Step 1: Add types to types.ts**

```typescript
export interface ConversationListItem {
  id: string;
  title: string;
  hasGeneratedTheme: boolean;
  isStarred: boolean;
  updatedAt: number;
}

export interface ConversationDetail extends ConversationListItem {
  messages: ChatMessage[];
  projectSnapshot: Record<string, unknown>;
  imageData: ConversationImageData | null;
  createdAt: number;
}

export interface ConversationImageData {
  primaryImage?: string;
  headerImage?: string;
  userUploads?: string[];
}
```

**Step 2: Create api/conversations.ts**

Use `fetch('/api/theme/conversations', { headers: authHeaders() })` pattern from existing credits.ts.

Functions: `listConversations()`, `getConversation(id)`, `createConversation(data)`, `updateConversation(id, data)`, `toggleStar(id)`, `deleteConversation(id)`

**Step 3: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/types.ts web/src/api/conversations.ts
git commit -m "feat(web): add conversation types and API client"
```

---

## Task 4: Sidebar DOM + CSS

**Files:**
- Modify: `web/index.html` — add `#sidebarContainer` before `#chatPanel`
- Modify: `web/src/styles.css` — add sidebar styles (~200 lines)

**Step 1: Add sidebar HTML**

In `web/index.html`, inside `.app-container`, before `<div class="chat-panel" id="chatPanel">`:

```html
<div class="sidebar" id="sidebarContainer">
  <div class="sidebar-collapsed" id="sidebarCollapsed">
    <button class="sidebar-icon-btn" id="sidebarToggleBtn" title="展开侧边栏">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <button class="sidebar-icon-btn" id="sidebarNewChatBtn" title="新对话">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <div class="sidebar-spacer"></div>
    <button class="sidebar-icon-btn sidebar-settings-btn" id="sidebarSettingsBtn" title="设置">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  </div>
  <div class="sidebar-expanded" id="sidebarExpanded">
    <div class="sidebar-header">
      <button class="sidebar-icon-btn" id="sidebarCollapseBtn" title="收起">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="sidebar-header-label">收起</span>
    </div>
    <button class="sidebar-new-chat-full" id="sidebarNewChatFullBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      发起新对话
    </button>
    <div class="sidebar-list" id="sidebarList">
      <div class="sidebar-section" id="sidebarStarredSection" style="display:none">
        <div class="sidebar-section-title">★ 收藏</div>
        <div class="sidebar-section-items" id="sidebarStarredItems"></div>
      </div>
      <div class="sidebar-section" id="sidebarHistorySection" style="display:none">
        <div class="sidebar-section-title">🕐 历史记录</div>
        <div class="sidebar-section-items" id="sidebarHistoryItems"></div>
      </div>
    </div>
    <div class="sidebar-bottom">
      <button class="sidebar-settings-full" id="sidebarSettingsFullBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        设置
      </button>
    </div>
  </div>
</div>
```

**Step 2: Add sidebar CSS to styles.css**

Key CSS rules:
- `.sidebar`: `width: 60px; flex: 0 0 60px; transition: width 200ms; display: flex; flex-direction: column; background: #f8f9fa; border-right: 1px solid #e5e7eb; overflow: hidden; height: 100vh;`
- `.sidebar.expanded`: `width: 260px; flex: 0 0 260px;`
- `.sidebar-collapsed`: shown when NOT expanded
- `.sidebar-expanded`: `display: none`; shown when expanded (`.sidebar.expanded .sidebar-expanded { display: flex }`)
- `.sidebar-item`: `padding: 8px 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-radius: 6px;`
- `.sidebar-item.active`: `background: #e8e8ff;`
- `.sidebar-item:hover`: `background: #f0f0f0;`
- `.sidebar-item:hover .sidebar-item-menu`: `display: block;`
- `.sidebar-item-menu`: `display: none;` (the "…" button)
- Ensure chat-panel flex rules are NOT broken — sidebar is just an extra flex child

**Step 3: Verify in browser**

Run: open http://127.0.0.1:5173/
Expected: See collapsed sidebar (60px) with ☰ and ✚ icons on left

**Step 4: Commit**

```bash
git add web/index.html web/src/styles.css
git commit -m "feat(web): add sidebar DOM structure and CSS"
```

---

## Task 5: Sidebar component — DOM interaction + list rendering

**Files:**
- Create: `web/src/components/sidebar.ts`

**Step 1: Implement sidebar.ts**

Functions to implement:
- `initSidebar()` — called from main.ts; sets up event listeners, loads list
- `toggleSidebar()` — toggle `.expanded` class on `#sidebarContainer`
- `renderSidebarList(items: ConversationListItem[])` — render starred + history sections
- `renderSidebarItem(item, container)` — single item with title + "…" menu
- `showItemMenu(itemEl, item)` — show star/delete dropdown
- `setActiveConversation(id: string | null)` — highlight active, clear previous
- `refreshSidebar()` — re-fetch list from API and re-render

Event wiring:
- `#sidebarToggleBtn` / `#sidebarCollapseBtn` → `toggleSidebar()`
- `#sidebarNewChatBtn` / `#sidebarNewChatFullBtn` → `startNewConversation()` (imported from chat-manager)
- `#sidebarSettingsBtn` / `#sidebarSettingsFullBtn` → open settings dialog
- Item click → load conversation + restore
- "…" → star toggle / delete

**Step 2: Wire into main.ts**

Add to imports: `import { initSidebar } from './components/sidebar';`
Add to DOMContentLoaded: `initSidebar();`

**Step 3: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/components/sidebar.ts web/src/main.ts
git commit -m "feat(web): implement sidebar component with list rendering"
```

---

## Task 6: Chat-manager integration — auto-save + new conversation

**Files:**
- Modify: `web/src/chat-manager.ts` — add `startNewConversation()`, `scheduleConversationSave()`, replace `saveChatHistory()`

**Step 1: Add startNewConversation()**

Export a new function:
- `conversationHistory.length = 0`
- Clear `#messagesContainer` innerHTML
- Show `#chatDefaultView`, hide `#chatConversationView`
- Call `collapsePreview()` (import from ui-setup)
- `setCurrentProjectId(null)`
- Update `#chatProjectName` text to "开始新创作"
- Import and call `setActiveConversation(null)` from sidebar

**Step 2: Replace saveChatHistory() with scheduleConversationSave()**

- `saveChatHistory()` is currently a no-op called ~20 times
- Replace its body with debounced save logic:
  - If no active conversation ID → POST to create
  - If has ID → PUT to update
  - 300ms debounce
  - Serialize `conversationHistory` to JSON
  - Get current project from `project-manager` and serialize as `project_snapshot`

**Step 3: Add conversation ID tracking**

- Add `let _activeConversationId: string | null = null;`
- Export `getActiveConversationId()` and `setActiveConversationId(id)`
- After POST creates conversation, store the returned ID

**Step 4: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/chat-manager.ts
git commit -m "feat(web): add auto-save and new conversation to chat-manager"
```

---

## Task 7: Project restore — loading a conversation

**Files:**
- Modify: `web/src/chat-manager.ts` — add `restoreConversation(detail: ConversationDetail)`
- Modify: `web/src/project-manager.ts` — add `restoreFromSnapshot(snapshot)`

**Step 1: Add restoreConversation() to chat-manager**

Called when user clicks a history item:
1. Set `_activeConversationId = detail.id`
2. `conversationHistory.splice(0, conversationHistory.length, ...detail.messages)`
3. Clear and re-render `#messagesContainer` (iterate messages, render each with existing render logic)
4. Show `#chatConversationView`, hide `#chatDefaultView`
5. If `detail.hasGeneratedTheme`:
   - Call `restoreFromSnapshot(detail.projectSnapshot)`
   - Call `expandPreview()` + `setChatPanelWidth(372)`
   - Call `syncColorEditorFromTheme()` (import from color-editor)
6. Call `setActiveConversation(detail.id)` from sidebar

**Step 2: Add restoreFromSnapshot() to project-manager**

- Deserialize Project object from snapshot
- `_projects.set(project.id, project)`
- `setCurrentProjectId(project.id)`
- Apply CSS variables via `setThemeVar()` from theme-engine
- Apply image URLs via `applyThemeImageAssignments()` from theme-engine
- Update `#projectName` and `#chatProjectName`

**Step 3: Run type check**

Run: `npm run test:types`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/chat-manager.ts web/src/project-manager.ts
git commit -m "feat(web): implement conversation restore with project snapshot"
```

---

## Task 8: Polish — delete confirmation, active highlight, settings wiring

**Files:**
- Modify: `web/src/components/sidebar.ts` — delete confirm dialog, active state
- Modify: `web/src/styles.css` — animations, confirm dialog styles

**Step 1: Add delete confirmation**

When user clicks delete in "…" menu:
- Show a simple confirm dialog (`window.confirm` is acceptable for MVP)
- If confirmed → DELETE API call → remove from list → if it was active → `startNewConversation()`

**Step 2: Active conversation highlight**

- `setActiveConversation(id)` adds `.active` class to matching item, removes from others
- Store active ID in sidebar module

**Step 3: Settings button wiring**

- `#sidebarSettingsBtn` and `#sidebarSettingsFullBtn` → open `#settingsModal`

**Step 4: Verify full flow in browser**

1. Refresh page → sidebar shows (collapsed)
2. Click ☰ → sidebar expands, empty list
3. Send a message → conversation auto-saves
4. Generate a theme → conversation saves with theme snapshot
5. Click "新对话" → resets to landing
6. Click previous conversation → restores chat + preview
7. Star a conversation → moves to starred section
8. Delete a conversation → removed from list

**Step 5: Final commit**

```bash
git add web/src/components/sidebar.ts web/src/styles.css
git commit -m "feat(web): polish sidebar with delete confirm, active state, animations"
```

---

## Verification Checklist

- [ ] `npm run test:types` passes
- [ ] `npm test -- --run` — no new failures introduced
- [ ] Sidebar visible on page load (collapsed, 60px)
- [ ] Toggle expand/collapse works
- [ ] New conversation button resets UI
- [ ] Conversation auto-saves after message
- [ ] Theme generation triggers save with snapshot
- [ ] History item click restores conversation
- [ ] Preview panel auto-expands for themed projects
- [ ] Star/unstar moves items between sections
- [ ] Delete removes item with confirmation
- [ ] 30-item limit enforced (oldest non-starred auto-deleted)
