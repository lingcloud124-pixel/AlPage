# 去除导航栏 & 历史功能 — 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 去除侧边栏导航、项目持久化、聊天历史持久化，将产品改造为一次性操作模式（刷新即清空）。保留打包功能（即时打包）、积分系统、模型配置、后台管理。

**Architecture:** 前端删除整个侧边栏 HTML + CSS + JS，聊天历史改为纯内存；后端删除 3 张历史表 + 3 个路由文件，打包功能改为基于请求数据即时执行（不依赖 project_id）。

**Tech Stack:** TypeScript (Express + Vite), SQLite (better-sqlite3), vanilla TS frontend

---

## Phase 1: 后端清理（先清后端，再清前端，避免中间态报错）

### Task 1: 删除后端历史路由文件

**Files:**
- Delete: `server/src/routes/projects.ts`
- Delete: `server/src/routes/messages.ts`
- Delete: `server/src/routes/confirmed-versions.ts`

**Step 1: 删除三个文件**

```bash
rm server/src/routes/projects.ts
rm server/src/routes/messages.ts
rm server/src/routes/confirmed-versions.ts
```

**Step 2: 从 index.ts 移除路由注册**

修改 `server/src/index.ts`：
- 删除 import 语句中这三个路由的引用
- 删除 `app.use('/api/theme/projects', projectsRouter)` 行
- 删除 `app.use('/api/theme/projects', messagesRouter)` 行
- 删除 `app.use('/api/theme/projects', confirmedVersionsRouter)` 行

**Step 3: 验证编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 编译通过（可能有 export-jobs 相关的类型错误，后续 Task 修复）

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(server): remove projects/messages/confirmed-versions routes"
```

---

### Task 2: 清理 db.ts 中的历史表和常量

**Files:**
- Modify: `server/src/db.ts`

**Step 1: 移除表创建语句**

删除以下表的 `CREATE TABLE IF NOT EXISTS` 语句：
- `theme_projects` (~L40-55)
- `theme_chat_messages` (~L59-66)
- `theme_confirmed_versions` (~L71-80)
- `theme_export_jobs` (~L85-99) — 后续会用内存替代

**Step 2: 移除相关常量和函数**

- 删除 `MAX_PROJECTS_PER_USER` 常量
- 删除 `MAX_MESSAGES_PER_PROJECT` 常量
- 删除 `getProjectCount()` 函数
- 删除 `getMessageCount()` 函数
- 删除导出中不再需要的引用

**保留不动：**
- `users` 表
- `model_config` 表
- `security_config` 表
- `user_credits` 表
- `saveDb()`, `backupDb()`, `startBackupScheduler()` — 仍需持久化配置数据
- 所有积分相关函数 (`checkAndResetCredits`, `getCredits`, `deductCredits`)

**Step 3: 验证编译**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(server): remove history tables from db schema"
```

---

### Task 3: 删除 export-jobs-store.ts（DB 层）

**Files:**
- Delete: `server/src/export-jobs-store.ts`

**Step 1: 删除文件**

```bash
rm server/src/export-jobs-store.ts
```

这个文件提供 `listQueuedExportJobs`, `getExportJobById`, `updateExportJob`, `getConfirmedVersionSnapshot` — 全部基于 DB 查询，后续 Task 用内存 store 替代。

**Step 2: 暂不修复引用错误（下一步统一处理）**

---

### Task 4: 改造 export 路由为即时打包模式

**Files:**
- Modify: `server/src/routes/export-jobs.ts`
- Create: `server/src/export-jobs-memory-store.ts`（内存 Job 存储）
- Modify: `server/src/export-job-runner.ts`
- Modify: `server/src/export-build-shared.ts`

**改造思路：**

当前流程：创建 Job → 写入 DB → runner 轮询 → 读 confirmed_version snapshot → 打包 → 更新 DB
新流程：创建 Job → 写入内存 Map → runner 轮询 → 从 Job 数据中直接取快照 → 打包 → 更新内存 Map

**Step 1: 创建内存 store `server/src/export-jobs-memory-store.ts`**

```typescript
import { randomUUID } from 'crypto';

export type ExportJobStatus = 'queued' | 'preparing' | 'capturing' | 'packaging' | 'verifying' | 'completed' | 'failed';

export interface MemoryExportJob {
  id: string;
  userId: number;
  status: ExportJobStatus;
  selectedProducts: string[];
  snapshot: Record<string, unknown>; // 直接携带快照数据
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

const jobs = new Map<string, MemoryExportJob>();

export function createExportJob(data: {
  userId: number;
  selectedProducts: string[];
  snapshot: Record<string, unknown>;
}): MemoryExportJob {
  const job: MemoryExportJob = {
    id: randomUUID(),
    userId: data.userId,
    status: 'queued',
    selectedProducts: data.selectedProducts,
    snapshot: data.snapshot,
    error: null,
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getExportJobById(jobId: string): MemoryExportJob | undefined {
  return jobs.get(jobId);
}

export function listQueuedExportJobs(): MemoryExportJob[] {
  return Array.from(jobs.values()).filter(j => j.status === 'queued');
}

export function updateExportJob(
  jobId: string,
  updates: Partial<Pick<MemoryExportJob, 'status' | 'error' | 'result'>>
): MemoryExportJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (updates.status !== undefined) job.status = updates.status;
  if (updates.error !== undefined) job.error = updates.error;
  if (updates.result !== undefined) job.result = updates.result;
  job.updatedAt = Date.now();
  return job;
}
```

**Step 2: 改造 `export-jobs.ts` 路由**

关键改动：
- 删除 `projectExistsForUser()` 函数（不再查 project 表）
- POST `/export-jobs`：不再需要 projectId / confirmedVersionId，改为接收 snapshot 数据直接创建 Job
- GET `/projects/:id/export-jobs`：删除此路由（没有 project 了）
- GET/POST/PATCH 其他路由：把 DB 查询替换为内存 store 调用
- 删除所有 `db.prepare()` 对 `theme_export_jobs` 表的查询

**Step 3: 改造 `export-job-runner.ts`**

关键改动：
- `getConfirmedVersionSnapshot()` 调用 → 改为直接从 `job.snapshot` 读取
- `import { getConfirmedVersionSnapshot }` → 删除
- `import { listQueuedExportJobs, updateExportJob }` → 改为从 memory store 导入
- `runJob()` 中不再查 DB 取 snapshot，直接用 `job.snapshot`

**Step 4: 验证编译 + 手动测试**

```bash
cd server && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(server): convert export jobs to in-memory store"
```

---

### Task 5: 后端编译验证 + 启动测试

**Step 1: 全量编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 零错误

**Step 2: 启动服务验证**

```bash
cd server && npm run dev
```

验证：
- `http://127.0.0.1:3001/health` 返回 ok
- `http://127.0.0.1:3001/admin/` 管理页正常
- `GET /api/theme/credits` 正常返回积分信息
- 不存在的路由 `/api/theme/projects` 返回 404（预期行为）

**Step 3: Commit**

```bash
git add -A && git commit -m "chore(server): verify backend compiles and starts after history removal"
```

---

## Phase 2: 前端清理

### Task 6: 删除侧边栏 HTML

**Files:**
- Modify: `web/index.html`

**Step 1: 删除侧边栏区域**

删除整个 `<aside class="project-sidebar" id="projectSidebar">` 及其内容（约 L16-58）

**Step 2: 删除分割线**

删除 `<div class="pane-divider pane-divider-sidebar" id="sidebarDivider">` （约 L59）

**Step 3: 删除聊天头部的侧边栏相关按钮**

在 chat-header 中：
- 保留 `brand-header` 区域中的 `chatProjectName`
- 删除 `sidebarToggleBtn` 按钮（展开/收起侧栏的汉堡按钮）
- 删除 `projectActionBtn` 和 `projectActionMenu`（重命名/置顶/删除菜单）
- 保留 `landing-topbar`（品牌标题 + 积分芯片）—— 这是用户确认保留的
- `landingSidebarToggleBtn` 随 sidebar 一并删除（它在 aside 内部，已随 aside 删除）

**Step 4: 删除删除确认弹窗**

删除 `<div class="modal-overlay" id="deleteConfirmModal">` 整个弹窗（仅侧边栏使用）

**Step 5: 验证页面能加载**

```bash
cd web && npm run dev
```

页面可能样式混乱，但不应有 JS 白屏错误。

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor(web): remove sidebar HTML, project action menu, delete modal"
```

---

### Task 7: 删除侧边栏 CSS

**Files:**
- Modify: `web/src/styles.css`

**Step 1: 删除侧边栏 CSS 变量**

删除 `--sidebar-panel-bg`, `--sidebar-color`, `--sidebar-icon-color` 变量声明（注意：`theme-variables.css` 中也有 sidebar 变量，那些是主题引擎的，不要动）

**Step 2: 删除侧边栏组件样式**

删除以下选择器的全部规则块：
- `.project-sidebar` 及其所有状态变体（`.collapsed`, `.landing-sidebar`, `.landing-compact`）
- `.sidebar-brand-*`
- `.sidebar-new-btn`, `.sidebar-new-btn-icon`
- `.sidebar-project-list`, `.sidebar-project-item`, `.sidebar-project-name`, `.sidebar-project-menu-*`
- `.sidebar-toggle-btn`（仅 app UI 的，不影响主题模板的）
- `.sidebar-settings-btn`
- `.sidebar-bottom-row`
- `.pane-divider-sidebar`
- `.landing-sidebar`, `.landing-compact`
- `.landing-topbar`（仅 app 品牌栏的样式，如果头部保留则保留此样式）
- `.landing-brand-*`, `.landing-credits-chip`, `.landing-credits-spark`

**⚠️ 不要删除的选择器（属于主题预览模板）：**
- `web/src/templates/` 目录下的所有文件
- `.sidebar-panel`, `.nav-item` 等在预览模板中使用的样式

**Step 3: 删除 light theme 覆盖中对应的侧边栏样式**

删除 `body[data-ui-theme="light"]` 中的 `.project-sidebar`, `.sidebar-*` 覆盖规则

**Step 4: 删除响应式断点中的侧边栏样式**

删除 `@media` 查询中的 `.project-sidebar`, `.landing-sidebar`, `.landing-compact` 覆盖

**Step 5: 验证页面渲染**

```bash
cd web && npm run dev
```

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor(web): remove sidebar CSS (~300 lines)"
```

---

### Task 8: 清理前端 JS — 侧边栏逻辑

**Files:**
- Modify: `web/src/main.ts`
- Modify: `web/src/ui-setup.ts`
- Modify: `web/src/project-manager.ts`

**Step 1: main.ts 清理**

删除/注释：
- `newProjectBtn` 事件监听器（新建项目按钮）
- `brandHeader` 点击 → `showWorkspaceLandingState()`（品牌头点击回首页）
- `sidebarToggleBtn` 事件监听器（展开/收起侧栏）
- `sidebarBrandCollapseBtn` 事件监听器（收起侧栏）
- `landingSidebarToggleBtn` 事件监听器（landing 模式展开）
- `await populateSidebarProjects(...)` 调用
- `closeAllProjectMenus` 全局点击监听器
- `showWorkspace()` / `showWorkspaceLandingState()` 中对 sidebar class 的操作（`.landing-sidebar`, remove/add）

保留：
- `showWorkspaceDirectly()` 的核心逻辑（初始化工作区）
- `initializeFeatureModules()` 调用
- credits 获取逻辑

**Step 2: ui-setup.ts 清理**

删除函数：
- `collapseProjectSidebar()`
- `expandProjectSidebar()`
- `compactLandingSidebar()`
- `setupResizableDivider()`（sidebar 分割线拖拽）

修改 `setupCollapsibleColorPanel()`：
- 移除对 sidebar collapsed 状态的读写

修改 `setupProjectActionMenu()`：
- 整个函数删除（项目操作菜单：重命名/置顶/删除）
- 或者如果 chat-manager 还引用它，将其改为空操作

**Step 3: project-manager.ts 清理**

删除：
- `SidebarDeps` 接口
- `populateSidebarProjects()` 函数
- `createProjectItem()` 函数
- `closeAllProjectMenus()` 函数
- `hasProjectChatHistory()` 函数

保留：
- `listProjects()`, `saveProject()`, `createProject()`, `deleteProject()` — 暂时保留，后续 Task 10 清理
- 所有与颜色/preset 相关的函数
- `getCurrentProjectId()`, `setCurrentProjectId()` — 暂时保留，打包流程可能还需要

**Step 4: 验证编译**

```bash
cd web && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(web): remove sidebar JS logic from main/ui-setup/project-manager"
```

---

### Task 9: 改造聊天历史为纯内存

**Files:**
- Modify: `web/src/chat-manager.ts`

**Step 1: 改造 saveChatHistory**

将 `saveChatHistory()` 改为空操作（不再 POST 到后端）：

```typescript
export async function saveChatHistory(): Promise<void> {
  // 不再持久化到服务器，会话内 conversationHistory 数组即为内存存储
}
```

**Step 2: 改造 loadChatHistory**

将 `loadChatHistory()` 改为返回空数组（不再 GET 后端）：

```typescript
export async function loadChatHistory(): Promise<Array<{ role: string; content: string; timestamp: number }>> {
  return [];
}
```

**Step 3: 改造 loadAndRenderChatHistory**

改为直接显示默认空聊天视图（因为没有历史可加载）：

```typescript
export async function loadAndRenderChatHistory(messagesContainer: HTMLElement | null): Promise<void> {
  if (!messagesContainer) return;
  conversationHistory.length = 0;
  showDefaultChatView();
  messagesContainer.innerHTML = '';
}
```

**Step 4: 验证编译 + 页面功能测试**

```bash
cd web && npx tsc --noEmit
```

手动测试：发送消息 → 刷新 → 消息清空（预期行为）

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(web): convert chat history to in-memory only"
```

---

### Task 10: 改造打包流程（去 project_id 依赖）

**Files:**
- Modify: `web/src/package-manager.ts`
- Modify: `web/src/project-manager.ts`

**Step 1: package-manager.ts 改造**

找到打包发起时创建 export job 的 `fetch` 调用（POST `/api/theme/export-jobs`），改造请求体：

旧请求体：
```json
{
  "projectId": "...",
  "confirmedVersionId": "...",
  "selectedProducts": ["mk", "ekp_v17"]
}
```

新请求体：
```json
{
  "selectedProducts": ["mk", "ekp_v17"],
  "snapshot": {
    "name": "当前主题名",
    "nameEn": "current-theme",
    "templateType": "light-ui",
    "colors": { ... },
    "bgImageUrl": "...",
    "headerBgImageUrl": "...",
    "visualContext": "..."
  }
}
```

snapshot 数据从当前页面状态实时收集（localStorage、DOM、内存变量）。

**Step 2: project-manager.ts 继续清理**

删除不再需要的后端 API 调用函数：
- `listProjects()` — 不再有项目列表
- `saveProject()` — 不再保存项目
- `createProject()` — 不再创建项目
- `deleteProject()` — 不再删除项目

保留（如果打包流程仍需要）：
- `getCurrentProjectId()` — 改为生成临时 ID（用 `crypto.randomUUID()` 或 `Date.now().toString()`）
- `setCurrentProjectId()` — 仍在内存中使用
- 所有颜色/preset 相关函数

**Step 3: 验证编译**

```bash
cd web && npx tsc --noEmit
```

**Step 4: 手动端到端测试**

1. 打开页面
2. 发送主题需求，AI 回复
3. 点击"主题下载"按钮
4. 选择产品，开始打包
5. 验证打包流程正常执行

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(web): adapt packaging flow to work without project persistence"
```

---

## Phase 3: 集成验证

### Task 11: 全量编译 + 启动验证

**Step 1: 后端编译**

```bash
cd server && npx tsc --noEmit
```

**Step 2: 前端编译**

```bash
cd web && npx tsc --noEmit
```

**Step 3: 启动全部服务**

```bash
npm run dev:all
```

**Step 4: 功能验证清单**

- [ ] 页面正常加载，无侧边栏
- [ ] 聊天功能正常（发送消息 → AI 回复）
- [ ] 刷新页面 → 聊天记录清空
- [ ] "主题下载"按钮可用
- [ ] 打包流程正常执行
- [ ] 积分扣除正常
- [ ] 后台管理页 `/admin/` 正常
- [ ] 模型配置页正常
- [ ] 用户管理页正常

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: verify full integration after sidebar/history removal"
```

---

### Task 12: 清理残留引用

**Files:**
- Various: 搜索所有对已删除函数/路由的引用

**Step 1: 全局搜索残留引用**

搜索以下关键词，确保没有遗漏：
- `populateSidebarProjects`
- `SidebarDeps`
- `createProjectItem`
- `closeAllProjectMenus`
- `hasProjectChatHistory`
- `theme_projects`
- `theme_chat_messages`
- `theme_confirmed_versions`
- `theme_export_jobs`
- `/api/theme/projects`（路由调用）
- `MAX_PROJECTS_PER_USER`
- `MAX_MESSAGES_PER_PROJECT`
- `projectExistsForUser`
- `getConfirmedVersionSnapshot`

**Step 2: 逐个清理找到的残留引用**

**Step 3: 最终编译验证**

```bash
cd server && npx tsc --noEmit
cd web && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: clean up residual references to removed history features"
```

---

## Phase 4: 数据库迁移

### Task 13: 删除旧数据库中的历史表（可选）

**注意：** SQLite 的 `CREATE TABLE IF NOT EXISTS` 意味着已存在的数据库文件中仍然保留旧表。可以选择：

**选项 A：** 不处理（旧表留在 DB 中，不影响功能，无代码引用它们）
**选项 B：** 在 `db.ts` 的 schema 初始化中添加 `DROP TABLE IF EXISTS` 语句

建议选择 A，避免意外数据丢失风险。如果需要完全干净，可以在 `db.ts` 初始化后添加：

```typescript
// Clean up legacy tables (safe to run, no-op if tables don't exist)
db.run(`DROP TABLE IF EXISTS theme_export_jobs`);
db.run(`DROP TABLE IF EXISTS theme_confirmed_versions`);
db.run(`DROP TABLE IF EXISTS theme_chat_messages`);
db.run(`DROP TABLE IF EXISTS theme_projects`);
```

---

## ⚠️ 绝对不要动的文件

以下文件中的 `sidebar` 相关代码是 **OA 产品主题预览模板**，不是 App 自身 UI：

- `web/src/templates/theme-variables.css`
- `web/src/templates/sidebar.html`
- `web/src/templates/sidebar.css`
- `web/src/templates/desktop.html`
- `web/src/templates/desktop.css`
- `web/src/theme/color-utils.ts`
- `web/src/theme-engine.ts`
- `web/src/components/color-editor.ts`
- `web/src/tools/contrast-validator.ts`
- `web/src/agent/system-prompt.ts`
- `web/src/tailwind.css`

这些文件中的 `--sidebar-panel-bg`, `--sidebar-color` 等变量是生成主题用的，与本次改造无关。
