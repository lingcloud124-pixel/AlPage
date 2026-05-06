# Usage Logs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Theme Studio 增加可查询的用户使用记录，覆盖聊天和生图请求，并在后台管理页提供查看入口。

**Architecture:** 在 SQLite 中新增 `usage_logs` 表保存审计记录；在 `ai-proxy` 的聊天和生图入口记录请求开始、结束、耗时、模型、积分和状态；新增管理员接口返回最新记录列表；后台管理页增加“使用记录”标签页和基础筛选。

**Tech Stack:** Express、TypeScript、sql.js、原生后台 HTML/JS、Vitest

---

### Task 1: 失败测试

**Files:**
- Create: `tests/unit/ServerUsageLogs.test.ts`

**Step 1: Write the failing test**

- 断言 `db.ts` 新增 `usage_logs` 表和核心字段
- 断言 `index.ts` 挂载管理员使用记录路由
- 断言 `ai-proxy.ts` 会记录聊天和生图日志
- 断言 `server/admin/index.html` 有“使用记录”标签页和加载函数

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: FAIL，提示缺少 `usage_logs` 表、后台标签页或日志记录调用

### Task 2: 数据层

**Files:**
- Modify: `server/src/db.ts`
- Create: `server/src/usage-logs.ts`

**Step 1: Write the failing test**

- 先依赖 Task 1 已经失败的 schema 断言

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

- 在 `security_config` 之后新增 `usage_logs` 表
- 字段包含：`user_id`、`login_name`、`scene`、`raw_input`、`final_prompt`、`model_provider`、`model_name`、`credits_cost`、`status`、`error_message`、`duration_ms`、`started_at`、`finished_at`
- 在 `usage-logs.ts` 新增：
  - `createUsageLog()`
  - `finalizeUsageLog()`
  - `listUsageLogs()`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: 仍可能部分失败，schema 相关开始变绿

### Task 3: 服务接入

**Files:**
- Modify: `server/src/routes/ai-proxy.ts`
- Create: `server/src/routes/usage-logs.ts`
- Modify: `server/src/index.ts`

**Step 1: Write the failing test**

- 先依赖 Task 1 的 route/调用断言

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: FAIL，缺少路由或调用

**Step 3: Write minimal implementation**

- 聊天入口：
  - 提取最近一条用户消息作为 `raw_input`
  - 记录发送给模型的最终请求体摘要为 `final_prompt`
  - `model_provider = 'chat'`
  - `credits_cost = 0`
- 生图入口：
  - 记录用户 prompt
  - 记录最终构建后的 provider request body
  - `model_provider = image provider`
  - 成功后写入 `credits_cost`
- 新增管理员路由：
  - `GET /api/admin/usage-logs`
  - 支持 `scene`、`userKeyword`、`limit`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: 服务侧断言通过

### Task 4: 后台管理页

**Files:**
- Modify: `server/admin/index.html`

**Step 1: Write the failing test**

- 先依赖 Task 1 的 admin UI 断言

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: FAIL，缺少标签页和列表加载逻辑

**Step 3: Write minimal implementation**

- 增加第三个 tab：`使用记录`
- 增加筛选：
  - 用户关键字
  - 场景
- 增加表格字段：
  - 时间
  - 用户
  - 场景
  - 模型
  - 原始输入
  - 最终 prompt
  - 耗时
  - 积分
  - 状态
- 切换到 tab 时自动调用 `loadUsageLogs()`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts`

Expected: PASS

### Task 5: 综合验证

**Files:**
- Verify: `server/src/db.ts`
- Verify: `server/src/usage-logs.ts`
- Verify: `server/src/routes/usage-logs.ts`
- Verify: `server/src/routes/ai-proxy.ts`
- Verify: `server/admin/index.html`
- Verify: `tests/unit/ServerUsageLogs.test.ts`

**Step 1: Run targeted tests**

Run: `npm test -- --run tests/unit/ServerUsageLogs.test.ts tests/unit/ServerSecurityConfig.test.ts tests/unit/AdminCreditsToggleUi.test.ts`

Expected: PASS

**Step 2: Run build**

Run: `npm run build`

Expected: PASS

**Step 3: Check diagnostics**

- 对修改文件运行诊断，确认没有新增错误

**Step 4: Commit**

```bash
git add server/src/db.ts server/src/usage-logs.ts server/src/routes/usage-logs.ts server/src/routes/ai-proxy.ts server/src/index.ts server/admin/index.html tests/unit/ServerUsageLogs.test.ts docs/plans/2026-05-06-usage-logs-implementation.md
git commit -m "feat: add admin usage logs"
```
