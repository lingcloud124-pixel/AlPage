# Phase 1 实施开发计划

> 基于 `2026-05-31-enterprise-portal-product-handoff.md` 交接文档，结合现有代码状态和产品反馈生成的精确实施计划。
> 修订日期: 2026-05-31（v3 final — 整合全部反馈）

---

## 现有代码状态摘要

| 模块 | 已有 | 差距 |
|------|------|------|
| PortalPlan 三层结构 | `portal-plan.ts` 有 enterprise/theme/workspace+cards 三层 | 需补充 `UncoveredNeed`、`RequirementSummary` 类型 |
| 门户画像提取 | `portal-agent.ts` 有 6 字段 profile 提取 + 完整度评分 | 缺少生成前**需求摘要**展示（区别于画像确认） |
| 卡片模板 | 仅 4 种硬编码 (todo/news/schedule/quickAccess) | 缺少 `CardFieldSchema` + `aiWritable` 约束，缺少后台管理 |
| 工作区配置 | `workspace-configuration.ts` 是只读摘要面板 | 需改为可编辑表单 |
| 卡片内容编辑 | `card-content-configuration.ts` 有基础编辑 | 缺少从 schema 动态生成表单 |
| 预览渲染 | `workspace/preview.ts` 已有 CSS grid 渲染 | 需确认无静态模板回退（搜索实际模板加载入口，不假设 loader.ts） |
| 案例库 | `industry-cases.ts` API 已有 CRUD | 缺少双用途字段 (display/reference)，缺少用户主动录入入口 |
| 保存门户 | `saved-portals.ts` API 已有 | 缺少发布为只读预览链接 |
| 系统提示词 | `system-prompt.ts` + `portal-agent-prompt.txt` | 需添加卡片库选择规则和 aiWritable 约束 |

---

## 实施阶段与任务

### 阶段 A：数据模型与类型（Task 2 of handoff）

**目标**: 建立 `PortalProject` 统一数据源，补充缺失类型定义。

**修改文件**:
- `web/src/types.ts` — 补充所有新增类型
- `web/src/portal-plan.ts` — 对齐现有结构，添加新字段

**具体步骤**:

1. 在 `types.ts` 中新增：
   ```ts
   type RequirementSummary = {
     customerName?: string;
     industry?: string;
     portalGoal: string;
     requestedCapabilities: string[];
     stylePreferences: string[];
     assumptions: string[];
   };

   type CardFieldSchema = {
     key: string;
     label: string;
     type: "text" | "number" | "image" | "link" | "list" | "select" | "boolean";
     aiWritable: boolean;
     required?: boolean;
     options?: string[];
     itemSchema?: Record<string, string>;
   };

   type CardTemplate = {
     id: string;
     name: string;
     category: string;
     industryTags: string[];
     capabilityTags: string[];
     scenarioTags: string[];
     defaultW: number;
     defaultH: number;
     previewImageUrl?: string;
     fields: CardFieldSchema[];
     enabled: boolean;
   };

   type UncoveredNeed = {
     id: string;
     label: string;
     reason: string;
     requestedCapability: string;
     suggestedCardType?: string;
   };

   type ThemeConfig = {
     logoUrl?: string;
     customerName?: string;
     headerStyle: string;
     colorThemeId?: string;
     colors?: Record<string, string>;
     backgroundAssetId?: string;
     backgroundUrl?: string;
     backgroundMode?: "library" | "generated" | "placeholder";
   };
   // 注意：Logo 可编辑是产品规则，不作为可配置字段。
   // UI 和权限层始终提供 Logo 上传/替换/删除入口，
   // AI 不会生成 "logoEditable: false" 来关闭此能力。
   ```

2. 在 `portal-plan.ts` 中将现有 `PortalPlan` 的 themeLayer/workspaceRuleLayer 与新增类型对齐，添加 `uncoveredNeeds: UncoveredNeed[]` 和 `requirementSummary?: RequirementSummary` 字段。

3. 确保空项目（无 PortalPlan）的默认预览不显示假内容。

4. **历史数据兼容/默认值迁移**: 现有项目可能已有 saved portal / workspace 数据，但缺少新增字段。需要:
   - 读取旧数据时，为 `requirementSummary`、`uncoveredNeeds`、`ThemeConfig`、`WorkspaceConfig` 补齐默认值
   - `requirementSummary` 默认为空摘要（`portalGoal: ""`, 其余为空数组）
   - `uncoveredNeeds` 默认为空数组
   - `ThemeConfig` 缺失字段用现有主题变量推导（如已有 colors 则保留）
   - 不因为旧项目缺字段导致预览空白或报错

**验收**: `npm run test:types` 通过，现有流程仍可创建有效 project 对象，加载旧项目数据不报错。

**依赖**: 无，首先执行。

---

### 阶段 B1：卡片库后台管理（Task 3 前半 — 后台数据层）

**目标**: 建立后台卡片模板管理能力，包括新增/编辑/启停、字段 schema 配置、标签配置、默认尺寸配置、预览图配置。一期先确保有可维护的后台数据入口，不能只依赖 4 个硬编码卡片。

**修改文件**:
- `server/src/db.ts` — 新建 `card_templates` 和 `card_template_fields` 表（如不存在）
- `server/src/routes/card-templates.ts` — 增加完整 CRUD（含 schema/标签/尺寸/预览图）
- `server/admin/` — 增加卡片模板管理页面或扩展现有管理页
- `web/src/api/card-templates.ts` — 前端 API 类型对齐 `CardTemplate[]`

**具体步骤**:

1. **数据库迁移**: 在 `card_templates` 表中增加列:
   - `category`, `industry_tags` (JSON), `capability_tags` (JSON), `scenario_tags` (JSON)
   - `default_w`, `default_h`, `preview_image_url`
   - `enabled` (boolean)
   - 新建 `card_template_fields` 表: `template_id`, `key`, `label`, `type`, `ai_writable`, `required`, `options` (JSON), `item_schema` (JSON), `sort_order`

2. **后端 API 扩展**:
   - `GET /api/card-templates` — 返回完整 `CardTemplate[]`（含 fields）
   - `POST /api/card-templates` — 新增模板 + fields
   - `PUT /api/card-templates/:id` — 编辑模板 + fields
   - `PATCH /api/card-templates/:id/toggle` — 启停
   - `PUT /api/card-templates/:id/preview-image` — 上传预览图

3. **后台管理 UI**: 在 admin 面板增加"卡片模板"页签:
   - 模板列表（名称、分类、启用状态、标签）
   - 新增/编辑弹窗（基本信息 + 字段 schema 编辑器 + 标签配置 + 默认尺寸）
   - 启停开关
   - 预览图上传

4. **迁移现有 4 种硬编码**: 将 todo/news/schedule/quickAccess 的字段定义写入数据库作为 seed data:
   - 使用稳定 templateId 做 `INSERT OR IGNORE`（只插入不存在的模板，永远不覆盖已有记录）
   - 重复运行 seed 脚本不会插入重复模板，也不会覆盖后台手动编辑过的模板
   - 后续如需升级默认模板内容，走单独的版本迁移脚本，不走 seed
   - 后续由后台管理维护

**验收**:
- 后台可新增/编辑/启停卡片模板
- 每个模板可配置字段 schema（含 aiWritable 标记）
- 每个模板可配置标签（行业/能力/场景）
- 每个模板可配置默认尺寸和预览图
- `GET /api/card-templates` 返回完整 schema 数据

**依赖**: 阶段 A 完成

---

### 阶段 B2：AI 卡片选择 + Schema 合法性校验（Task 3 后半 — AI 侧）

**目标**: AI 根据卡片库元数据提出卡片选择方案，前端/后端用 schema 做合法性校验，过滤无效 templateId 和非 aiWritable 字段。

**修改文件**:
- `web/src/portal-agent.ts` — 添加卡片库校验函数
- `web/src/agent/portal-agent-prompt.txt` — 添加卡片选择规则和输出格式
- `web/src/chat-manager.ts` — AI 输出后执行 schema 校验

**具体步骤**:

1. **系统提示词更新**: 在 `portal-agent-prompt.txt` 中注入卡片库摘要信息（不是完整 schema），并添加规则:
   - 你只能从以下卡片库中选择卡片，不能发明新卡片类型
   - 你只能填写 schema 中标注 `aiWritable: true` 的字段
   - 未覆盖的需求必须列在 `uncoveredNeeds` 中
   - 选择卡片时参考行业标签、能力标签、场景标签

   **Prompt 注入范围**（严格控制，避免撑爆 token，但保留必要生成约束）:
   - **给 AI**:
     - 模板 ID、名称、分类、标签（industry/capability/scenario）、适用场景描述
     - `aiWritable` 字段的 key / label / type
     - **select 字段必须给 options**（否则 AI 会填非法值）
     - **list 字段必须给 itemSchema**（否则列表项格式可能乱）
     - 必要的长度/数量提示（如有）
   - **不给 AI**: `required` 标记、后台管理元数据、非 aiWritable 字段、预览图 URL、完整后台 schema 细节
   - **校验端**: 使用完整 schema 做最终过滤，AI 侧只给生成所需的最小约束

2. **AI 选择流程** (不依赖本地标签遍历做语义匹配):
   - AI 接收到卡片库元数据后，自行判断最适合用户需求的卡片组合
   - AI 输出包含 `selectedCardTemplates[]` 和 `uncoveredNeeds[]`
   - 前端收到 AI 输出后，进行**合法性校验**（不是做匹配）:

3. **Schema 校验函数** (新增到 `portal-agent.ts`):
   ```ts
   // 校验 AI 输出的卡片选择是否合法
   validateCardSelection(
     aiOutput: { templateId: string; instanceProps: Record<string, unknown> }[],
     availableTemplates: CardTemplate[]
   ): {
     valid: CardInstance[];
     rejected: { templateId: string; reason: string }[];
   }

   // 过滤 instanceProps，只保留 aiWritable 字段
   filterAIWritableProps(
     template: CardTemplate,
     proposedProps: Record<string, unknown>
   ): Record<string, unknown>
   ```

   校验逻辑:
   - templateId 不在卡片库中 → 拒绝
   - templateId 对应的模板 `enabled: false` → 拒绝
   - instanceProps 中含 schema 未定义的 key → 过滤掉
   - instanceProps 中含 `aiWritable: false` 的 key → 过滤掉
   - 缺少 `required: true` 的字段 → 标记警告但允许（AI 可能后续补充）

4. **AI 输出格式**: 更新 `buildPortalGenerationPrompt`，使 AI 返回:
   ```ts
   type PortalGenerationResult = {
     requirementSummary: RequirementSummary;
     projectPatch: {
       theme: ThemeConfig;
       workspace: WorkspaceConfig;
       cards: { templateId: string; instanceProps: Record<string, unknown> }[];
       uncoveredNeeds: UncoveredNeed[];
     };
     selectedCaseReferences: string[];
     selectedCardTemplates: string[];
     notes: string[];
   };
   ```

**验收**:
- AI 输出中的 templateId 全部来自卡片库
- AI 输出中不含非 aiWritable 字段
- 不支持的能力需求出现在 uncoveredNeeds 中
- 校验函数拒绝无效 templateId 并记录原因

**依赖**: 阶段 B1 完成

---

### 阶段 C：需求摘要与生成确认（Task 4 of handoff）

**目标**: 生成前展示**需求理解摘要**（区别于现有画像字段确认），用户确认后才生成。

> **关键区分**: 现有 `portal-confirm-form.ts` 确认的是"画像字段"（客户名、行业、功能、目的、突出卡片、视觉偏好共 6 个字段）。本阶段新增的是"需求理解确认"，包括：客户门户目标、需要的模块能力、可覆盖的卡片、未覆盖的需求、AI 做出的假设。不要只改现有画像确认弹窗的文案，需要作为独立的确认环节。

**修改文件**:
- `web/src/portal-agent.ts` — 新增需求摘要构建函数
- `web/src/chat-manager.ts` — 在 `ready_to_generate` 状态展示需求摘要
- `web/src/components/portal-confirm-form.ts` — 新增需求摘要展示区域（或新建组件）

**具体步骤**:

1. **新增需求摘要构建** (在 `portal-agent.ts` 中):
   - 输入: 当前 `PortalCustomerProfile` + 卡片库元数据
   - 输出:
     - `portalGoal`: 基于对话推断的客户门户目标
     - `requestedCapabilities`: 用户明确提到或隐含需要的模块能力
     - `coverableCards`: 当前卡片库可以覆盖的能力（哪些卡片能匹配哪些需求）
     - `uncoveredNeeds`: 当前卡片库无法覆盖的需求（`UncoveredNeed[]`）
     - `assumptions`: AI 基于对话推断的假设（如行业默认配置、布局偏好等）
   - 此步骤可由 AI 在对话中完成（让 AI 输出结构化摘要），也可由前端本地函数根据 profile + 卡片库元数据构建基础版本

2. **确认流程改造**: 修改 `chat-manager.ts` 中 `ready_to_generate` 的处理:
   - 画像确认（现有流程，确认 6 个画像字段）保持不变
   - 画像确认通过后，**新增**需求摘要展示环节:
     - 在聊天区域或弹窗中展示需求理解摘要
     - 高亮未覆盖需求
     - 展示 AI 假设
   - 用户确认需求理解后才触发 `generatePortalPlanFromConfirmedProject`

3. **UI 实现**: 选择以下方案之一:
   - **方案 A**: 在聊天中以 Markdown 格式展示摘要，用户回复确认/修改
   - **方案 B**: 弹出独立的需求确认弹窗（在画像确认之后）
   - **方案 C**: 扩展现有 `portal-confirm-form.ts`，添加"需求理解"tab 或区域
   - 建议先用方案 A（最快），后续可升级为方案 B

**验收**:
- 画像确认和需求摘要确认是两个独立步骤
- 用户能看到: 门户目标、模块需求、可覆盖卡片、未覆盖需求、AI 假设
- 只有用户明确确认后才触发生成
- 不会从第一条消息盲目触发

**依赖**: 阶段 B2 完成（需要卡片库元数据来做覆盖分析）

---

### 阶段 D：主题与工作区配置入口（Task 5 of handoff）

**目标**: 预览区右上角提供主题和工作区配置入口，配置修改立即反映到项目数据。Logo 始终可编辑（产品规则，不是配置开关）。

**修改文件**:
- `web/index.html` — 预览区右上角添加控制按钮
- `web/src/workspace/runtime.ts` — 绑定配置入口逻辑
- `web/src/components/workspace-configuration.ts` — 从只读摘要改为可编辑表单
- `web/src/styles/portal-config-panel.css` — 配置面板样式
- `web/src/styles/preview-panel.css` — 右上角控制按钮样式

**具体步骤**:

1. **预览右上角控制区**: 在 `index.html` 的预览面板内添加:
   - 主题配置按钮（调色板图标）
   - 工作区配置按钮（网格图标）
   - 发布按钮 — **注意**: 如果阶段 G 未完成，发布按钮必须 `disabled` 或 `display:none`，不要出现可点击但无功能的入口。可通过 feature flag 或代码注释标记。
   - 可能的设计模式切换

2. **主题配置面板**: 弹出侧边/浮层面板，包含:
   - **Logo 上传/替换/删除**（始终可见，不可被关闭）
   - 客户名称编辑
   - 头部样式选择
   - 颜色主题选择
   - 背景/纹理选择（优先从库中选）
   - 所有修改写入 `PortalProject.theme`

3. **工作区配置面板**: 弹出侧边/浮层面板，包含:
   - 宽度模式（narrow/standard/wide/full）
   - 外边距、内边距
   - 圆角
   - 列数
   - 间距
   - 所有修改写入 `PortalProject.workspace`

4. **实时反映**: 配置修改触发 `applyPortalPlanToProject` + 预览重渲染。

**验收**:
- 主题和工作区配置从预览右上角可访问
- Logo 可更换（始终可编辑，无开关控制）
- 修改立即影响预览和工作区设计视图

**依赖**: 阶段 A 完成（类型定义）

---

### 阶段 E：工作区设计中的卡片配置（Task 6 of handoff）

**目标**: 工作区设计模式的卡片上提供内容配置入口，表单字段由 schema 驱动。

**修改文件**:
- `web/src/workspace/runtime.ts` — 卡片上添加配置入口
- `web/src/components/card-content-configuration.ts` — 从硬编码表单改为 schema 驱动
- `web/src/workspace/card-renderer.ts` — 卡片 shell 上添加配置按钮

**具体步骤**:

1. **卡片配置按钮**: 在 `renderWorkspaceCardShell` 中，design mode 下每个卡片 header 区域添加配置按钮（齿轮图标）。

2. **Schema 驱动表单**: 改造 `renderCardContentConfiguration`:
   - 从 API 获取选中卡片的 `CardTemplate.fields`
   - 根据 `fields[].type` 动态生成对应表单控件
   - `text` → input/textarea
   - `number` → number input
   - `image` → 图片上传
   - `link` → URL input
   - `list` → 可增删的列表编辑器
   - `select` → 下拉选择
   - `boolean` → toggle
   - 只显示 schema 中定义的字段，不允许保存未定义字段

3. **数据绑定**: 表单修改写入 `CardInstance.instanceProps`，触发预览刷新。

**验收**:
- 工作区设计中的卡片有配置入口
- 表单字段由 schema 驱动
- 修改反映到预览
- 未知字段无法保存

**依赖**: 阶段 B1 完成（需要 schema 数据）

---

### 阶段 F：案例库双用途（Task 7 of handoff）

**目标**: 案例库同时支持 AI 生成参考和前端展示。**用户主动录入**（非自动保存），保存时脱敏。

> **关键规则**: 不在保存门户时自动创建案例。项目认可后，用户主动点击"录入资料库/保存为案例"按钮，才生成案例记录。避免普通草稿、测试项目、客户未认可方案污染案例库。

**修改文件**:
- `web/src/api/industry-cases.ts` — 扩展类型，增加双用途字段
- `server/src/routes/industry-cases.ts` — 后端增加新字段
- `server/src/db.ts` — 数据库 schema 增加新列
- `web/src/portal-agent.ts` — 生成前查询案例库作为参考
- UI 文件 — 添加"录入资料库"按钮入口

**具体步骤**:

1. **扩展 CaseRecord 类型**:
   ```ts
   type CaseRecord = {
     id: string;
     title: string;
     industry: string;
     summary: string;
     highlights: string[];
     coverImageUrl?: string;
     displayEnabled: boolean;    // 前端展示用（默认 false，需人工审核开启）
     referenceEnabled: boolean;  // AI 参考用（默认 true）
     themeSnapshot: ThemeConfig;
     workspaceSnapshot: WorkspaceConfig;
     cardTemplateIds: string[];
     anonymizedRequirementSummary?: RequirementSummary;  // 脱敏摘要
     createdFromProjectId?: string;
   };
   ```

2. **用户主动录入流程**:
   - 在项目操作区（预览右上角或项目保存后）添加"录入资料库/保存为案例"按钮
   - 点击后弹出确认/编辑弹窗:
     - 案例标题（预填项目名）
     - 行业标签
     - 摘要（可编辑脱敏后的需求摘要）
     - 亮点标签
     - 封面图（可从预览截图）
     - `displayEnabled` / `referenceEnabled` 开关
   - 用户确认后才写入案例库
   - 自动脱敏规则（具体）:
     - **移除**: 客户名称、联系人姓名、具体部门名称、人名、真实业务指标值、内部系统名称、项目代号
     - **保留**: 行业、门户目标描述（抽象化）、布局风格、主题风格、卡片组合模式、抽象需求类型
     - `anonymizedRequirementSummary` 中 `customerName` 置为空，`portalGoal` 中替换具体客户名为通用描述
     - 前台展示字段（title、summary、highlights、coverImageUrl）必须由用户确认后保存，不能自动填充敏感信息

3. **AI 检索**: 在 `buildPortalGenerationPrompt` 中加入:
   - 查询 `referenceEnabled` 的同行业案例
   - 提取其主题风格、布局方向、卡片组合作为参考
   - 明确告知 AI: 只参考风格和布局，不复制客户具体内容

**验收**:
- 只有用户主动点击才创建案例记录
- 案例 AI 参考/前端展示双用途可独立控制
- AI 参考时不复制客户敏感内容
- 草稿和测试项目不会进入案例库

**依赖**: 阶段 A 完成

---

### 阶段 G：发布只读预览链接（Task 8 of handoff）

**目标**: 发布覆盖式只读预览链接，客户无编辑权限。一期先做"只读项目渲染"（JSON snapshot + 只读 renderer），不做静态 HTML 快照。

**修改文件**:
- `web/src/api/saved-portals.ts` — 增加发布 API 调用
- `server/src/routes/saved-portals.ts` — 增加发布端点 + 只读渲染路由
- `server/src/db.ts` — 增加 `published_snapshot` JSON 字段
- 发布 UI 相关文件

**具体步骤**:

1. **发布端点**: `POST /api/saved-portals/:id/publish`
   - 将当前 `PortalProject` 的完整 JSON 保存为 `published_snapshot`
   - 生成/更新稳定的公开 URL（如 `/p/{projectId}`）
   - 每次 publish 覆盖之前的 snapshot
   - 不生成静态 HTML，只存 JSON

2. **只读预览路由**: `GET /p/:projectId`
   - **架构**: 服务端返回只读 HTML shell → shell 内嵌或拉取 `published_snapshot` JSON → **浏览器端**加载只读 preview renderer
   - **不是**在 server 里调用前端 DOM renderer（server 无 DOM 环境）
   - 服务端职责:
     - 返回最小 HTML 页面（含 CSS 变量、基础样式）
     - 内嵌 `published_snapshot` JSON 或通过 API 拉取
     - 加载只读渲染 JS 脚本（从现有 `workspace/preview.ts` + `workspace/card-renderer.ts` 提取的轻量版本）
   - 浏览器端职责:
     - 解析 snapshot JSON
     - 应用主题（CSS 变量从 `ThemeConfig` 推导）
     - 渲染卡片内容（复用 `renderWorkspaceCardShell` 的只读模式）
     - **不加载**: 聊天面板、runtime.ts（工作区编辑器）、设计模式、配置控件

3. **前端发布 UI**:
   - 发布按钮在预览右上角（阶段 D 中已添加入口）
   - 点击后调用发布 API
   - 显示公开链接（可复制）

4. **后续优化方向**（非一期）:
   - 生成静态 HTML 快照（性能更好，不依赖浏览器渲染）
   - CSS 变量和外部资源内联
   - CDN 缓存
   - SSR（服务端渲染只读页面）

**验收**:
- 同一链接每次发布后显示最新内容
- 客户链接不暴露设计/配置/聊天控件
- 只读渲染与编辑预览效果一致

**依赖**: 阶段 A、D 完成

---

### 阶段 H：源数据源确认（Task 1 of handoff）

**目标**: 确保预览、工作区、配置、对话全部操作同一 `PortalProject`，无静态模板回退。

**修改文件**:
- `web/src/workspace/preview.ts` — 确认无静态模板覆盖
- `web/src/workspace/store.ts` — 确认数据源一致性
- `web/src/chat-manager.ts` — 确认工具调用修改 project 数据
- 相关测试文件

**具体步骤**:

1. **追踪数据流**: 验证从生成到预览到编辑到保存的完整链路:
   - `generatePortalPlanFromConfirmedProject` → `applyPortalPlanToProject` → `syncPortalPlanFromWorkspace` → 渲染
   - 确认每一步都读写同一 project 对象

2. **消除静态回退**:
   - **不假设 loader.ts 存在**。搜索实际的模板加载入口:
     - 搜索 `web/src/templates/` 目录下的文件引用
     - 搜索 `desktop-preview`、`preview-panel`、`iframe` 相关代码
     - 搜索 `workspace/preview.ts` 中的宿主元素选择器（`.desktop-grid` 等）
     - 搜索 `index.html` 中预览面板的 iframe/template 初始化
   - 找到实际加载路径后，确认是否有硬编码桌面模板在无 workspace 时覆盖预览的情况
   - 如有，替换为空项目空状态

3. **空项目空状态**: 设计并实现空项目的预览空状态:
   - 显示引导文案（如"描述客户需求，AI 将生成门户方案"）
   - 不显示假的 todo/news/schedule 卡片

4. **添加测试**:
   - 空 project 预览显示空状态
   - 有 workspace 的 project 预览显示实际卡片
   - 工作区设计与预览使用相同数据源

**验收**:
- 空 project 预览显示生成导向的空状态
- 有 workspace 的预览显示实际卡片
- 工作区设计视图与预览一致

**依赖**: 无（可与阶段 A 并行）

---

## 执行顺序

```
阶段 A（类型）  ─────┬──→ 阶段 B1（卡片库后台管理）
                     │         │
                     │         └──→ 阶段 B2（AI 选择 + 校验）──→ 阶段 C（需求摘要）
                     │
                     ├──→ 阶段 D（主题/工作区配置）──→ 阶段 G（发布链接）
                     │
                     ├──→ 阶段 E（卡片配置）—— 依赖 B1 的 schema 数据
                     │
                     └──→ 阶段 F（案例库双用途）

阶段 H（数据源确认）— 可与 A 并行
```

建议执行顺序: **H → A → B1 → B2 → C → D → E → F → G**

- H 和 A 可以并行或 H 先行（H 主要是审查+测试，风险最低）
- B1 → B2 严格顺序：先有后台可维护的卡片库数据，再让 AI 选择
- B2 是 C 的前置：卡片库校验完成后才能做需求覆盖分析
- B1 完成后 E 可以开始（schema 数据可用）
- D 是 G 的前置：发布入口在配置入口之后
- F 相对独立，A 之后任意时间可执行

---

## 风险与注意事项

1. **静态模板回退**: `web/src/templates/` 中的 HTML 模板可能在某些路径下作为默认预览源加载。执行 H 阶段时先搜索实际的模板加载入口，不假设特定文件名。

2. **PortalPlan 现有结构**: 现有 `PortalPlan` 已有三层设计（enterprise/theme/workspace），新类型需要与之对齐而非并行另建。

3. **卡片库迁移工作量**: 现有 4 种硬编码卡片迁移为数据库 schema 驱动模板是 B1 的核心工作，需仔细处理 seed data。

4. **AI 提示词长度**: 增加卡片库列表和选择规则后，系统提示词可能变得很长，需关注 token 消耗。可考虑只注入模板摘要（ID + 名称 + 标签），不注入完整 field schema。

5. **发布渲染一致性**: 一期用 JSON snapshot + 只读 renderer 方案，需确保只读渲染和编辑预览效果一致。后续再优化为静态快照。

6. **需求摘要 vs 画像确认**: 执行 C 阶段时严格区分这两个概念，不要把现有画像确认弹窗改个文案就当作需求摘要确认。

7. **Logo 可编辑不可关闭**: 全流程中 Logo 上传/替换/删除始终可用，不允许通过配置关闭此能力。

8. **案例库准入门槛**: 只有用户主动操作才录入案例，避免草稿和测试数据污染 AI 参考。

9. **回归风险**: 每个阶段完成后都运行 `npm run test:types && npm test && npm run build` 确认无回归。

---

## v2 → v3 变更记录

| # | 原计划 | 修正为 | 原因 |
|---|--------|--------|------|
| 1 | G 阶段"复用 workspace/preview.ts 渲染" | 明确: server 返回 HTML shell + JSON snapshot，**浏览器端**加载只读 renderer | 防止误解为 server 端 DOM 渲染 |
| 2 | B2 给 AI 注入完整 schema | 只注入摘要 (ID/名称/标签/aiWritable 字段)，校验端用完整 schema | 控制 prompt token 量 |
| 3 | D 阶段发布按钮直接出现 | G 未完成时发布按钮 disabled 或 hidden | 避免空功能入口 |
| 4 | A 阶段无历史兼容 | 补齐旧数据默认值，不因缺字段报错 | 现有项目数据兼容 |
| 5 | B1 seed data 无幂等说明 | INSERT OR IGNORE，seed 只插入不存在模板，不覆盖已有记录 | 避免重复 seed 污染数据 |
| 6 | F 阶段脱敏规则模糊 | 具体列出移除项和保留项，展示字段需用户确认 | 防止敏感信息泄露 |

---

## v1 → v2 变更记录

| # | 原计划 | 修正为 | 原因 |
|---|--------|--------|------|
| 1 | 案例库保存门户时自动创建 | 用户主动点击"录入资料库"才创建 | 避免草稿/测试项目污染案例库 |
| 2 | B 阶段无后台管理任务 | B1 增加后台卡片模板管理 UI | 卡片库必须有可维护的数据入口 |
| 3 | `ThemeConfig.logoEditable: boolean` | 删除此字段，Logo 始终可编辑 | 防止 AI 生成 logoEditable: false 破坏产品规则 |
| 4 | 本地标签遍历做语义匹配 | AI 提出选择 + schema 校验过滤 | 标签匹配不够用，AI 语义理解更准确 |
| 5 | 发布生成静态 HTML 快照 | 发布存 JSON snapshot + 只读 renderer | 降低一期工作量，后续再优化 |
| 6 | C 阶段未区分画像确认和需求摘要 | 明确为独立的"需求理解确认"步骤 | 避免只改画像弹窗文案 |
| 7 | H 阶段假设 loader.ts 存在 | 搜索实际模板加载入口 | 按实际代码结构操作 |

---

## 一期范围边界（确认不做的）

- AI 创建新卡片结构
- 完整可视化卡片设计器
- 客户端编辑
- 版本化客户发布链接
- 真实业务系统数据对接
- 直接 HTML 生成作为主数据源
- 静态 HTML 快照发布（后续优化）
