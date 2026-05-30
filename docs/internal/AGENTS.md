# AGENTS.md — Theme Studio 项目 AI 持久记忆

> **本项目 AI 助手（OpenCode/Sisyphus）在每次新对话时自动加载此文件。**
> **最后更新**: 2026-05-18

---

## 0. 2026-05-14 产品对齐覆盖说明

如果你是后续接手本项目的大模型，先读：

- `docs/internal/PRODUCT-ALIGNMENT.md`

从 2026-05-14 起，产品讨论统一按以下口径：

- Theme Studio 的**目标产品定义**是：`面向售前的 Portal Agent 工作台`
- 统一主链路是：`客户需求输入 → 信息补齐 → 摘要确认 → 生成新门户 → 预览迭代 → 全屏查看 → 保存 / 分享 / 再次编辑`
- 当前代码**仍然保留**部分主题设计、项目持久化的历史心智
- 当"目标产品"和"当前实现"冲突时，必须明确区分，不要混写

简化规则：

1. 讨论产品目标，用"Portal Agent / 门户生成与编辑"口径
2. 讨论当前代码，用"仍带主题设计历史壳"口径
3. 不要把 Theme Agent 当成最终目标，视觉主题生成只是门户生成子能力

---

## 一、项目身份

**这是一个面向售前的 Portal Agent 工作台。**

- **项目名**: Theme Studio（主题自动化 / Topic Automation）
- **项目路径**: `/Users/gulingfei/Desktop/APP（vibe-coding）/AlPage`
- **目标用途**: 售前在 Web 界面围绕单个客户描述需求并上传资料 → 系统收集足够客户信息 → 摘要确认 → 生成一个新门户 → 用户继续通过对话或直接编辑卡片调整 → 全屏查看 → 保存 / 分享 / 再次进入编辑
- **目标产品**: EKp / MK / KK 等 OA 系统（当前支持 V14 ~ V17）

---

## 二、架构概览

本项目以 **Path B（Web 浏览器流程）** 为主，Path A（旧 Pencil/CLI 流程）已弃用：

### 产品线 A：CLI + Pencil MCP（已弃用，仅作历史参考）

> ⚠️ 此路径已不再使用。相关说明只保留为历史背景，不能再当作当前执行步骤。

### 产品线 B：Theme Studio Web 应用（当前活跃，HTML + CSS + TS + Tailwind v4）

一个 AI 驱动的 Web 界面，让用户通过对话方式生成门户：

```
web/
├── index.html                      # 主入口（三栏布局：侧边栏 + 对话 + 预览）
├── desktop-preview.html            # 独立桌面预览页（截图用）
├── login-preview.html              # 独立登录预览页（截图用）
├── vite.config.ts                  # Vite + Tailwind v4 插件 + API proxy
├── package.json                    # theme-studio v0.1.0
├── tsconfig.json                   # ES2022 + bundler 模块解析
├── playwright.config.ts            # E2E 测试配置
├── .env                            # 环境变量（开发用）
├── .env.example                    # 环境变量示例
├── UI_GUIDELINES.md                # UI 指南
├── presets/                        # 预设配色（light-ui.json, dark-ui.json）
├── public/
│   ├── backgrounds/                # 预设背景图
│   ├── colors/                     # 配色 JSON（镜像自根 colors/）
│   ├── logo.png                    # 应用 Logo
│   └── assets/references/          # Symlink 到样例包
├── scripts/                        # Playwright 截图 + 构建
│   ├── screenshot.ts
│   ├── build.ts
│   ├── export-bridge.ts
│   ├── run-screenshot.sh
│   └── run-build.sh
├── e2e/                            # Playwright E2E 测试
│   └── smoke.spec.ts
├── screenshots/                    # 截图产物
└── src/
    ├── main.ts                     # 入口（165行）— 初始化 + showWorkspace + 路由
    ├── project-manager.ts          # 项目 CRUD + localStorage + 侧边栏 + 预设数据（354行）
    ├── theme-engine.ts             # CSS 变量管理 + 颜色操作 + QC + 模板加载（256行）
    ├── chat-manager.ts             # 聊天 UI + AI 调用 + 工具执行 + 流式响应（1347行）
    ├── package-manager.ts          # 历史打包弹窗残留（422行）
    ├── ui-setup.ts                 # DOM 事件 + 设置对话框 + 布局 + 预览面板（346行）
    ├── portal-agent.ts             # Portal Agent 入口 — 客户信息收集 + 摘要确认 + 门户生成编排
    ├── auth.ts                     # 认证模块 — SSO 登录 + 用户信息
    ├── credits.ts                  # 积分/次数管理
    ├── image-intent.ts             # 图片意图分类（主图 vs 参考图）
    ├── primary-image-flow.ts       # 主图直接生成流程
    ├── project-naming.ts           # 项目命名规则
    ├── workspace-recovery.ts       # 工作区恢复逻辑
    ├── landing-prompts.ts          # 首页快捷指令配置（8 条预设 prompt + primaryHint）
    ├── landing-prompts-admin.ts    # 首页快捷指令管理（admin 配置界面）
    ├── types.ts                    # TypeScript 类型定义
    ├── styles.css                  # 全局样式（与 Tailwind 共存）
    ├── tailwind.css                # Tailwind v4 设计令牌（21 CSS vars → 语义名）
    ├── api/                        # API 抽象层
    │   ├── card-templates.ts       # 卡片模板 CRUD
    │   ├── conversations.ts        # 对话历史 CRUD + 收藏/删除
    │   └── workspace.ts            # 工作区配置 CRUD（settings + items）
    ├── agent/                      # AI 对话层
    │   ├── chat-client.ts          # SSE 流式客户端（支持自定义模型 + 默认 qwen3.6-plus）
    │   ├── system-prompt.ts        # 动态 System Prompt（3-image preview 工作流指令）
    │   ├── knowledge-base.ts       # 34 预设描述 + 12 行业色板 + Header 指南
    │   ├── user-preferences.ts     # 跨项目偏好记忆（localStorage）
    │   └── tool-call-utils.ts      # Tool call enricher + detectThemeSelection + 色调推断
    ├── components/
    │   ├── color-editor.ts         # 21 色编辑面板 + 品牌色派生功能
    │   └── sidebar.ts              # 侧边栏组件（展开/收起、对话列表、收藏/删除）
    ├── export/                     # 历史导出链路残留
    │   ├── asset-snapshot.ts
    │   ├── build-config.ts
    │   ├── export-bridge.ts
    │   ├── export-history-view.ts
    │   ├── export-job.ts
    │   ├── export-open-client.ts
    │   ├── export-paths.ts
    │   ├── export-status-client.ts
    │   ├── live-preview-snapshot.ts
    │   ├── online-export.ts
    │   ├── online-export-state.ts
    │   ├── screenshot-rules.ts
    │   └── theme-image-overrides.ts
    ├── packaging/                  # 历史打包残留
    │   └── package-builder.ts
    ├── preview/                    # 预览相关
    │   ├── resize-preview.ts       # 预览缩放
    │   └── scale-layout.ts         # 布局缩放
    ├── templates/                  # HTML/CSS 模板（28 文件）
    │   ├── loader.ts               # 动态模板加载器
    │   ├── desktop-behavior.ts     # 桌面页交互逻辑
    │   ├── login-behavior.ts       # 登录页交互（Tab 切换、表单、验证码）
    │   ├── theme-images.ts         # 模板 ID → CSS 图片变量映射
    │   ├── theme-variables.css     # CSS 变量定义
    │   ├── login.html + login.css
    │   ├── desktop.html + desktop.css
    │   ├── sidebar.html + sidebar.css
    │   └── 9 种 Header 变体（HTML+CSS 配对）
    ├── theme/                      # 颜色与模板逻辑
    │   ├── color-utils.ts          # HSL/RGB 数学 + deriveColorsFromPrimary（Light+Dark）
    │   ├── header-semantics.ts     # Header ID → 显示名映射
    │   ├── template-registry.ts    # 模板配置（读取 config/web-template-registry.json）
    │   └── template-specific-vars.ts # Dark-UI 特殊 CSS 变量
    ├── workspace/                  # 工作区管理
    │   ├── index.ts                # 工作区模块入口
    │   ├── store.ts                # 工作区状态持久化（local + server 双写）
    │   ├── registry.ts             # 卡片模板注册表
    │   ├── runtime.ts              # 工作区运行时 — 卡片渲染、编辑、库浏览
    │   └── design-mode.ts          # 设计模式切换
    └── tools/                      # Tool Calling + Theme Agent
        ├── executor.ts             # 工具调度（generate_theme_previews + apply_selected_theme 等）
        ├── contrast-validator.ts   # WCAG 2.1 对比度校验
        ├── theme-intent-parser.ts  # 主题意图解析（6 类分类 + festival/nature subCategory）
        ├── theme-scene-planner.ts  # 场景规划（intent → 3 exploratory directions + 偏好回注）
        ├── theme-prompt-director.ts # Prompt 组装（HARD_NEGATIVES + COMPOSITION_PREFIX + sceneSentence）
        ├── theme-plan-checker.ts   # 场景计划 7 项质量校验
        ├── theme-feedback-refiner.ts # 反馈解析（9 种中英文模式）
        ├── theme-regeneration-director.ts # 反馈驱动的场景重建
        ├── theme-preference-updater.ts # 偏好决策引擎（项目短期 vs 客户长期）
        ├── theme-image-reviewer.ts # 生成图片自动评审（8 项检查 + 评分）
        ├── prompt-optimizer-config.ts # Prompt 优化配置
        ├── customer-visual-profile-store.ts # 客户长期偏好存储（localStorage）
        └── project-visual-context-store.ts  # 项目视觉上下文存储（localStorage）
```

**技术约束**：纯 HTML + CSS + TypeScript（不用 React/Vue），Tailwind CSS v4 仅用于设计令牌映射（不是组件库），中文 UI，CSS 变量驱动颜色。

---

## 三、核心工作流

**产品目标模型是 客户需求输入 → 信息补齐 → 摘要确认 → 生成新门户 → 预览迭代 → 全屏查看 → 保存 / 分享 / 再次编辑。**

| 环节 | 描述 | 触发方式 | 实现 |
|------|------|---------|------|
| **① 需求输入** | 售前输入客户需求并上传资料，系统收集客户信息 | 用户发起对话 | `chat-manager.ts` + 上下文收集逻辑 |
| **② 摘要确认** | 系统整理客户信息和门户理解，等待用户确认 | 信息足够后自动进入 | 当前实现缺少完整门槛与确认层 |
| **③ 门户生成** | 系统生成一个可预览、可继续编辑的新门户 | 摘要确认后执行 | 当前实现仍主要由主题预览与工作区状态拼装支撑 |
| **④ 预览迭代** | 用户继续对话修改，或直接编辑工作区卡片 | 用户主动操作 | `chat-manager.ts` + `workspace/runtime.ts` + `theme-engine.ts` |
| **⑤ 结果使用** | 用户全屏查看、保存、分享、再次进入编辑 | 用户对结果满意后 | 这是目标链路，当前实现仍未完全补齐 |

**重要区分**：

- 上表是**目标产品链路**
- 当前代码里仍存在 `package-manager.ts`、`export/` 等历史残留模块，这些不属于当前产品能力

**Agent 职责边界**：到用户满意预览为止（①②③④）。全屏查看后的结果使用由产品能力承接。

**核心原则**：
1. 先出图，再配色，保证主题色与背景图色调匹配
2. `archive/legacy-tools/rules/` 目录下规则是最高权威
3. 颜色必须由图片决定，不能凭空编造
4. CSS 变量驱动所有颜色，不硬编码
5. 当前代码已具备项目/工作区持久化基础，但产品表达应弱化“项目先行”


### Portal Agent 原则

Theme Studio 的目标 Agent 不是单纯的 Theme Agent，而是一个面向售前的 **Portal Agent**。其中图片生成能力只是 Portal Agent 的子能力。

#### Agent 目标
1. **客户信息补齐**：生成前必须补齐客户名称、客户行业、客户核心职能/业务特征、本次门户用途、重点卡片、品牌/视觉倾向。
2. **摘要确认**：在生成前先输出当前客户画像和门户理解，避免直接带着错误假设生成。
3. **门户初稿输出**：首轮结果至少达到可继续使用与微调的及格线，不是只有主题图，而是门户初稿。
4. **逐步学习**：随着客户长期使用，Agent 学会客户偏好的视觉方向，但不得污染其他项目与其他客户。

#### Agent 必须负责
- 当前客户信息收集与完成度判断
- 客户行业、品牌、用途到门户方案的理解收敛
- 门户结果规划：视觉主题 + 工作区结构 + 行业/企业适配示例内容
- 主题意图理解（category / subCategory / tone / color / useCase）
- 场景规划（scene / subject / composition / lighting / style / mood）
- OA 背景图约束（左锚点、右留白、企业感、非壁纸化）
- 用户反馈后的局部修正

#### Agent 绝对不能负责
- 打包、截图、导出逻辑（当前产品无此能力）

#### 技术边界
当前代码中，自动工具仍主要允许影响：
- 背景图 prompt 生成
- 图像生成结果选择与迭代
- 预览阶段的图片/色彩快照

#### 已实现模块（12 个）
- `theme-intent-parser.ts` — 6 类分类 + festival 6 子分类 + nature 4 子分类
- `theme-scene-planner.ts` — 3 exploratory directions + STYLE_SELECTION_MAP + 偏好回注
- `theme-prompt-director.ts` — HARD_NEGATIVES + COMPOSITION_PREFIX + concrete visual descriptions
- `theme-feedback-refiner.ts` — 9 种中英文反馈模式解析
- `theme-regeneration-director.ts` — 反馈驱动的场景重建
- `theme-preference-updater.ts` — 偏好决策引擎
- `theme-plan-checker.ts` — 7 项场景质量校验
- `theme-image-reviewer.ts` — 8 项图片自动评审 + 评分
- `customer-visual-profile-store.ts` — 客户长期偏好
- `project-visual-context-store.ts` — 项目视觉上下文
- `tool-call-utils.ts` — Tool call enricher + detectThemeSelection（支持 Light/Dark templateType）

---

## 四、关键规则速查

### 配色规则

| 规则 | 文件 | 核心要点 |
|------|------|---------|
| Light-UI | `archive/legacy-tools/rules/light-ui-color-rules.md` | 白色混合透明度、亮度排序 |
| Dark-UI | `archive/legacy-tools/rules/dark-ui-color-rules.md` | 色调偏移 +22°/+26°、sidebar-panel-bg = header-font |

### 背景图生成

- API：MiniMax（`api.minimaxi.com`，注意不是 `.io`）
- 模型：`image-01`
- `response_format` 必须 `url`（不是 `base64`，Token Plan 密钥用 base64 会返回 1033 错误）
- **禁止** `prompt_optimizer` 参数
- Prompt 必须包含："no text", "no UI elements"

---

## 五、21 个 CSS 变量体系

所有主题颜色由 21 个 CSS 变量驱动，这是核心数据结构：

```css
:root {
  /* 主题色系 */
  --primary-color
  --primary-color-hover
  --alter-color
  --alter-color-hover-on
  --primary-color-opacity-10
  --primary-color-opacity-20
  --primary-color-opacity-30

  /* 文字色系 */
  --header-font-color
  --auxiliary-gray
  --auxiliary-gray-dark

  /* 背景色系 */
  --body-bg-color
  --portal-header-bg-extend-color
  --portal-header-complex-bg-extend-color
  --login-bg-color
  --panel-bg-color

  /* 其他 */
  --sidebar-panel-bg
  --sidebar-color
  --sidebar-icon-color
  --border-color
  --border-icon-color
  --gradient-start
  --gradient-mid
}
```

---

## 六、常见坑和踩雷记录

| 问题 | 原因 | 解决 |
|------|------|------|
| 背景图一闪消失 | 用了相对路径 | **必须用绝对路径** |
| 硬编码旧色值残留 | 脚本只更新变量 | 需手动检查清理硬编码色值 |
| 找不到模板目录 | 目录名不一致 | `assets/references/samples/主题样例包` 是 symlink |
| CI workflow 反复被删 | PAT scope 问题 | 目前无 CI，不要重建 |
| Dark-UI 项目选择预览图后颜色不对 | detectThemeSelection 硬编码了 light-ui | 已修复：templateType 从项目上下文传递 |
| 预览图点击后没反应 | 旧版只填输入框不自动发送 | 已修复：点击预览图自动触发发送 |
| Festival 类图片全是灯笼 | buildThemeContent 不区分子分类 | 已修复：新增 6 个节日子分类 |
| MiniMax CDN 图片颜色提取失败（CORS） | 浏览器无法直接 fetch CDN 图片 | 使用 /api/proxy-image 服务端代理绕过 CORS |

---

## 七、目录结构速查

```
Topic Automation/
├── AGENTS.md              # ← 你正在读的文件（AI 持久记忆）
├── PRODUCT.md             # 产品定义（Web 应用规划）
├── PROJECT.md             # 项目简介
├── README.md              # 使用说明
├── package.json           # Root Node 项目（vitest + 依赖）
├── vite.config.ts         # Root vitest 配置（仅测试，非 Web 构建）
├── tsconfig.json          # Root TS 编译配置（NodeNext → dist/）
├── .env                   # API Keys（MINIMAX_API_KEY）
│
├── config/                # ⭐ 配置即数据层（JSON，驱动 Web 应用）
│   ├── header-mapping-light-ui.json
│   ├── theme-relations.json
│   ├── variable-mapping.json
│   ├── web-header-guides.json
│   ├── web-template-registry.json
│   └── web-version-compatibility.json
│
├── archive/               # 历史工具链与规则（仅供参考）
│   └── legacy-tools/rules/
│       ├── dark-ui-color-rules.md
│       ├── light-ui-color-rules.md
│       └── image-generation-rules.md
│
├── docs/                  # 项目文档
│   ├── README.md          # 文档导航
│   ├── 用户操作说明书.md
│   ├── PRD-产品使用流程.md
│   └── internal/          # 内部文档
│       ├── AGENTS.md
│       ├── PRODUCT.md
│       ├── PRODUCT-ALIGNMENT.md
│       ├── SKILL.md
│       ├── TEST-PLAN.md
│       ├── workflows/
│       └── archive/       # 历史实施计划与方案
│
├── scripts/               # 自动化脚本
│   ├── install-skill.sh       # Skill 安装
│   ├── prepare_export_assets.py # 历史素材准备脚本
│   └── verify-build.py        # 历史打包验证脚本
│
├── colors/                # 配色方案 JSON（35 个）
├── designs/
│   ├── sources/           # 模板（勿删改）
│   │   ├── Light-UI-模板.pen   # 设计参考模板
│   │   └── Dark-UI-模板.pen    # 设计参考模板
│   ├── backgrounds/       # 背景图（10 张）
│   ├── assets/            # avatars/ + news/
│   └── Topic-*.pen        # 历史/参考产物（非当前主链路）
│
├── assets/references/samples/主题样例包/  # 官方样例包（symlink）
│
├── src/                   # TypeScript 源码（27 文件，活跃维护）
│   ├── core/              # 核心模块
│   │   ├── ThemeDetector.ts    # 主题类型检测（历史兼容 + 当前版本）
│   │   ├── ColorUpdater.ts     # CSS 颜色更新
│   │   ├── ImageProcessor.ts   # 图片处理
│   │   ├── MetadataUpdater.ts  # 元数据更新
│   │   ├── PencilMCPClient.ts  # 历史 Pencil MCP 客户端（参考保留）
│   │   ├── ScssCompiler.ts     # SCSS 编译
│   │   ├── ThemeUpdater.ts     # 主题更新编排
│   │   └── VariableMapper.ts   # CSS 变量映射
│   ├── config/
│   │   └── themeRuleRegistry.ts # 主题规则注册表
│   ├── types/             # 类型定义
│   │   ├── ConfigTypes.ts
│   │   ├── DesktopAI.ts
│   │   ├── ManifestTypes.ts
│   │   └── ThemeType.ts
│   ├── utils/
│   │   ├── imageMappings.ts
│   │   └── penNodeMappings.ts
│   └── theme-automation/  # 工作流自动化
│       ├── core/          # AssetExtractor, ColorSchemeGenerator, DesignGenerator, WorkflowOrchestrator
│       ├── types/         # AssetTypes, ColorScheme, DesignAssets, WorkflowTypes
│       └── utils/         # colorUtils, namingUtils, penpotUtils
│
├── dist/                  # 编译产物（tsconfig.json → dist/）
│
├── tests/                 # Vitest 测试套件（139 文件，313 测试）
│   ├── unit/              # 单元测试
│   ├── integration/       # 1 个集成测试
│   ├── fixtures/          # 测试数据（colors, images, SCSS）
│   ├── helpers/           # 测试工具（fixtureZips.ts）
│   ├── latest/            # 运行时测试输出（建议忽略/可清理）
│   └── history/           # 历史测试输出（建议忽略/可清理）
│
└── web/                   # Theme Studio Web 应用
    ├── index.html         # 主入口
    ├── src/               # 源码（详见第二节产品线 B）
    ├── scripts/           # Playwright 截图 + 构建
    ├── e2e/               # Playwright E2E
    ├── presets/           # 预设配色
    ├── public/            # 静态资源（背景图、颜色、Logo）
    └── dist/              # 构建产物
```

---

## 八、AI 行为规范

### 新对话开场

当用户打开新对话时，你应该：

1. **读取此文件**（AGENTS.md）了解项目
2. 根据用户意图判断需要什么上下文：
   - Web 应用开发 → 读 `DESIGN.md` + `PRODUCT.md`
- 配色规则 → 读 `archive/legacy-tools/rules/` 全部规则
3. 向用户简要报告你了解的上下文

### Web 应用开发时

1. 遵循 `PRODUCT.md` 的产品定义
2. HTML + CSS + TypeScript，不用框架（React/Vue）
3. Tailwind CSS v4 仅用于设计令牌映射（`tailwind.css` 中 21 个 CSS vars → 语义名），不用于组件样式
4. 中文 UI
5. CSS 变量驱动颜色，不硬编码
6. `main.ts` 已拆分为多个模块，修改时找对模块：
   - 项目 CRUD → `project-manager.ts`
   - 聊天/AI → `chat-manager.ts`
   - 主题/颜色 → `theme-engine.ts`
   - UI/设置 → `ui-setup.ts`
   - 工作区 → `workspace/`
   - API 层 → `api/`
   - Portal Agent → `portal-agent.ts`

### 技术栈

| 层 | 技术 |
|----|------|
| Web 前端 | HTML + CSS + TypeScript + Tailwind v4（Vite 开发服务器） |
| 服务端 | Express + SQLite（sql.js） |
| AI 聊天 | 标准模式：用户自定义聊天模型；开发测试默认：通义千问 qwen3.6-plus（via DashScope Coding Plan API） |
| 图片生成 | 标准模式：用户自定义图像模型；开发测试默认：MiniMax image-01（via Token Plan API） |
| 设计文件 | `.pen` / 设计参考模板（仅作 HTML 模板参考） |
| 测试 | Vitest（单元，139 文件 313 测试）+ Playwright（E2E） |
| 构建 | Vite（Web）+ tsc（server → dist/） |

### Web 端 AI 数据流

```
用户消息 → chat-manager.ts::callAI()
  → chat-client.ts [SSE to qwen3.6-plus via Vite proxy → coding.dashscope.aliyuncs.com]
  ← 响应中嵌入 tool calls
  → tool-call-utils.ts::enrichToolCallsWithColorHints()
     ├─ detectThemeSelection → 用户选择预览图 → apply_selected_theme
     └─ 色调推断 + prompt 补全
  → executor.ts::executeTool()
     ├─ generate_theme_previews → 3 张不同风格预览图(MiniMax image-01 1920x1080)
     ├─ apply_selected_theme → 颜色提取(Canvas + /api/proxy-image) + deriveColorsFromPrimary()
     ├─ update_colors → 直接操作 CSS vars（通过 theme-engine.ts）
     ├─ validate_colors → contrast-validator.ts
     └─ save/load_colors → localStorage
  → theme-engine.ts 应用颜色、chat-manager.ts 展开预览、project-manager.ts 保存项目
```

### API 配置

| 配置 | 值 |
|------|-----|
| 聊天 API（dev） | `/api/chat` → Vite proxy → `coding.dashscope.aliyuncs.com` |
| 聊天 API（prod） | 由服务端 `/admin` 配置 |
| 聊天模型 | 由服务端 `/admin` 配置（dev 默认 `qwen3.6-plus`） |
| 图片 API | 由服务端 `/admin` 配置（dev 默认 `api.minimaxi.com/v1`） |
| 图片模型 | 由服务端 `/admin` 配置（dev 默认 `image-01`） |
| 环境变量 | 服务端 `.env`（ADMIN_PASSWORD、EKP SSO 等）；API Key 由 `/admin` 页面配置 |

### 模型接入说明（重要）

本项目存在两种不同语义的模型接入方式，必须明确区分：

#### 1. 产品标准接入（面向用户）

- 用户可以在界面设置中填写：
  - `apiEndpoint`
  - `apiKey`
  - `model`
  - `imageApiEndpoint`
  - `imageApiKey`
  - `imageModel`
- 这是产品正式能力，代表 Theme Studio 支持用户接入自定义聊天/图像模型。
- 相关代码：`web/src/ui-setup.ts`、`web/src/types.ts`。

#### 2. 开发测试接入（面向当前研发环境）

- 当前开发/测试默认跑的是：
  - DashScope Coding Plan
  - MiniMax Token Plan
- Web 端实际默认值不是普通公网 endpoint，而是：
  - `/api/chat` → Vite proxy → `coding.dashscope.aliyuncs.com`
  - `/api/image` → Vite proxy → `47.100.184.181`（Host 头伪装为 `api.minimaxi.com`）
- 这是一套为了当前研发环境稳定跑通而存在的特殊接法，不应误写为产品通用接入说明。
- 相关代码：`web/src/agent/chat-client.ts`、`web/vite.config.ts`。

#### 3. 文档原则

- 对外说明产品能力时，应描述“标准模型接入”。
- 解释当前本地开发/测试环境时，才描述 Coding Plan / 特殊代理配置。
- 不要把开发测试接法写成产品唯一正确接法。

---

## 九、环境依赖

- **Node.js**: `npm install`（项目根目录 + web/ 目录 + server/ 目录）
- **Playwright**: Web 端截图 + E2E 测试
- **API Keys**: 由服务端 `/admin` 页面配置，不存放在前端环境变量中
- **服务端 .env**: `ADMIN_PASSWORD`（必填）、EKP SSO 相关配置（生产环境必填）

---

## 十、已知技术债

| 问题 | 严重性 | 说明 |
|------|--------|------|
| `styles.css` 与 Tailwind 共存 | 🟡 中 | 两者职责边界不清，需明确分工 |
| 配色 JSON 双份存储 | 🟡 中 | `colors/` 和 `web/public/colors/` 内容相同，应考虑 symlink |
| `src/` 状态模糊 | 🟡 中 | AGENTS.md 曾标"已弃用"但实际 27 文件活跃维护 + 编译到 dist/ |
| 无 CI | 🟢 低 | CI workflow 已被删 3 次，暂不需要重建 |
| Dark-UI 规则文档亮度值已修正 | 🟢 低 | 原值 214-216 超出 HSL 范围，已修正为实际代码值 L≈85, L≈90 |
| `generate_theme_pipeline` 在 Web 流程中被转为 `generate_theme_previews` | 🟢 低 | 设计意图：始终走 3-image preview 流程，单图路径仅 CLI 使用 |

---

## 十一、历史决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-04-09 | 强制阶段锁定机制 | 防止 AI 跳步 |
| 2026-04-10 | 阶段从 5 阶段简化为 4 阶段 | 合并冗余步骤 |
| 2026-04-11 | Web 端架构重构：原生 HTML 模板替代 .pen 渲染引擎 | 性能和可维护性 |
| 2026-04-11 | 删除 `web/src/pen-renderer/`（8 文件） | 渲染从 pen-renderer 迁移到原生 HTML 模板 |
| 2026-04-12 | Web 端三列布局（豆包风格）+ 跨项目偏好记忆 | 产品体验升级 |
| 2026-04-12 | 创建 AGENTS.md 持久记忆 | 解决新对话丢失上下文问题 |
| 2026-04-12 | 引入 Tailwind CSS v4（仅设计令牌） | 21 CSS vars → 语义 token 映射 |
| 2026-04-12 | AI 模型从 GLM-4-Flash 切换到 qwen3.6-plus | 模型能力升级 |
| 2026-04-12 | 图片生成从智谱切换到 MiniMax image-01 | 专用图片模型质量更好 |
| 2026-04-13 | 引入 `config/` 配置即数据层 | 集中管理硬编码配置，CLI + Web 共享 |
| 2026-04-13 | Header 模板扩展到 9 种变体 | 覆盖更多 OA 版本布局需求 |
| 2026-04-13 | `src/` 从"已弃用"升级为活跃维护 | 新增 theme-automation 工作流 + 25 单元测试 |
| 2026-04-13 | AGENTS.md 全面更新 | 反映 Codex 修改后的实际项目状态 |
| 2026-04-13 | `main.ts` 上帝模块拆分 | 拆分为多个模块：project-manager, theme-engine, chat-manager, ui-setup 等 |
| 2026-04-13 | 删除死代码 `preview/theme-renderer.ts` | 零引用，已被 theme-engine.ts 替代 |
| 2026-04-13 | API 端点修正：Coding Plan + MiniMax Token Plan | dashscope→coding.dashscope, minimax response_format→url, IP 直连 47.100.184.181 |
| 2026-04-13 | 测试修复：ChatClientSettings.test.ts | 更新端点断言从旧 dashscope 直连到 /api/chat proxy |
| 2026-04-13 | 文档全面更新 | AGENTS.md、开发者系统流程图、实施路线图同步新模型 |
| 2026-04-19 | Theme Agent prompt pipeline 重建 | 从 7-field 抽象模板改为 concrete visual descriptions（~765 chars） |
| 2026-04-19 | 图片分辨率从 1280x720 提升到 1920x1080 | 更高质量的背景图 |
| 2026-04-19 | 3-image preview 流程：生成 3 张不同风格预览图供用户选择 | 提升首次生成命中率 |
| 2026-04-19 | 新增 12 个 Theme Agent 模块 | 意图解析、场景规划、prompt 组装、反馈解析等 |
| 2026-04-19 | Festival 子分类支持（春节/中秋/端午/国庆/清明/元宵） | 不同节日生成不同视觉内容 |
| 2026-04-19 | 修复 detectThemeSelection 硬编码 light-ui 的 bug | Dark-UI 项目选择预览图后现在正确应用暗色规则 |
| 2026-04-19 | 修复 Dark-UI ranking 目标亮度与 derivation 不匹配 | ranking 从 L=38 改为 L=66，匹配 derivation 钳制范围 |
| 2026-04-19 | 修复 imageProxyPlugin proxy agent 死代码 | 改为 http/https.get + HttpsProxyAgent |
| 2026-04-19 | 点击预览图自动发送选择消息 | 无需用户手动按发送 |
| 2026-04-19 | 删除死代码 prompt-enhancer.ts + quality-anchors.json | 零引用，已被 Theme Agent pipeline 替代 |
| 2026-04-19 | 修复 9 个过时测试断言 | 测试全部通过 |
| 2026-04-19 | Dark-UI 规则文档亮度值修正 | 214-216→85, 180+→90（HSL L 范围 0-100） |
