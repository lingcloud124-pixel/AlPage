# 移除 confirmed-versions 持久化层

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除 confirmed-versions 中间存储层，前端 snapshot 直接透传给 export-jobs 接口，去除 2MB 体积限制。

**Architecture:** 将现有的两步导出流程（POST confirmed-versions → POST export-jobs）合并为单步（POST export-jobs 带 inline snapshot）。删除 confirmed-versions 相关的服务端路由、存储模块和前端 API 客户端。export-jobs 路由直接接受 `projectSnapshot` 字段。

**Tech Stack:** Express.js (server), TypeScript (frontend), SQLite (better-sqlite3)

---

### Task 1: 服务端 — 重写 export-jobs 路由，接受 inline snapshot

**Files:**
- Modify: `server/src/routes/export-jobs.ts`

**Step 1: 修改 POST /export-jobs 路由**

移除 `getConfirmedVersionByIdAndUser` 导入。将 `POST /export-jobs` 改为直接从 `req.body` 中读取 `projectSnapshot`，替代通过 `confirmedVersionId` 查库。

请求体新格式：
```json
{
  "projectId": "string",
  "selectedProducts": ["mk", "ekp_v17"],
  "projectSnapshot": { "projectId": "...", "name": "...", "colors": {...}, ... }
}
```

关键改动：
- 删除 `import { getConfirmedVersionByIdAndUser } from '../confirmed-versions-store.js'`
- 删除 `import { validateExportSnapshotSize } from '../export-job-validation.js'`（不再做体积校验）
- `POST /export-jobs` 中：读取 `body.projectSnapshot`，校验它是个对象且 `projectId` 匹配路径参数（如果传了的话）
- `createExportJob` 调用：不再传 `confirmedVersionId`，直接传 snapshot
- 响应体移除 `confirmedVersionId` 字段

**Step 2: 确认 GET /export-jobs/:id 和 PATCH /export-jobs/:id 响应体移除 confirmedVersionId**

在 GET 和 PATCH 响应中，将 `confirmedVersionId: job.confirmedVersionId` 改为删除该字段。

**Step 3: 验证**

```bash
cd server && npx tsc --noEmit
```

---

### Task 2: 服务端 — 清理 export-jobs-memory-store

**Files:**
- Modify: `server/src/export-jobs-memory-store.ts`

**Step 1: 移除 confirmedVersionId 字段**

- `MemoryExportJob` 接口：删除 `confirmedVersionId: string` 字段
- `ExportJobRow` 类型：删除 `confirmed_version_id: string`
- `mapRowToJob`：删除 `confirmedVersionId` 映射
- `createExportJob` 参数：删除 `confirmedVersionId` 参数
- SQL INSERT：删除 `confirmed_version_id` 列

DB 中 `confirmed_version_id` 列保留（已有数据兼容），新插入时用空字符串 `''`。

**Step 2: 验证**

```bash
cd server && npx tsc --noEmit
```

---

### Task 3: 服务端 — 删除 confirmed-versions 模块和路由注册

**Files:**
- Delete: `server/src/confirmed-versions-store.ts`
- Delete: `server/src/routes/confirmed-versions.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/db.ts`
- Modify: `server/src/export-job-validation.ts`

**Step 1: 删除两个文件**

```bash
rm server/src/confirmed-versions-store.ts
rm server/src/routes/confirmed-versions.ts
```

**Step 2: 清理 index.ts**

删除 `index.ts` 中：
- Line 31: `{ confirmedVersionsRouter }` 导入
- Line 50: `import('./routes/confirmed-versions.js')`
- Line 138: `app.use('/api/theme', confirmedVersionsRouter)`

**Step 3: 清理 db.ts**

删除 `theme_confirmed_versions` 表的 CREATE TABLE 语句（约 line 228-236）。保留 `theme_export_jobs` 表中的 `confirmed_version_id` 列定义（向后兼容）。

**Step 4: 清理 export-job-validation.ts**

删除 `MAX_EXPORT_SNAPSHOT_BYTES` 常量和 `validateExportSnapshotSize` 函数（约 line 9 和 line 32-51）。保留 `normalizeAndValidateSelectedProducts` 函数和 `SUPPORTED_EXPORT_PRODUCTS`。

**Step 5: 验证**

```bash
cd server && npx tsc --noEmit
```

---

### Task 4: 前端 — 重写 online-export.ts API 客户端

**Files:**
- Modify: `web/src/export/online-export.ts`

**Step 1: 重写为单步导出**

- 删除 `createConfirmedVersion` 函数（约 line 50-66）
- 删除 `listConfirmedVersions` 函数（约 line 68-73）
- 修改 `CreateServerExportJobInput`：删除 `confirmedVersionId`，增加 `projectSnapshot: ConfirmedProjectSnapshot`
- 修改 `createServerExportJob`：POST body 改为 `{ projectId, projectSnapshot, selectedProducts }`
- 保留 `buildConfirmedProjectSnapshot`（仍用于构建 snapshot）
- 保留 `themeApiFetch` 辅助函数

**Step 2: 验证**

```bash
cd web && npx tsc --noEmit
```

---

### Task 5: 前端 — 简化 export-bridge.ts

**Files:**
- Modify: `web/src/export/export-bridge.ts`

**Step 1: 合并 getFetchBridge 两步为一步**

`getFetchBridge().enqueueExportJob` 当前做了两步：
1. POST `/projects/:id/confirmed-versions` (body: `{ projectSnapshot }`)
2. POST `/export-jobs` (body: `{ projectId, confirmedVersionId, selectedProducts }`)

改为一步：
1. POST `/export-jobs` (body: `{ projectId, projectSnapshot: payload.batch.projectSnapshot, selectedProducts }`)

错误处理保持一致（解析 error JSON、设置 status）。

**Step 2: 验证**

```bash
cd web && npx tsc --noEmit
```

---

### Task 6: 前端 — 简化 executor.ts 导出流程

**Files:**
- Modify: `web/src/tools/executor.ts`

**Step 1: 简化 createBackendExportJob**

当前 `createBackendExportJob`（L413-438）做了两步：
```ts
const confirmedVersion = await createConfirmedVersion(projectId, buildConfirmedProjectSnapshot(project));
const exportJob = await createServerExportJob({ projectId, confirmedVersionId: confirmedVersion.id, selectedProducts });
```

改为一步：
```ts
const snapshot = buildConfirmedProjectSnapshot(project);
const exportJob = await createServerExportJob({ projectId, projectSnapshot: snapshot, selectedProducts });
```

删除 `createConfirmedVersion` 导入。

**Step 2: 清理 runExportJobTool 中的 confirmedVersionId 引用**

`runExportJobTool`（L440-511）中所有 `confirmedVersionId: created.confirmedVersionId` 引用删除。只保留 `jobId` 和 `status`。

**Step 3: 更新 import**

删除 `import { buildConfirmedProjectSnapshot, createConfirmedVersion, createServerExportJob }` 中的 `createConfirmedVersion`。

**Step 4: 验证**

```bash
cd web && npx tsc --noEmit
```

---

### Task 7: 前端 — 清理类型定义和状态辅助函数

**Files:**
- Modify: `web/src/types.ts`
- Modify: `web/src/project-manager.ts`
- Modify: `web/src/export/online-export-state.ts`

**Step 1: types.ts**

- `ConfirmedProjectSnapshot` 接口（L141-152）：**保留**（仍用于 inline payload 类型）
- `ConfirmedProjectVersion` 接口（L154-160）：**删除**
- `ServerExportJob.confirmedVersionId`（L180）：**删除该字段**

**Step 2: project-manager.ts**

- 删除 `import type { ..., ConfirmedProjectVersion, ... }` 中的 `ConfirmedProjectVersion`
- 删除 `Project` 接口中 `confirmedVersions?: ConfirmedProjectVersion[]` 字段（L18）

**Step 3: online-export-state.ts**

- 删除 `appendConfirmedVersionToProject` 函数（L4-10）
- 删除 `setConfirmedVersionsOnProject` 函数（L12-18）
- 删除 `ConfirmedProjectVersion` 导入
- 保留 `appendServerExportJobToProject` 和 `upsertServerExportJobOnProject`

**Step 4: 验证**

```bash
cd web && npx tsc --noEmit
```

---

### Task 8: 测试文件更新

**Files:**
- Delete: `tests/unit/ServerConfirmedVersionContracts.test.ts`
- Modify: `tests/unit/WebOnlineExport.test.ts`
- Modify: `tests/unit/WebExportBridge.test.ts`
- Modify: `tests/unit/WebExecutorExportTools.test.ts`
- Modify: `tests/unit/WebOnlineExportState.test.ts`
- Modify: `tests/unit/ServerExportJobPersistence.test.ts`
- Modify: `tests/unit/WebExportJobs.test.ts`

**Step 1: 删除过时的测试**

```bash
rm tests/unit/ServerConfirmedVersionContracts.test.ts
```

**Step 2: 更新 WebOnlineExport.test.ts**

- 移除所有 `createConfirmedVersion` 相关测试
- 移除 `confirmedVersionId` 相关断言
- 更新 `createServerExportJob` 调用为新签名（带 `projectSnapshot`）

**Step 3: 更新 WebExportBridge.test.ts**

- 移除 `/confirmed-versions` 端点的 mock
- 更新 `/export-jobs` mock 以接受 `projectSnapshot` 字段

**Step 4: 更新 WebExecutorExportTools.test.ts**

- 移除 `confirmedVersionId` 相关断言

**Step 5: 更新 WebOnlineExportState.test.ts**

- 移除 `appendConfirmedVersionToProject` 和 `setConfirmedVersionsOnProject` 测试

**Step 6: 更新 ServerExportJobPersistence.test.ts**

- 移除 `theme_confirmed_versions` 表存在性断言

**Step 7: 运行全部测试**

```bash
npm test
```

---

### Task 9: 全量编译验证

**Step 1: 服务端编译**

```bash
cd server && npx tsc --noEmit
```

**Step 2: 前端编译**

```bash
cd web && npx tsc --noEmit
```

**Step 3: 运行测试套件**

```bash
npm test
```

**Step 4: 启动 dev server 做冒烟测试**

```bash
cd web && npm run dev
```

访问页面，确认无控制台错误。触发一次导出，确认新的单步流程正常工作。
