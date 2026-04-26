# MVP 代码整理 + 积分系统 实施方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对 Topic Automation 做全栈代码整理、去掉导航/项目列表、新增基于积分的使用限制系统，保持核心导出流程完整。

**Architecture:** 保留 SQLite 数据库。新增 `user_credits` 表替代 `daily_usage_quotas`。新增 credits middleware 替代现有 quota middleware。前端新增积分显示组件，去掉侧边栏导航。

**Tech Stack:** Express + sql.js (SQLite), Vanilla TypeScript SPA + Vite + Tailwind v4

---

## Task 1: 服务端 — 新增 user_credits 表和辅助函数

**Files:**
- Modify: `server/src/db.ts`

**Step 1: 在 db.ts 的 initDb() 中新增 user_credits 表**

在 `daily_usage_quotas` 表创建语句之后、`saveDb()` 之前，添加：

```sql
CREATE TABLE IF NOT EXISTS user_credits (
  user_id INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 100,
  last_reset_at INTEGER NOT NULL,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Step 2: 为 3 个种子用户初始化积分**

在 seed users 之后添加初始化积分的逻辑：

```typescript
// Seed credits for all users
const creditStmt = db.prepare('INSERT OR IGNORE INTO user_credits (user_id, credits, last_reset_at) VALUES (?, 100, ?)');
const now = Math.floor(Date.now() / 1000);
[1, 2, 3].forEach(uid => {
  creditStmt.bind([uid, now]);
  creditStmt.step();
  creditStmt.reset();
});
creditStmt.free();
```

**Step 3: 新增 credits 辅助函数**

在 db.ts 底部（`getCurrentDate()` 之后）新增：

```typescript
// ========== Credits helpers ==========

/**
 * 计算距离 now 最近的"过去 6 点"的时间戳
 */
function getLastResetPoint(): number {
  const now = new Date();
  const today6am = new Date(now);
  today6am.setHours(6, 0, 0, 0);
  // 如果当前时间在6点之前，取昨天6点
  if (now < today6am) {
    today6am.setDate(today6am.getDate() - 1);
  }
  return Math.floor(today6am.getTime() / 1000);
}

export function getCredits(userId: number): { credits: number; lastResetAt: number } {
  checkAndResetCredits(userId);
  const stmt = db.prepare('SELECT credits, last_reset_at FROM user_credits WHERE user_id = ?');
  stmt.bind([userId]);
  let result = { credits: 100, lastResetAt: 0 };
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result = { credits: row.credits as number, lastResetAt: row.last_reset_at as number };
  }
  stmt.free();
  return result;
}

export function checkAndResetCredits(userId: number): void {
  const stmt = db.prepare('SELECT last_reset_at FROM user_credits WHERE user_id = ?');
  stmt.bind([userId]);
  let lastResetAt = 0;
  if (stmt.step()) {
    lastResetAt = (stmt.getAsObject() as any).last_reset_at as number;
  }
  stmt.free();

  const resetPoint = getLastResetPoint();
  if (lastResetAt < resetPoint) {
    const updateStmt = db.prepare('UPDATE user_credits SET credits = 100, last_reset_at = ? WHERE user_id = ?');
    updateStmt.bind([Math.floor(Date.now() / 1000), userId]);
    updateStmt.step();
    updateStmt.free();
    saveDb();
  }
}

export function deductCredits(userId: number, amount: number): { success: boolean; remaining: number } {
  checkAndResetCredits(userId);
  const current = getCredits(userId);
  if (current.credits < amount) {
    return { success: false, remaining: current.credits };
  }
  const newCredits = current.credits - amount;
  const updateStmt = db.prepare('UPDATE user_credits SET credits = ? WHERE user_id = ?');
  updateStmt.bind([newCredits, userId]);
  updateStmt.step();
  updateStmt.free();
  saveDb();
  return { success: true, remaining: newCredits };
}
```

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 2: 服务端 — 新增 credits middleware 替代 quota middleware

**Files:**
- Create: `server/src/middleware/credits.ts`

**Step 1: 创建 credits middleware**

```typescript
// server/src/middleware/credits.ts
import { Request, Response, NextFunction } from 'express';
import { getCredits, deductCredits } from '../db.js';

const CREDITS_PER_CONVERSATION = 50;

export function creditsMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId || 1;

  // 只对 /chat 和 /image 路径进行积分检查
  if (req.path !== '/chat' && req.path !== '/image') {
    return next();
  }

  const { credits } = getCredits(userId);

  if (credits < CREDITS_PER_CONVERSATION) {
    return res.status(403).json({
      error: '积分不足',
      code: 'CREDITS_EXHAUSTED',
      remainingCredits: credits,
      nextResetAt: getNextResetTime(),
    });
  }

  next();
}

/**
 * 图片生成完成后的扣费入口，供 route 调用
 */
export function deductCreditsAfterGeneration(userId: number): { success: boolean; remaining: number } {
  return deductCredits(userId, CREDITS_PER_CONVERSATION);
}

function getNextResetTime(): string {
  const now = new Date();
  const next6am = new Date(now);
  next6am.setHours(6, 0, 0, 0);
  if (now >= next6am) {
    next6am.setDate(next6am.getDate() + 1);
  }
  return next6am.toISOString();
}
```

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 3: 服务端 — 新增 credits 查询路由

**Files:**
- Create: `server/src/routes/credits.ts`

**Step 1: 创建 credits 路由**

```typescript
// server/src/routes/credits.ts
import { Router } from 'express';
import { getCredits } from '../db.js';

export const creditsRouter = Router();

creditsRouter.get('/', (req, res) => {
  const userId = (req as any).userId || 1;
  const { credits } = getCredits(userId);

  // 计算 nextResetAt
  const now = new Date();
  const next6am = new Date(now);
  next6am.setHours(6, 0, 0, 0);
  if (now >= next6am) {
    next6am.setDate(next6am.getDate() + 1);
  }

  res.json({
    credits,
    maxCredits: 100,
    nextResetAt: next6am.toISOString(),
  });
});
```

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 4: 服务端 — 修改 index.ts 接入 credits 系统

**Files:**
- Modify: `server/src/index.ts`

**Step 1: 替换 import**

把 `import('./middleware/quota.js')` 替换为 `import('./middleware/credits.js')`，同时新增 `creditsRouter` 导入。

具体改动：
- 第 37 行的 import 数组中，将 `quotaMiddleware` 改为导入 `creditsMiddleware`
- 新增导入 `creditsRouter` from `./routes/credits.js`

**Step 2: 替换中间件挂载**

```typescript
// 替换原来的 quotaMiddleware 行
app.use('/api/theme', creditsMiddleware);
```

**Step 3: 挂载 credits 路由**

在 theme 路由组中新增：
```typescript
app.use('/api/theme/credits', creditsRouter);
```

**Step 4: 去掉 index.ts 中重复的 GET /api/auth/users 内联路由（84-97行）**

已有的 `app.use('/api/auth', adminAuthMiddleware, authRouter)` 中 authRouter 已经定义了 GET /users，内联版本是重复的，删除。

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 5: 服务端 — 在 AI 路由中生图完成后扣费

**Files:**
- Modify: `server/src/routes/ai-proxy.ts`

**Step 1: 在图片生成路由成功返回前，调用 deductCreditsAfterGeneration**

在 ai-proxy.ts 的 POST /image 路由中，找到成功返回图片结果的位置，在 `res.json(...)` 之前调用：

```typescript
import { deductCreditsAfterGeneration } from '../middleware/credits.js';

// 在成功生成图片后、返回响应前
const userId = (req as any).userId || 1;
const deductResult = deductCreditsAfterGeneration(userId);

// 在返回的 JSON 中附带 remainingCredits
res.json({
  ...existingResponse,
  remainingCredits: deductResult.remaining,
});
```

**注意:** 具体插入位置需要读取 ai-proxy.ts 的完整代码来确定。找到 POST /image handler 中成功返回的代码路径，在 res.json() 调用前插入扣费逻辑。

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 6: 服务端 — 代码清理

**Files:**
- Delete: `server/src/middleware/quota.ts` (被 credits.ts 替代)
- Delete: `server/src/db/` (空目录)
- Check: `server/src/export-request-yaml.ts` 是否与 `export-build-shared.ts` 重复，如重复则删除

**Step 1:** 删除 `server/src/middleware/quota.ts`

**Step 2:** 删除空目录 `server/src/db/`

**Step 3:** 检查 `export-request-yaml.ts` 的使用情况，如果无引用则删除

**验证:** `cd server && npx tsc --noEmit` 无报错

---

## Task 7: 前端 — 新增 credits 状态管理和 API 客户端

**Files:**
- Create: `web/src/credits.ts`

**Step 1: 创建 credits 模块**

```typescript
// web/src/credits.ts
import { authHeaders } from './auth';

export interface CreditsInfo {
  credits: number;
  maxCredits: number;
  nextResetAt: string;
}

let cachedCredits: CreditsInfo | null = null;

export async function fetchCredits(): Promise<CreditsInfo> {
  const res = await fetch('/api/theme/credits', { headers: authHeaders() });
  if (!res.ok) {
    return { credits: 0, maxCredits: 100, nextResetAt: '' };
  }
  cachedCredits = await res.json();
  return cachedCredits!;
}

export function getCachedCredits(): CreditsInfo | null {
  return cachedCredits;
}

export function updateCreditsDisplay(info: CreditsInfo): void {
  const creditsBar = document.getElementById('creditsBar');
  const creditsFill = document.getElementById('creditsFill');
  const creditsText = document.getElementById('creditsText');

  if (creditsText) {
    creditsText.textContent = `${info.credits} / ${info.maxCredits}`;
  }
  if (creditsFill) {
    const pct = Math.max(0, Math.min(100, (info.credits / info.maxCredits) * 100));
    creditsFill.style.width = `${pct}%`;
    // 颜色根据剩余量变化
    if (pct <= 20) {
      creditsFill.className = 'credits-fill credits-low';
    } else if (pct <= 50) {
      creditsFill.className = 'credits-fill credits-medium';
    } else {
      creditsFill.className = 'credits-fill credits-ok';
    }
  }
  if (creditsBar) {
    creditsBar.dataset.credits = String(info.credits);
  }
}
```

---

## Task 8: 前端 — 在 HTML 中添加积分显示组件

**Files:**
- Modify: `web/index.html` — 在聊天面板顶部插入积分条
- Modify: `web/src/styles.css` — 添加积分条样式

**Step 1: 在 index.html 的 chatPanel 头部区域添加积分显示**

在聊天面板的头部区域（`#chatHeader` 或等效位置）插入积分显示条：

```html
<div id="creditsBar" class="credits-bar">
  <span class="credits-icon">⚡</span>
  <div class="credits-progress">
    <div id="creditsFill" class="credits-fill credits-ok"></div>
  </div>
  <span id="creditsText" class="credits-text">100 / 100</span>
</div>
```

**Step 2: 在 styles.css 中添加积分条样式**

```css
.credits-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin: 8px 16px;
  font-size: 12px;
}

.credits-icon {
  font-size: 14px;
}

.credits-progress {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.credits-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background 0.3s ease;
}

.credits-ok { background: #4ade80; }
.credits-medium { background: #fbbf24; }
.credits-low { background: #ef4444; }

.credits-text {
  color: var(--text-secondary, #9ca3af);
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
}
```

---

## Task 9: 前端 — 在 chat-client 中处理积分耗尽和更新

**Files:**
- Modify: `web/src/agent/chat-client.ts`

**Step 1: 在 chatCompletion() 和 generateImage() 的错误处理中识别 403 CREDITS_EXHAUSTED**

在 chat-client.ts 的 fetch 响应处理中，检查 403 状态码：

```typescript
// 在 chatCompletion 和 generateImage 的 fetch 处理中
if (response.status === 403) {
  const data = await response.json();
  if (data.code === 'CREDITS_EXHAUSTED') {
    // 触发积分不足提示
    showCreditsExhausted(data.remainingCredits, data.nextResetAt);
    throw new Error('CREDITS_EXHAUSTED');
  }
}
```

**Step 2: 从成功的响应中提取 remainingCredits 并更新显示**

在 chat/image 请求成功后，检查响应中的 `remainingCredits` 字段并更新 UI：

```typescript
if (data.remainingCredits !== undefined) {
  updateCreditsDisplay({ credits: data.remainingCredits, maxCredits: 100, nextResetAt: '' });
  fetchCredits(); // 异步刷新完整信息
}
```

---

## Task 10: 前端 — 集成 credits 到 main.ts 启动流程

**Files:**
- Modify: `web/src/main.ts`

**Step 1: 在 DOMContentLoaded 中初始化积分显示**

```typescript
import { fetchCredits, updateCreditsDisplay } from './credits';

// 在 initializeFeatureModules() 之后添加
const creditsInfo = await fetchCredits();
updateCreditsDisplay(creditsInfo);
```

---

## Task 11: 前端 — 去掉侧边栏导航

**Files:**
- Modify: `web/index.html` — 隐藏/删除 sidebar
- Modify: `web/src/main.ts` — 移除 sidebar 相关初始化
- Modify: `web/src/ui-setup.ts` — 移除 sidebar 相关函数（或改为空操作）

**注意:** 这是清理工作，需要仔细操作确保不破坏布局。

**Step 1:** 在 index.html 中，将 `#projectSidebar` 和 `#sidebarDivider` 隐藏（添加 `style="display:none"` 或删除）

**Step 2:** 在 main.ts 中，`initializeRoutingModule()` 不再需要 sidebar 相关逻辑（`populateSidebarProjects`、`sidebarToggleBtn`、`expandProjectSidebar`）

**Step 3:** 保持 `showWorkspaceDirectly()` 的核心逻辑（自动创建/加载项目），但去掉 sidebar 相关调用

**Step 4:** 确保聊天面板自动全宽（不再需要 sidebar 的空间）

---

## Task 12: 全栈验证

**Step 1: 启动服务端**
```bash
cd server && npm run dev
```

**Step 2: 启动前端**
```bash
cd web && npm run dev
```

**Step 3: 验证积分系统**
- GET /api/theme/credits → 返回 `{ credits: 100, maxCredits: 100, nextResetAt: "..." }`
- 发起对话 → 检查积分减少
- 积分不足时 → 403 + 前端提示

**Step 4: 验证完整流程**
- 创建项目 → AI 对话 → 生成图片 → 确认版本 → 导出打包 → 下载

**Step 5: 验证导航已去除**
- 无侧边栏显示
- 布局正常
- 核心功能不受影响
