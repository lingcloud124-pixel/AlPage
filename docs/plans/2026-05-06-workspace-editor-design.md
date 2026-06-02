# Workspace Editor Design

**Date:** 2026-05-06

## Goal

将当前 `Theme Studio` 从“主题预览 + 导出链”升级为“可持续在线编辑的门户工作区设计器”。

本次升级后：

- 项目不再围绕导出主题包组织。
- 用户可以在项目内持续查看和编辑门户工作区。
- 工作区中的卡片来自后台卡片库。
- 第一阶段先做布局级编辑，不做复杂卡片搭建器。

## Confirmed Scope

已确认的产品范围如下：

- 工作区配置归属于项目级，每个项目有独立工作区状态。
- 后台卡片库管理入口放在现有 `/admin`。
- 前台支持从卡片库添加卡片到画布。
- 画布中的卡片支持拖拽、缩放、删除。
- 当前阶段不做卡片隐藏。
- 卡片库不是常驻左侧栏，而是点击“添加”后显示弹出框。
- 属性面板不是常驻右侧栏，而是点击右上角“属性”后从右侧显示。
- 点击右上角“属性”且未选中卡片时，显示全局布局配置。
- 点击某张卡片后再打开“属性”，显示该卡片的属性面板。
- 未来需要支持工作区全局参数：列数、卡片边距、卡片间距等。
- 未来可能需要支持单个卡片实例级配置。

## Out Of Scope

当前阶段明确不做：

- 导出主题包链路联动
- 复杂数据源绑定与实时业务数据编排
- 用户自定义卡片模板搭建器
- 卡片隐藏 / 发布流 / 审批流
- 多组织级协作空间

## Product Main Flow

产品主路径统一按下面的使用流程设计与验收：

1. 用户进入项目
   - 打开一个已有项目，或创建一个新项目
   - 新项目自动获得一套标准门户布局

2. 用户切换到 `工作区设计`
   - 在同一项目内，从主题设计视图切到工作区设计视图
   - 系统读取当前项目工作区状态
   - 采用“本地优先、服务端同步”的恢复策略

3. 用户点击 `添加`
   - 打开卡片库弹出框
   - 卡片列表来自后台卡片库
   - 用户选择卡片后将卡片加入当前画布

4. 用户调整画布
   - 支持拖拽卡片
   - 支持缩放卡片
   - 支持删除卡片
   - 当前阶段不支持隐藏卡片

5. 用户点击 `属性`
   - 若当前未选中卡片，右侧显示全局布局配置
   - 若当前已选中卡片，右侧显示该卡片属性面板

6. 系统自动保存
   - 操作先落本地状态
   - 再异步同步服务端
   - 用户下次进入项目时继续编辑

7. 用户再次进入项目
   - 恢复上次工作区配置
   - 继续增删改工作区卡片

## Recommended Architecture

推荐采用“方案 B 的架构 + 渐进式接入”的实现方式：

- 在当前 `web/` 和 `server/` 工程内新增独立的 `Workspace Editor` 子系统。
- 不拆仓，不切换大技术栈，不直接整体搬运参考项目。
- 工作区编辑器在逻辑上独立，工程上仍嵌入 `Theme Studio`。

整体拆分为三个核心层次：

1. `Card Template Library`
   - 后台卡片模板库
   - 管理模板元信息、分类、默认尺寸、默认 props、启用状态

2. `Workspace Layout System`
   - 项目级工作区配置
   - 管理列数、边距、间距、行高、卡片位置和尺寸

3. `Card Instance System`
   - 项目中实际放置的卡片实例
   - 管理实例的位置、尺寸和实例级属性

该方案优于在现有静态模板上持续打补丁，因为后续支持全局栅格参数和单卡配置时不会污染主题编辑主链路。

## Frontend Architecture

前端建议新增 `workspace/` 相关模块，职责如下：

- `Workspace Runtime`
  - 负责在项目中渲染工作区
  - 读取项目工作区配置和卡片实例列表

- `Workspace Design Mode`
  - 负责拖拽、缩放、删除卡片
  - 负责打开“添加”弹框和“属性”右侧抽屉

- `Card Registry`
  - 维护 `card type -> renderer` 的统一注册关系
  - 前台运行时与后台预览共用同套渲染协议

- `Project Workspace Store`
  - 将工作区配置保存到项目状态
  - 支持项目再次打开后继续编辑

现有 `desktop.html` 将不再继续承载完整工作区业务逻辑，而是逐步退化为“门户外壳模板”，将中间工作区内容改为数据驱动挂载区域。

## Backend Architecture

后端建议沿用现有 `server/`，新增两类能力：

- `Card Template Library APIs`
  - 供后台管理页和前台工作区弹框读取卡片模板

- `Project Workspace Persistence APIs`
  - 负责项目级工作区保存、读取和初始化

后台职责边界原则：

- 后台管理模板，不直接管理某个项目中的实例布局
- 前台编辑项目实例，不重复保存整份模板快照

一句话边界：

`后台管模板库，前台管项目实例`

## Data Model

### Project

保留当前主题项目结构，同时新增独立 `workspace` 字段，避免主题资产与工作区状态耦合。

建议结构：

```ts
type Project = {
  id: string;
  name: string;
  templateType: 'light-ui' | 'dark-ui';
  colors: Record<string, string>;
  bgImageUrl?: string;
  headerBgImageUrl?: string;
  workspace?: WorkspaceConfig;
};
```

### WorkspaceConfig

项目级工作区配置建议拆成三部分：

```ts
type WorkspaceConfig = {
  settings: WorkspaceSettings;
  items: WorkspaceItem[];
  meta: WorkspaceMeta;
};
```

### WorkspaceSettings

第一版至少包含：

```ts
type WorkspaceSettings = {
  columns: number;
  rowHeight: number;
  gapX: number;
  gapY: number;
  paddingX: number;
  paddingY: number;
  maxWidth?: number;
  backgroundMode?: 'theme' | 'plain';
};
```

### WorkspaceItem

项目内实际放置的卡片实例建议包含：

```ts
type WorkspaceItem = {
  id: string;
  templateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
  zIndex?: number;
  instanceProps?: Record<string, unknown>;
  styleOverrides?: Record<string, unknown>;
};
```

### CardTemplate

后台卡片模板建议保留并扩展为：

```ts
type CardTemplate = {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  enabled: boolean;
  configurable?: boolean;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  defaultProps: Record<string, unknown>;
  layoutRules?: Record<string, unknown>;
  previewData?: Record<string, unknown>;
};
```

### Template Props vs Instance Props

必须区分：

- `defaultProps`
  - 属于模板
  - 定义某类卡片默认表现

- `instanceProps`
  - 属于项目中的某张卡片
  - 定义该卡片在当前项目中的个性化表现

## API Boundaries

### Card Template APIs

建议新增或扩展如下接口：

- `GET /api/card-templates`
- `GET /api/card-templates/:id`
- `POST /api/card-templates`
- `PUT /api/card-templates/:id`
- `DELETE /api/card-templates/:id`
- `GET /api/card-categories`

### Project Workspace APIs

- `GET /api/projects/:id/workspace`
- `PUT /api/projects/:id/workspace/settings`
- `PUT /api/projects/:id/workspace/items`
- `POST /api/projects/:id/workspace/items`
- `PUT /api/projects/:id/workspace/items/:itemId`
- `DELETE /api/projects/:id/workspace/items/:itemId`

### Initialization API

- `POST /api/projects/:id/workspace/initialize`

用于首次为项目创建默认工作区布局，避免初始化逻辑完全散落在前端。

## Frontend Entry And Interaction

建议将产品组织成“同项目、双视图”：

- `主题设计`
- `工作区设计`

用户进入同一个项目后，可以在两个主视图之间切换。

### Workspace Editor Layout

工作区设计页以中央画布为核心，不做常驻左右栏。

#### 1. 添加卡片

- 点击顶部或工具区的 `添加`
- 打开卡片库弹出框
- 用户在弹出框内按分类 / 搜索选择卡片模板
- 选中后插入当前画布

#### 2. 属性面板

- 点击右上角 `属性`
- 从右侧打开抽屉
- 如果未选中卡片，显示全局布局配置
- 如果已选中卡片，显示该卡片属性面板

#### 3. 画布交互

- 支持拖拽
- 支持缩放
- 支持删除
- 自动保存当前项目工作区状态

### Global Layout Settings

第一阶段全局属性面板建议支持：

- 列数
- 卡片边距
- 卡片间距
- 画布内边距
- 最大宽度

### Card Instance Panel

第一阶段单卡属性面板只做基础项：

- 标题
- 尺寸信息
- 锁定状态
- 少量实例级配置入口

不做复杂模板搭建器。

## Card System And Rendering Rules

### Two-Level Model

卡片必须分为：

- `Card Template`
- `Card Instance`

同一模板可被多个项目复用，也可在同一项目中多次使用。

### Registry

前端需建立统一 `Card Registry`：

- `type -> renderer`
- `type -> default config`
- `type -> constraints`

后台卡片库预览和前台画布渲染尽量复用同一渲染协议。

### Unified Card Shell

卡片壳统一为三段：

- `header`
- `content`
- `card actions`

统一规则：

- 头部固定
- 内容区单独滚动
- 不允许整卡滚动
- 滚动条仅在 hover 时出现

### Size Rules

模板侧保存：

- `defaultW`
- `defaultH`
- `minW`
- `minH`
- `maxW`
- `maxH`

第一阶段默认仍以高度 `12` 为基础单位，宽度以列宽表达。

### Config Depth

第一阶段实例级配置只开放基础项：

- 标题
- 局部显示项
- 简单动作配置
- 少量展示方式切换

不允许在项目内直接破坏模板结构。

## Migration Strategy

建议分四阶段推进：

### Phase 1: Skeleton

- 新增卡片模板、分类、项目工作区相关数据结构和接口
- 前端新增 `workspace` 子模块
- 项目能保存空工作区状态
- 前台能从后台读取卡片模板列表

### Phase 2: Editing Loop

- 实现工作区画布
- 实现拖拽、缩放、删除
- 实现“添加”弹框
- 实现“属性”右侧抽屉
- 实现自动保存
- 先接入少量高价值卡片：待办、新闻、日程、快捷入口

### Phase 3: Replace Static Workspace

- 将当前 `desktop.html` 中硬编码工作区内容逐步替换为数据驱动渲染
- 保留门户外壳
- 替换中间工作区区域
- 前后台预览协议统一

### Phase 4: Enhancements

- 开放列数、边距、间距、最大宽度等全局配置
- 扩展单卡实例属性
- 视需要引入更复杂的初始化模板策略

## Risks And Constraints

主要风险：

- 直接重写整个桌面模板会导致范围失控
- 静态模板与数据驱动渲染并存期间，容易出现双源问题
- 如果过早开放复杂单卡配置，会破坏模板稳定性

控制原则：

- 先抽离工作区区域，再替换静态内容
- 先做项目级布局能力，再做复杂实例能力
- 后台模板协议优先稳定，再扩展卡片种类

## Final Recommendation

采用：

- `方案 B` 的架构边界
- `渐进式接入` 的实施方式

即：

- 不拆仓
- 不切换现有技术栈
- 在当前项目内独立出 `Workspace Editor` 子系统
- 逐步替换现有静态工作区

这是兼顾当前交付效率和未来扩展性的最优路径。
