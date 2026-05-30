# docs 文档导航

本目录收录 **AlPage（原 Theme Studio）** 的产品说明文档。  
Theme Studio、主题自动化 / Topic Automation 是历史名称或仓库背景；后续用户可见产品名、后台 admin 页面和当前产品文档逐步统一为 AlPage。

---

## 面向用户

### [`用户操作说明书.md`](./用户操作说明书.md)

适合：

- 售前人员
- 方案设计人员
- 实施顾问
- 企业管理员

内容重点：

- 产品怎么用
- 标准操作步骤
- 常见问题
- 最简使用路径
- 保存、分享、再次编辑

---

## 面向产品经理

### [`internal/PRODUCT-ALIGNMENT.md`](./internal/PRODUCT-ALIGNMENT.md)

适合：

- 后续接手的大模型
- 需要快速对齐产品目标与当前实现差距的人
- 负责统一文档口径的人

内容重点：

- 当前统一产品定义
- 目标主链路
- 当前实现现状
- 产品与目标差距清单
- AlPage、Portal Agent、PortalPlan 的统一口径

### [`internal/PRODUCT.md`](./internal/PRODUCT.md)

适合：

- 产品负责人
- 项目负责人
- 研发负责人
- 后续接手的大模型

内容重点：

- 当前产品范围
- 产品边界
- 用户流程
- 交付标准
- 命名切换与案例库边界

### [`internal/PORTAL-PLAN.md`](./internal/PORTAL-PLAN.md)

适合：

- 产品经理
- 方案设计人员
- 前端开发
- 后端开发
- 负责 Agent 能力的人

内容重点：

- `PortalPlan` 状态模型
- 三层编辑模型：主题层、工作区规则层、卡片内容层
- 工作区规则层中的卡片区域位置和大小控制
- 对话式编辑与配置式编辑如何读写同一份门户方案
- 行业案例库沉淀规则

### [`PRD-产品使用流程.md`](./PRD-产品使用流程.md)

适合：

- 产品经理
- 项目负责人
- 方案设计人员

内容重点：

- 产品定位
- 用户旅程
- PortalPlan 生成与编辑主链路
- 模块职责
- 成功标准与风险点

---

## 面向开发者

### [`internal/workflows/00-端到端流程.md`](./internal/workflows/00-端到端流程.md)

适合：

- 前端开发
- 后端开发
- 架构师
- 维护者

内容重点：

- 当前有效端到端流程
- 输入、摘要确认、PortalPlan 生成、双通道编辑、保存与案例沉淀
- 旧 Pencil / `.pen` 流程与当前主链路的边界

### [`archive/开发者系统流程图.md`](./archive/开发者系统流程图.md)

适合：

- 前端开发
- 后端开发
- 架构师
- 维护者

内容重点：

- 顶层系统结构
- Web 运行流程
- 门户生成链路
- 数据流、门禁点、模块映射

### [`archive/专项技术方案-Pencil到HTML预览与截图打包.md`](./archive/专项技术方案-Pencil到HTML预览与截图打包.md)

适合：

- 前端开发
- 架构师
- 负责主题渲染与导出链路的同学

内容重点：

- 设计参考模板在系统中的角色
- HTML 作为最终渲染源的架构
- 预览与截图打包共用一套渲染链路
- 渐变、底图、资产化与导出策略

### [`archive/外部资料整理-主题规则切图打包映射.md`](./archive/外部资料整理-主题规则切图打包映射.md)

适合：

- 需要理解历史规则来源的开发者
- 负责整理主题色、切图、打包映射的同学

内容重点：

- 外部历史资料中已经明确的规则
- Dark-UI 特殊色
- 设计参考稿中的切图与页眉关系映射
- 打包分层边界与当前冲突点

---

## 实施计划与历史资料

### [`plans/2026-05-29-alpage-portal-plan-phase-one-implementation.md`](./plans/2026-05-29-alpage-portal-plan-phase-one-implementation.md)

适合：

- 准备进入第一阶段代码实施的人
- 需要理解 PortalPlan、三层编辑和 SQLite 行业案例库落点的研发同学

内容重点：

- 第一阶段实施顺序
- 前端 `PortalPlan` 类型与 workspace 映射
- 服务端 SQLite 行业案例库表与 API
- 保存门户时静默沉淀案例
- AlPage 命名切换范围

### [`plans/2026-05-29-portal-plan-three-layer-editor-design.md`](./plans/2026-05-29-portal-plan-three-layer-editor-design.md)

适合：

- 需要查看 PortalPlan 三层编辑模型来源的人

内容重点：

- PortalPlan 正式文档的原始设计稿
- 三层控制模型的初始设计
- 双通道编辑与行业案例库的早期范围

### 历史 archive 文档

以下文档保留为历史背景，不再作为当前产品主链路：

- `archive/实施路线图-开发任务拆分表.md`
- `archive/三阶段演进计划.md`
- `internal/archive/plans/2026-04-12-规则整合与预览截图打包实施计划.md`

---

## 推荐阅读顺序

如果你第一次接手项目，建议按以下顺序阅读：

1. `internal/PRODUCT-ALIGNMENT.md`
2. `internal/PRODUCT.md`
3. `internal/PORTAL-PLAN.md`
4. `PRD-产品使用流程.md`
5. `internal/workflows/00-端到端流程.md`
6. `plans/2026-05-29-alpage-portal-plan-phase-one-implementation.md`
7. `archive/开发者系统流程图.md`
7. `archive/专项技术方案-Pencil到HTML预览与截图打包.md`（说明参考资料与当前主链路的边界）
8. `用户操作说明书.md`

---

## 术语口径

为避免命名漂移，本目录统一使用以下术语：

- **AlPage**：当前和未来用户可见产品名称，覆盖主产品 UI 与后台 admin 页面
- **Theme Studio**：历史产品名，仅在迁移说明或历史文档中使用
- **主题自动化 / Topic Automation**：历史项目/仓库背景名称
- **Portal Agent**：面向售前、围绕单个客户生成门户方案的 Agent
- **PortalPlan**：AlPage 的核心产物，是预览、编辑、保存、分享、再次编辑和案例沉淀的唯一事实源
- **主题层**：控制颜色、页眉、导航、banner 和整体视觉气质
- **工作区规则层**：控制卡片圆角、间距、密度、栅格、区域位置、大小和整体排布模式
- **卡片内容层**：控制每张卡片展示的标题、摘要、列表项、链接和企业映射理由
- **门户**：由 `PortalPlan` 派生出的用户可预览、可全屏查看、可保存分享的结果
- **客户信息**：生成前必须补齐的 6 项字段，包括客户名称、行业、职能特征、门户用途、重点卡片、品牌/视觉倾向
- **行业案例库**：保存门户时静默沉淀的共享案例库，第一版接入服务端 SQLite，按行业 + 关键词检索
