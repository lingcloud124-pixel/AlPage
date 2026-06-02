# Portal Agent 改造路线图设计

**Date:** 2026-05-14

## Goal

把当前 `Theme Studio` 从“主题预览 + 工作区编辑 + 导出链”的混合体，推进成一个**面向售前的 Portal Agent 工作台**。

最终主链路应变为：

```text
售前输入客户需求（可上传资料）
→ 系统补齐 6 项客户信息
→ 摘要确认
→ 生成客户化门户初稿
→ 预览迭代（对话 / 直接编辑卡片）
→ 全屏查看
→ 保存 / 分享 / 再次编辑
```

## 当前实现判断

当前代码已有 4 块可直接复用的基础：

- `chat-manager.ts`
  - 已有对话历史、附件、模型调用和工具执行链路
- `user-preferences.ts`
  - 已有轻量偏好提取和持久化能力
- `project-manager.ts`
  - 已有项目、工作区、预览状态的核心持久化入口
- `workspace/runtime.ts`
  - 已有工作区卡片的渲染、拖拽、缩放、删除、属性编辑能力

当前最大不足也很明确：

- 还没有 `客户信息模型`
- 还没有 `摘要确认门槛`
- 还没有 `门户初稿模型`
- 默认工作区仍是固定模板，不是按客户语境生成
- 结果使用闭环仍未完成

## 推荐改造原则

### 原则 1：先补“生成前门槛”，再补“生成结果质量”

第一阶段不要急着直接改图像生成质量，而是先把“什么时候允许生成”定义清楚。

原因：

- 没有客户信息门槛，后面所有门户结果都会继续跑偏
- 摘要确认层是售前工作流的关键控制点
- 这是对现有代码侵入最小、收益最大的改造

### 原则 2：先做“门户草案模型”，再替换默认工作区

当前 `project-manager.ts` 里 `DEFAULT_WORKSPACE_ITEMS` 是固定卡片组合。不要直接在这个数组上堆规则，而是先引入一个独立的 `Portal Brief / Portal Draft` 模型，再由它驱动默认工作区初始化。

### 原则 3：门户结构和视觉主题分层推进

短期不要追求一次性“AI 自动把所有卡片和内容都填满”。正确节奏是：

1. 先补客户信息和摘要确认
2. 再让系统能生成“有门户意图的初始工作区”
3. 再逐步提高卡片结构和示例内容的行业化程度

## 分阶段路线图

## Phase 1：客户信息收集层

### Phase 2 Goal

引入生成前的 6 项客户信息门槛，让系统知道“当前服务的是谁、做什么门户、重点是什么”。

### Phase 2 Data Model

优先落在 `web/src/types.ts`：

```ts
type PortalCustomerProfile = {
  customerName?: string;
  customerIndustry?: string;
  customerFunctions?: string[];
  portalPurpose?: string;
  highlightedCards?: string[];
  visualPreference?: string;
  source: Array<'chat' | 'form' | 'attachment' | 'inferred'>;
  completeness: number;
};
```

推荐同时新增：

```ts
type PortalIntakeField =
  | 'customerName'
  | 'customerIndustry'
  | 'customerFunctions'
  | 'portalPurpose'
  | 'highlightedCards'
  | 'visualPreference';
```

### Phase 2 Files

- `web/src/types.ts`
  - 新增客户信息类型、摘要类型、门户草案类型
- `web/src/project-manager.ts`
  - 给项目挂上 `portalProfile`、`portalSummary`、`portalDraft`
- `web/src/chat-manager.ts`
  - 在消息处理链路中提取、合并、保存客户信息
- `web/src/agent/user-preferences.ts`
  - 从“用户长期偏好”里拆分出“本次客户信息”和“长期使用偏好”

### 第一阶段不做

- 不做复杂行业知识库
- 不做自动卡片布局生成
- 不做分享与全屏
- 不做后端多轮状态机

### Phase 2 Exit Criteria

- 系统能识别 6 项信息的缺失项
- 对话过程中能逐步补齐信息
- 项目切换后能保留本次客户信息
- 生成前能判断是否达到门槛

## Phase 2：摘要确认层

### Phase 3 Goal

在生成前插入一个明确的“系统理解确认”步骤，避免售前带着错误理解直接出图。

### Phase 3 Data Model

```ts
type PortalSummary = {
  customerName: string;
  customerIndustry: string;
  customerFunctions: string[];
  portalPurpose: string;
  highlightedCards: string[];
  visualPreference: string;
  structureUnderstanding: string[];
  styleUnderstanding: string;
  confirmedAt?: number;
};
```

### Phase 3 Files

- `web/src/chat-manager.ts`
  - 在发送生成请求前，插入摘要确认状态
- `web/src/agent/system-prompt.ts`
  - 已有口径继续保留，并驱动输出摘要确认
- `web/src/ui-setup.ts`
  - 增加摘要确认面板 / 弹层入口
- `web/src/main.ts`
  - 负责在工作台中切换“对话 / 摘要确认 / 预览”状态

### 推荐 UI 形态

优先使用“对话主导 + 结构化确认卡片”的混合方案：

- 对话中先收集信息
- 信息足够时在中间区域或右侧弹出摘要确认卡片
- 用户点“确认并生成”后才继续

### Phase 3 Exit Criteria

- 未确认摘要时，不能进入正式生成
- 用户可回退修改摘要内容
- 摘要内容会写回项目状态

## Phase 3：门户初稿生成层

### Phase 4 Goal

把“主题预览 + 固定工作区”推进成“客户化门户初稿”。

### 核心思路

不要一次追求全自动复杂门户，而是先生成：

- 视觉主题方向
- 一组符合客户用途的初始卡片集合
- 每张卡片的示例标题和摘要

### 建议新增数据结构

```ts
type PortalDraft = {
  themeDirection: string;
  workspaceSeed: Array<{
    templateId: string;
    reason: string;
    title?: string;
    summary?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  generatedAt: number;
};
```

### Phase 4 Files

- `web/src/project-manager.ts`
  - 用 `portalDraft` 替代硬编码默认工作区的唯一来源
- `web/src/workspace/runtime.ts`
  - 支持初始化时吃入 `workspaceSeed` 的标题、摘要等示例内容
- `web/src/chat-manager.ts`
  - 在生成完成后，将门户草案和视觉结果一起落进项目
- `web/src/tools/executor.ts`
  - 保留视觉主题相关工具，同时预留门户草案接入点

### 推荐策略

第一版门户初稿生成采用“规则驱动优先”：

- 按客户行业和门户用途映射一组高价值卡片
- 按重点信息调整卡片优先级
- 示例内容先做模板化行业改写

不要第一阶段就把卡片内容完全依赖大模型自由生成。

### Phase 4 Exit Criteria

- 新项目不再只能落固定 4 张默认卡片
- 不同行业/用途至少能生成不同的初始卡片组合
- 卡片示例内容能体现客户语境

## Phase 4：结果使用层

### Phase 5 Goal

补齐“全屏查看 -> 保存 -> 分享 -> 再次编辑”的结果闭环。

### 主要改动文件

- `web/src/ui-setup.ts`
  - 增加正式全屏入口
- `web/src/main.ts`
  - 管理全屏预览状态与回流
- `web/src/project-manager.ts`
  - 把保存心智从“项目”推进到“门户结果”
- `web/src/components/sidebar/*`
  - 展示可再次进入编辑的门户成果入口

### 分享策略建议

第一版分享不要上来做复杂外链平台，建议分两步：

1. 先做站内结果分享对象
2. 再扩展外链或访客查看

### Phase 5 Exit Criteria

- 用户可进入正式全屏查看
- 用户可从全屏回到编辑
- 用户可保存当前门户成果
- 用户可触发基础分享动作

## Phase 5：导出能力降级与兼容

### 目标

让导出继续保留，但不再主导产品叙事。

### 核心改动

- 文案层降级“打包导出”
- 入口层弱化主按钮优先级
- 数据层明确导出消费的是“当前门户结果快照”

### 涉及文件

- `web/src/package-manager.ts`
- `web/src/export/*`
- 导出相关测试与提示文案

### 验收标准

- 导出仍可用
- 但主流程不再依赖用户先理解导出逻辑

## 推荐实施顺序

```text
Phase 1 客户信息收集层
  ↓
Phase 2 摘要确认层
  ↓
Phase 3 门户初稿生成层
  ↓
Phase 4 结果使用层
  ↓
Phase 5 导出能力降级与兼容
```

## 第一阶段详细建议

如果只做最近一个迭代，建议把范围严格收在：

1. 新增 `PortalCustomerProfile`
2. 在项目状态中保存客户信息
3. 聊天过程中识别缺失字段
4. 输出摘要确认
5. 阻止未确认情况下直接生成

这 5 件事完成后，产品就会第一次真正具备 `Portal Agent` 的基础门槛。

## 测试建议

第一阶段测试重点不要放在视觉对不对，而要放在“门槛和状态流转”：

- 缺字段时是否继续追问
- 补齐后是否出现摘要确认
- 未确认时是否阻止生成
- 确认后是否进入生成
- 项目切换后客户信息是否保留

## 最终建议

当前最值得做的不是继续优化“图片生成质量”，而是先把 `Portal Agent` 的前两层骨架补起来：

- `客户信息收集层`
- `摘要确认层`

只有这两层成立，后面的门户结构生成、示例内容生成、结果使用闭环才不会继续建立在错误前提上。
