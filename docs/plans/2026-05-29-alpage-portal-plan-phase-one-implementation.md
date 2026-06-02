# AlPage 第一阶段实施计划：PortalPlan 与行业案例库

> 日期：2026-05-29
> 依据：`docs/internal/PRODUCT.md`、`docs/internal/PORTAL-PLAN.md`、`docs/PRD-产品使用流程.md`

---

## 1. 目标

第一阶段目标是把文档中的产品主线落到可实施的代码结构：以 `PortalPlan` 作为唯一事实源，接入三层编辑模型，并建立保存门户时自动静默沉淀到 SQLite 行业案例库的基础链路。

本阶段不追求一次性完成复杂智能生成，而是先建立稳定的数据模型、状态流和服务端存储边界。

---

## 2. 范围

### 本阶段包含

- 建立 `PortalPlan` 类型
- 将现有 `portalProfile`、`portalSummary`、`portalDraft`、`workspace` 收敛到 `PortalPlan` 方向
- 扩展工作区规则层，覆盖卡片区域位置和大小
- 为配置面板预留三层编辑入口
- 新增 SQLite 行业案例库表
- 新增行业案例保存与检索 API
- 保存门户时静默沉淀当前 `PortalPlan`
- 将用户可见主产品和后台 admin 命名逐步切换为 AlPage

### 本阶段不包含

- 复杂全文搜索
- 默认脱敏和精细权限
- 高级案例库运营后台
- 多人协作审批
- 大规模卡片库扩展
- 完整重构导出链路

---

## 3. 实施顺序

```text
类型与状态模型
→ PortalPlan 与工作区规则映射
→ 服务端 SQLite 案例库
→ 保存门户时静默沉淀案例
→ 三层配置 UI 入口
→ AlPage 命名切换
→ 测试与一致性验证
```

---

## 4. 前端数据模型

### 4.1 修改 `web/src/types.ts`

新增正式 `PortalPlan` 相关类型：

- `PortalPlan`
- `PortalEnterpriseProfile`
- `PortalThemeLayer`
- `PortalWorkspaceRuleLayer`
- `PortalCardContentLayer`
- `PortalCardPlacement`
- `PortalRegion`
- `PortalEditHistoryItem`
- `PortalIndustryCase`

`PortalWorkspaceRuleLayer` 需要覆盖：

- cardRadius
- cardGap
- cardDensity
- shadowStyle
- gridColumns
- rowHeight
- layoutMode
- regions
- cardPlacements

`cardPlacements` 与现有 `WorkspaceItem` 的映射关系：

- `column` -> `WorkspaceItem.x`
- `row` -> `WorkspaceItem.y`
- `columnSpan` -> `WorkspaceItem.w`
- `rowSpan` -> `WorkspaceItem.h`
- `minColumnSpan` -> `WorkspaceItem.minW`
- `maxColumnSpan` -> `WorkspaceItem.maxW`
- `minRowSpan` -> `WorkspaceItem.minH`
- `maxRowSpan` -> `WorkspaceItem.maxH`

### 4.2 修改 `web/src/project-manager.ts`

当前 `Project` 已有：

- `portalProfile`
- `portalSummary`
- `portalDraft`
- `portalResult`
- `workspace`

本阶段新增：

- `portalPlan?: PortalPlan`

同时保留现有字段作为过渡兼容，但新逻辑优先读写 `portalPlan`。

建议新增函数：

- `createPortalPlanFromProject(project)`
- `applyPortalPlanToProject(project, portalPlan)`
- `syncWorkspaceFromPortalPlan(portalPlan)`
- `syncPortalPlanFromWorkspace(project)`

核心原则：

- 预览和保存最终都应能从 `portalPlan` 派生
- 工作区拖拽、缩放结果要能回写到 `portalPlan.workspaceRuleLayer.cardPlacements`
- 卡片标题、摘要、列表项要能回写到 `portalPlan.cardContentLayer.cards`

---

## 5. 工作区规则层

### 5.1 现有基础

当前已有：

- `WorkspaceSettings`
- `WorkspaceItem`
- `DEFAULT_WORKSPACE_SETTINGS`
- `DEFAULT_WORKSPACE_ITEMS`
- `createWorkspaceConfigFromPortalDraft()`

这些已经覆盖了位置和大小能力：

- `x`
- `y`
- `w`
- `h`
- `minW`
- `minH`
- `maxW`
- `maxH`

### 5.2 本阶段目标

不要另起一套布局系统，而是把现有 workspace 布局能力正式纳入 `PortalPlan.workspaceRuleLayer`。

需要补齐：

- 从 `PortalPlan.workspaceRuleLayer.cardPlacements` 生成 `WorkspaceItem[]`
- 从用户拖拽 / 缩放后的 `WorkspaceItem[]` 回写 `cardPlacements`
- 配置面板后续调整卡片大小和位置时，也写入 `cardPlacements`

---

## 6. 三层配置面板

### 6.1 第一阶段 UI 边界

第一阶段先建立入口和状态，不追求所有控件完整。

配置面板包含三个 tab：

- 主题
- 工作区规则
- 卡片内容

其中工作区规则 tab 至少要表达：

- 卡片间距
- 卡片圆角
- 卡片密度
- 当前卡片位置和大小来自工作区布局
- 用户可通过拖拽和缩放调整卡片区域位置与大小

### 6.2 交互规则

- 对话区和配置面板互斥显示
- 打开配置面板时收起 Agent 对话
- 返回对话时关闭配置面板
- 配置面板所有修改写回同一份 `PortalPlan`

---

## 7. 服务端行业案例库

### 7.1 修改 `server/src/db.ts`

新增 SQLite 表：

```sql
CREATE TABLE IF NOT EXISTS portal_industry_cases (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  enterprise_summary TEXT NOT NULL DEFAULT '',
  culture_keywords TEXT NOT NULL DEFAULT '[]',
  business_keywords TEXT NOT NULL DEFAULT '[]',
  portal_purpose TEXT NOT NULL DEFAULT '',
  theme_direction TEXT NOT NULL DEFAULT '',
  workspace_rule_mode TEXT NOT NULL DEFAULT '',
  card_content_mode TEXT NOT NULL DEFAULT '',
  keyword_text TEXT NOT NULL DEFAULT '',
  portal_plan_snapshot TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

建议索引：

```sql
CREATE INDEX IF NOT EXISTS idx_portal_industry_cases_industry_updated
ON portal_industry_cases(industry, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_industry_cases_user_updated
ON portal_industry_cases(user_id, updated_at DESC);
```

### 7.2 新增路由

建议新增：

- `server/src/routes/portal-cases.ts`

API：

- `POST /api/theme/portal-cases`
  - 保存当前 `PortalPlan` 快照为行业案例
- `GET /api/theme/portal-cases?industry=&keywords=`
  - 按行业 + 关键词检索案例

检索规则第一版：

- industry 精确或近似匹配
- keywords 拆分后在 `keyword_text` 中做简单包含匹配
- 按 `updated_at DESC` 返回
- 默认限制返回 5 条

安全边界：

- 必须走 `authMiddleware`
- 不接收 SQL 片段
- 查询参数只作为绑定值使用
- 返回时不暴露不必要的用户信息

---

## 8. 保存门户时静默沉淀

### 8.1 前端保存动作

当前已有 `markPortalResultSaved(project)`。

后续保存门户时应做：

1. 更新本地 `portalResult.savedAt`
2. 保存项目 / 工作区状态
3. 调用 `POST /api/theme/portal-cases`
4. 不显示“已沉淀案例”的额外提示

如果案例沉淀失败：

- 不阻止门户保存成功
- 可记录到 console 或后端日志
- 不打断用户流程

### 8.2 案例快照来源

优先使用：

- `project.portalPlan`

过渡期 fallback：

- `portalProfile`
- `portalSummary`
- `portalDraft`
- `workspace`
- `colors`
- `bgImageUrl`
- `headerBgImageUrl`

---

## 9. AlPage 命名切换

### 9.1 前端主 UI

逐步替换用户可见文案：

- Theme Studio -> AlPage
- 主题自动化 -> AlPage
- Theme Agent -> Portal Agent

### 9.2 后台 admin

覆盖 `server/admin/index.html` 中的用户可见名称：

- 标题
- 页面 header
- 登录/配置说明
- 帮助文案

注意：

- 数据库文件名、localStorage key、历史测试名称可以暂时保留，不在第一阶段强制迁移
- 用户可见文案优先改，底层兼容名后续统一处理

---

## 10. 测试计划

### 10.1 单元测试

建议新增或更新测试：

- `PortalPlan` 类型和 workspace 映射测试
- 从 `WorkspaceItem` 回写 `cardPlacements` 的测试
- 保存门户时调用案例沉淀接口的测试
- 案例检索参数构造测试
- AlPage 文案测试，覆盖主 UI 和 admin 页面

### 10.2 服务端测试

覆盖：

- 初始化时创建 `portal_industry_cases` 表
- 保存案例成功
- 按行业检索成功
- 按关键词检索成功
- 无 SQL 注入拼接风险
- 未登录请求被拒绝

### 10.3 验证命令

```bash
npm test
npm run test:types
```

如只跑相关测试：

```bash
npx vitest run tests/unit/<新增测试文件>.test.ts
```

---

## 11. 第一阶段验收标准

- `PortalPlan` 类型存在，并覆盖企业画像、主题层、工作区规则层、卡片内容层和编辑历史
- 工作区规则层包含卡片区域位置和大小
- 现有 workspace 的拖拽、缩放数据可映射到 `PortalPlan.workspaceRuleLayer.cardPlacements`
- 保存门户时可静默写入 SQLite 行业案例库
- 行业案例库可按行业 + 关键词返回基础结果
- 用户可见主产品和 admin 页面逐步显示 AlPage
- 当前有效产品文档和实现计划都围绕 AlPage / Portal Agent / PortalPlan 展开

---

## 12. 建议下一步

下一步进入代码实施时，优先顺序为：

1. `web/src/types.ts` 增加 `PortalPlan` 类型
2. `web/src/project-manager.ts` 增加 `portalPlan` 和 workspace 映射函数
3. `server/src/db.ts` 增加 `portal_industry_cases` 表和索引
4. 新增 `server/src/routes/portal-cases.ts`
5. 在 `server/src/index.ts` 挂载案例库路由
6. 接入保存门户时的静默沉淀调用
7. 更新主 UI 与 admin 的 AlPage 文案
8. 补测试并运行 `npm test`、`npm run test:types`
