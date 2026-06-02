# PortalPlan 主链路设计

> 日期：2026-05-30  
> 范围：AlPage 第一阶段产品实现中的 PortalPlan 主链路  
> 依据：`docs/internal/PRODUCT.md`、`docs/internal/PRODUCT-ALIGNMENT.md`、`docs/internal/PORTAL-PLAN.md`

---

## 1. 背景

AlPage 的目标产品形态是面向售前人员的 Portal Agent 工作台。当前代码已经具备对话、主题生成、工作区预览、GridStack 编辑和项目持久化等基础，但核心产物仍偏向旧的 project/theme/workspace 组合。

本设计的目标是先把产品主链路切到 `PortalPlan`：用户通过对话输入客户需求，系统补齐关键信息，生成前进行摘要确认，确认后生成一份可预览、可继续编辑、可保存的门户方案。

本阶段不重写全部旧能力，也不一次性完成三层配置面板和行业案例库。现有 `Project`、`workspace`、`portalDraft`、`portalResult` 保留为过渡实现，新逻辑优先围绕 `PortalPlan` 运转。

---

## 2. 目标

本阶段实现一个清晰的 PortalPlan 主链路：

```text
用户输入客户需求
→ Portal Agent 提取企业资料
→ 判断 6 项关键信息是否足够
→ 信息不足时继续追问
→ 信息足够时输出摘要确认
→ 用户确认摘要
→ 生成 PortalPlan
→ PortalPlan 派生门户预览与 workspace
→ 用户继续对话或编辑时回写 PortalPlan
→ 保存当前门户方案
```

成功标准：代码和 UI 状态能够明确区分当前处于信息收集、摘要确认、方案生成、编辑或保存阶段；当前预览和保存对象来自同一份 `PortalPlan`。

---

## 3. 非目标

本阶段不做以下事项：

- 不完整重构导出、截图或打包链路。
- 不一次性实现完整行业案例库。
- 不做复杂全文搜索、脱敏或权限策略。
- 不引入新的前端框架或状态机库。
- 不废弃现有 project/workspace 持久化结构。
- 不把三层配置面板所有控件一次性补齐。

---

## 4. 数据模型

### 4.1 新增 PortalPlan 类型

在前端类型层新增正式 `PortalPlan` 相关类型：

- `PortalPlan`
- `PortalEnterpriseProfile`
- `PortalThemeLayer`
- `PortalWorkspaceRuleLayer`
- `PortalCardContentLayer`
- `PortalEditHistoryItem`
- `PortalPlanStatus`

`PortalPlanStatus` 第一版为：

```ts
type PortalPlanStatus = 'collecting' | 'summary_pending' | 'generated' | 'editing' | 'saved';
```

状态含义：

| 状态 | 含义 |
| --- | --- |
| `collecting` | 正在收集客户资料和门户需求 |
| `summary_pending` | 信息已足够，等待用户确认摘要 |
| `generated` | 已生成 PortalPlan 并可预览 |
| `editing` | 用户正在继续对话或配置式编辑 |
| `saved` | 用户已保存当前门户方案 |

### 4.2 Project 过渡接入

现有 `Project` 保留旧字段：

- `portalProfile`
- `portalSummary`
- `portalDraft`
- `portalResult`
- `workspace`

新增：

```ts
portalPlan?: PortalPlan;
portalPlanStatus?: PortalPlanStatus;
```

新逻辑优先读写 `project.portalPlan`。旧字段作为兼容来源，在生成 PortalPlan 或恢复历史会话时用于补齐过渡数据。

---

## 5. 状态流

主状态流保持轻量，不引入状态机库：

```text
collecting
  ↓ 信息足够
summary_pending
  ↓ 用户确认摘要
generated
  ↓ 用户继续修改
editing
  ↓ 用户保存
saved
```

建议提供以下函数作为边界：

```ts
setPortalPlanStatus(projectId, status)
ensureProjectPortalPlan(project)
updateProjectPortalPlan(projectId, updater)
```

这些函数只处理状态和数据更新，不直接操作 DOM。UI 渲染、预览刷新、消息展示由现有模块调用这些边界后完成。

---

## 6. 转换边界

为避免各模块直接拼装 PortalPlan，新增集中转换函数：

```ts
createPortalPlanFromProject(project)
applyPortalPlanToProject(project, portalPlan)
createWorkspaceFromPortalPlan(portalPlan)
syncPortalPlanFromWorkspace(project)
```

职责：

- 从现有 `portalProfile`、`portalSummary`、`portalDraft`、`workspace` 收敛成 `PortalPlan`。
- 从 `PortalPlan.workspaceRuleLayer.cardPlacements` 派生 `WorkspaceItem[]`。
- GridStack 拖拽、缩放后，将 `WorkspaceItem[]` 回写到 `PortalPlan.workspaceRuleLayer.cardPlacements`。
- 卡片标题、摘要、列表项后续编辑时写入 `PortalPlan.cardContentLayer.cards`。
- 过渡期同步必要旧字段，保证现有预览和保存链路不被切断。

---

## 7. Portal Agent 与摘要确认

### 7.1 生成前信息门槛

生成前必须判断 6 项关键信息：

1. 客户名称
2. 客户行业
3. 客户核心职能 / 业务特征
4. 本次门户用途
5. 希望突出哪些卡片或信息
6. 品牌 / 视觉倾向

现有 `portal-agent.ts` 中的企业资料提取和完整度评分能力应作为基础，不另起一套 AI 流程。

### 7.2 信息不足时继续追问

当关键信息不足时，Portal Agent 不生成门户，只输出针对缺失项的追问。

示例：

```text
还需要补充两项信息：
1. 本次门户主要用于什么场景？
2. 希望重点突出哪些卡片或信息？
```

### 7.3 摘要确认

当信息足够后进入 `summary_pending`，输出摘要确认：

```text
我理解本次门户需求如下：
- 客户：...
- 行业：...
- 门户用途：...
- 重点信息：...
- 视觉倾向：...

确认后我将生成门户方案。
```

用户可以通过“确认”“开始生成”“没问题”或确认按钮进入生成阶段。

第一版使用文本意图和按钮事件结合，不做复杂 NLU。

---

## 8. 预览与编辑

### 8.1 预览派生

PortalPlan 生成后，预览仍复用现有 workspace 渲染能力：

```text
PortalPlan
→ workspaceRuleLayer + cardContentLayer
→ WorkspaceConfig
→ renderWorkspaceEditorShell / renderWorkspacePreview
```

这样可以继续利用现有模板、GridStack 编辑和 preview 同步能力。

### 8.2 对话式修改

用户继续通过对话修改门户时，修改语义先落到 PortalPlan：

| 用户意图 | 写入层 |
| --- | --- |
| “整体更稳重一点” | `themeLayer` |
| “待办放大并放到左上角” | `workspaceRuleLayer` |
| “新闻内容更像能源集团” | `cardContentLayer` |

过渡期允许同步写旧字段，但主语义必须是 `PortalPlan` 修改。

### 8.3 GridStack 编辑回写

工作区拖拽、缩放后，将最新 layout 回写到：

```text
project.portalPlan.workspaceRuleLayer.cardPlacements
```

映射规则：

| WorkspaceItem | PortalPlan cardPlacement |
| --- | --- |
| `x` | `column` |
| `y` | `row` |
| `w` | `columnSpan` |
| `h` | `rowSpan` |
| `minW` | `minColumnSpan` |
| `maxW` | `maxColumnSpan` |
| `minH` | `minRowSpan` |
| `maxH` | `maxRowSpan` |

---

## 9. 保存边界

保存动作的产品语义升级为“保存当前门户方案”。

保存时优先读取：

```text
project.portalPlan
```

保存流程：

```text
save PortalPlan
→ persist project snapshot
→ persist workspace
→ update portalResult.savedAt
→ status = saved
```

行业案例库沉淀下一阶段接入。本阶段只保证保存对象和状态已经是 PortalPlan，避免后续案例库保存过渡格式。

---

## 10. 错误处理

- 信息不足时不报错，返回追问并保持 `collecting`。
- 摘要确认阶段用户继续补充信息时，重新计算完整度并刷新摘要。
- PortalPlan 派生 workspace 失败时，保留对话状态并提示生成失败，可重新生成。
- GridStack 回写 PortalPlan 失败时，不阻断前端拖拽显示，但记录错误并避免保存不一致状态。
- 保存 PortalPlan 失败时，明确提示保存失败，保留本地当前状态，允许用户重试。

---

## 11. 测试计划

按 TDD 实施，先补测试再改生产代码。

建议测试：

1. `PortalPlan` 类型和 `PortalPlanStatus` 存在。
2. `Project` 支持 `portalPlan` 和 `portalPlanStatus`。
3. 信息不完整时不会进入生成阶段。
4. 信息完整时进入 `summary_pending`。
5. 用户确认摘要后生成 `PortalPlan`。
6. `PortalPlan.workspaceRuleLayer.cardPlacements` 可派生 `WorkspaceItem[]`。
7. GridStack layout change 可回写 `PortalPlan`。
8. 保存门户时优先读取 `project.portalPlan`。

验证命令：

```bash
npx vitest run <相关测试>
npm run test:types
```

浏览器验证：

```text
输入客户需求
→ 看到摘要确认
→ 确认
→ 右侧出现由 PortalPlan 派生的门户预览
→ 拖拽或缩放卡片
→ PortalPlan 中布局同步更新
→ 保存当前门户方案
```

---

## 12. 实施顺序建议

1. 新增 `PortalPlan` 与状态类型。
2. `Project` 接入 `portalPlan` 和 `portalPlanStatus`。
3. 增加 PortalPlan 创建、应用和 workspace 映射函数。
4. 将客户信息完整度判断接到 `summary_pending`。
5. 增加摘要确认后的 PortalPlan 生成入口。
6. 让预览从 PortalPlan 派生 workspace。
7. GridStack layout change 回写 PortalPlan。
8. 保存时优先保存 PortalPlan。
9. 补充相关契约测试和类型检查。

---

## 13. 验收标准

本阶段完成后应满足：

- 代码中存在正式 `PortalPlan` 类型与状态。
- 当前项目可以持有 `portalPlan`。
- 生成门户前会检查 6 项客户关键信息。
- 信息足够后先进入摘要确认，而不是直接生成。
- 用户确认后生成 `PortalPlan`。
- 预览和 workspace 可以从 `PortalPlan` 派生。
- GridStack 布局变化可以同步回 `PortalPlan`。
- 保存动作优先保存当前 `PortalPlan`。
- 旧 project/workspace 链路在过渡期仍可运行。
