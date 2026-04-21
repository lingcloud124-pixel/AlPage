# AGENTS.md — Theme Studio 项目 AI 持久记忆

> **本项目 AI 助手（OpenCode/Sisyphus）在每次新对话时自动加载此文件。**
> **最后更新**: 2026-04-19

---

## 一、项目身份

**这是一个 OA 系统主题包生成工具，不是网页设计工具。**

- **项目名**: Theme Studio（主题自动化 / Topic Automation）
- **项目路径**: `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation`
- **核心用途**: 用户在 Web 界面描述需求 → AI 生成背景图 → 提取配色 → HTML 模板实时预览 → 用户按需选择产品 → 后台截图打包 → 生成 15 个 OA 主题 zip 包
- **目标产品**: EKp / MK / KK 等 OA 系统（版本 V12 ~ V17）
- **Skill 名称**: `theme-automation`

---

## 二、架构概览

本项目以 **Path B（Web 浏览器流程）** 为主，Path A（旧 Pencil/CLI 流程）已弃用：

### 产品线 A：CLI + Pencil MCP（已弃用，仅作历史参考）

> ⚠️ 此路径已不再使用。相关说明只保留为历史背景，不能再当作当前执行步骤。

### 产品线 B：Theme Studio Web 应用（当前活跃，HTML + CSS + TS + Tailwind v4）

一个 AI 驱动的 Web 界面，让用户通过对话方式生成主题：

```
web/
├── index.html                      # 主入口（三列布局：侧边栏 + 对话 + 预览）
├── desktop-preview.html            # 独立桌面预览页（截图用）
├── login-preview.html              # 独立登录预览页（截图用）
├── vite.config.ts                  # Vite + Tailwind v4 插件 + chat/image/export proxy
├── package.json                    # theme-studio v0.1.0
├── tsconfig.json                   # ES2022 + bundler 模块解析
├── playwright.config.ts            # E2E 测试配置
├── .env                            # VITE_DASHSCOPE_API_KEY, VITE_MINIMAX_API_KEY
├── .env.example                    # 环境变量示例
├── UI_GUIDELINES.md                # UI 指南
├── presets/                        # 预设配色（light-ui.json, dark-ui.json）
├── public/
│   ├── backgrounds/                # 14 张预设背景图
│   ├── colors/                     # 35 个配色 JSON（镜像自根 colors/）
│   ├── logo.png                    # 应用 Logo
│   └── assets/references/          # Symlink 到样例包
├── scripts/                        # Playwright 截图 + 构建 + 本地导出桥接
│   ├── screenshot.ts
│   ├── build.ts
│   ├── export-bridge.ts
│   ├── run-screenshot.sh
│   └── run-build.sh
├── e2e/                            # Playwright E2E 测试
│   └── smoke.spec.ts
├── screenshots/                    # 截图产物
└── src/
    ├── main.ts                     # 精简入口（143行）— 初始化 + showWorkspace + 路由
    ├── project-manager.ts          # 项目 CRUD + localStorage + 侧边栏 + 预设数据（509行）
    ├── theme-engine.ts             # CSS 变量管理 + 颜色操作 + QC + 模板加载（192行）
    ├── chat-manager.ts             # 聊天 UI + AI 调用 + 工具执行 + 流式响应（678行）
    ├── package-manager.ts          # 打包模态框 + 导出任务创建（146行）
    ├── ui-setup.ts                 # DOM 事件 + 设置对话框 + 布局 + 预览面板（291行）
    ├── types.ts                    # TypeScript 类型定义
    ├── styles.css                  # 全局样式（与 Tailwind 共存）
    ├── tailwind.css                # Tailwind v4 设计令牌（21 CSS vars → 语义名）
    ├── agent/                      # AI 对话层
    │   ├── chat-client.ts          # SSE 流式客户端（Coding Plan qwen3.6-plus + MiniMax image-01 1920x1080）
    │   ├── system-prompt.ts        # 动态 System Prompt（3-image preview 工作流指令）
    │   ├── knowledge-base.ts       # 34 预设描述 + 12 行业色板 + Header 指南
    │   ├── user-preferences.ts     # 跨项目偏好记忆（localStorage）
    │   └── tool-call-utils.ts      # Tool call enricher + detectThemeSelection + 色调推断
    ├── components/
    │   └── color-editor.ts         # 21 色编辑面板 + 品牌色派生功能
    ├── packaging/
    │   └── package-builder.ts      # 旧浏览器打包实现（保留参考，非产品主链）
    ├── export/
    │   ├── screenshot-rules.ts     # 截图目标定义（读取 config/pen-export-rules.json）
    │   ├── build-config.ts         # theme_builder 请求生成
    │   ├── export-job.ts           # 导出任务与批次快照
    │   ├── export-paths.ts         # 导出根目录/项目目录/批次目录
    │   └── export-bridge.ts        # 本地导出桥接契约
    ├── templates/                  # HTML/CSS 模板（28 文件）
    │   ├── loader.ts               # 动态模板加载器
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
    └── tools/                      # Tool Calling + Theme Agent
        ├── executor.ts             # 工具调度（generate_theme_pipeline + update_colors 等）
        ├── contrast-validator.ts   # WCAG 2.1 对比度校验
        ├── theme-intent-parser.ts  # 主题意图解析（6 类分类 + festival/nature subCategory）
        ├── theme-scene-planner.ts  # 场景规划（intent → scenePlan + 偏好回注）
        ├── theme-prompt-director.ts # Prompt 组装（HARD_NEGATIVES + COMPOSITION_PREFIX + sceneSentence）
        ├── theme-plan-checker.ts   # 场景计划 7 项质量校验
        ├── theme-feedback-refiner.ts # 反馈解析（9 种中英文模式）
        ├── theme-regeneration-director.ts # 反馈驱动的场景重建
        ├── theme-preference-updater.ts # 偏好决策引擎（项目短期 vs 客户长期）
        ├── theme-image-reviewer.ts # 生成图片自动评审（8 项检查 + 评分）
        ├── customer-visual-profile-store.ts # 客户长期偏好存储（localStorage）
        └── project-visual-context-store.ts  # 项目视觉上下文存储（localStorage）
```

**技术约束**：纯 HTML + CSS + TypeScript（不用 React/Vue），Tailwind CSS v4 仅用于设计令牌映射（不是组件库），中文 UI，CSS 变量驱动颜色。

---

## 三、核心工作流

**产品模型是 创建 → 迭代 → 导出，不是线性流水线。**

| 环节 | 描述 | 触发方式 | 实现 |
|------|------|---------|------|
| **① 创建** | AI 对话生成背景图 → 提取配色 → 实时预览 | 用户发起对话 | `chat-manager.ts` → `executor.ts` → MiniMax API → `theme-engine.ts` |
| **② 迭代** | 用户继续对话微调，或通过颜色面板手动修改 | 用户主动操作 | `chat-manager.ts` + `color-editor.ts` + `theme-engine.ts` |
| **③ 导出** | 用户选择产品 → 创建导出批次 → 后台截图 + 打包 → 输出到用户配置目录 | 用户点击打包按钮 | 产品功能，本地桥接 + `screenshot.ts` + `theme_builder.py` |

**Agent 职责边界**：到用户满意预览为止（①②）。导出（③）是产品功能，Agent 不参与。

**核心原则**：
1. 先出图，再配色，保证主题色与背景图色调匹配
2. `rules/` 目录下规则是最高权威
3. 颜色必须由图片决定，不能凭空编造
4. CSS 变量驱动所有颜色，不硬编码
5. 项目持久化（localStorage），用户可随时打开历史项目继续编辑或重新打包
6. 导出根目录由用户在设置中配置，导出路径固定为 `导出根目录/projects/{projectId}-{nameEn}/exports/{timestamp}/`

### Theme Agent（主题视觉总监）原则

Theme Studio 的图片生成能力应逐步演进为一个 **Theme Agent**，用于替代“直译 prompt → 生图”的薄弱链路。

#### Agent 目标
1. **首图保底**：第一张图至少达到可继续使用与微调的及格线，不跑题、不像通用壁纸。
2. **逐步学习**：随着客户长期使用，Agent 学会客户偏好的视觉方向，但不得污染其他项目与其他客户。

#### Agent 必须负责
- 主题意图理解（category / subCategory / tone / color / useCase）
- 场景规划（scene / subject / composition / lighting / style / mood）
- OA 背景图约束（左锚点、右留白、企业感、非壁纸化）
- 用户反馈后的局部修正

#### Agent 绝对不能负责
- 打包逻辑
- 截图逻辑
- 导出目录与批次结构
- zip 生成与 verify

#### 技术边界
Theme Agent 只允许影响：
- 背景图 prompt 生成
- 图像生成结果选择与迭代
- 预览阶段的图片/色彩快照

导出阶段只能消费已经确认的项目快照，**不允许在打包时重新生图或动态重算方向**。

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
| Light-UI | `rules/light-ui-color-rules.md` | 白色混合透明度、亮度排序 |
| Dark-UI | `rules/dark-ui-color-rules.md` | 色调偏移 +22°/+26°、sidebar-panel-bg = header-font |

### 背景图生成

- API：MiniMax（`api.minimaxi.com`，注意不是 `.io`）
- 模型：`image-01`
- `response_format` 必须 `url`（不是 `base64`，Token Plan 密钥用 base64 会返回 1033 错误）
- **禁止** `prompt_optimizer` 参数
- Prompt 必须包含："no text", "no UI elements"

### 切图导出

- **必须用 `scale: 1`**（不能用 scale: 2）
- Light-UI 节点：`A7bgM`(60px), `TdfhH`(90px), `C0kVM`(130px), `Nk9d0`(banner), `jTA4O`(sidebar), `LiN3g`(login bg), `nXv3Y`(login full), `dKOHu`(desktop)
- Dark-UI 节点：`y6LPs`, `CagmA`, `KDpQp`, `K7n6g`, `zmpSH`, `PAgAA`, `nXv3Y`, `dKOHu`

### 打包

- 15 个 zip：MK(2) + V12(2) + V13_5(4) + V14_16(5) + V17(2)
- 前端只负责创建导出任务，不直接拼 zip
- 本地桥接层负责执行 `web/scripts/screenshot.ts`、`web/scripts/build.ts`、`theme_builder.py`
- 深度验证：`python3 scripts/deep-verify.py`

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
| 打包图片是模板原始图 | 截图链没有使用当前项目快照 | 背景图与色值必须从当前项目快照注入截图模板 |
| 硬编码旧色值残留 | 脚本只更新变量 | 需手动检查清理硬编码色值 |
| 找不到模板目录 | 目录名不一致 | `assets/references/samples/主题样例包` 是 symlink |
| `npm run update` 失败 | 已弃用 | 用 `python3 theme_builder.py` |
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
├── SKILL.md               # Agent 操作手册（创建 + 迭代，不含导出）
├── PRODUCT.md             # 产品定义（Web 应用规划）
├── DESIGN.md              # 设计系统文档
├── PROJECT.md             # 项目简介
├── README.md              # 使用说明
├── 操作说明书.md           # 用户操作手册
├── TEST-PLAN.md           # 测试计划（~85 个用例）
├── theme_builder.py       # 统一打包工具（15 zip）
├── manifest.json          # 旧工具链 manifest（历史保留，非当前主链路）
├── theme-build-request.yaml # CLI 打包配置
├── package.json           # Root Node 项目（vitest + 依赖）
├── vite.config.ts         # Root vitest 配置（仅测试，非 Web 构建）
├── tsconfig.json          # Root TS 编译配置（NodeNext → dist/）
├── .env                   # API Keys（MINIMAX_API_KEY）
│
├── config/                # ⭐ 配置即数据层（8 JSON，驱动 CLI + Web）
│   ├── build-verification-rules.json
│   ├── header-mapping-light-ui.json
│   ├── pen-export-rules.json
│   ├── theme-relations.json
│   ├── variable-mapping.json
│   ├── web-header-guides.json
│   ├── web-template-registry.json
│   └── web-version-compatibility.json
│
├── rules/                 # ⭐ 技术规则铁律
│   ├── dark-ui-color-rules.md
│   ├── light-ui-color-rules.md
│   ├── image-generation-rules.md
│   └── export-rules.md
│
├── workflows/             # 流程文档（5 个）
├── docs/                  # 项目文档（9 个）
│   ├── PRD-产品使用流程.md
│   ├── 三阶段演进计划.md
│   ├── 专项技术方案-Pencil到HTML预览与截图打包.md
│   ├── 外部资料整理-主题规则切图打包映射.md
│   ├── 实施路线图-开发任务拆分表.md
│   ├── 开发者系统流程图.md
│   ├── 用户操作说明书.md
│   └── plans/             # 历史实施计划
│
├── scripts/               # 自动化脚本（17 个 + lib/）
│   ├── update-pen-theme.py    # 历史 Pen 文件更新脚本（非当前主链路）
│   ├── verify-build.py        # 打包后验证
│   ├── deep-verify.py         # 深度验证
│   ├── export-pen-images.py   # 历史图片导出脚本（非当前主链路）
│   ├── install-skill.sh       # Skill 安装
│   ├── image_gen.py           # 图片生成 CLI
│   ├── validate-colors.py     # 色值验证
│   ├── apply-theme.mjs        # 主题应用
│   ├── generate-manifest.mjs  # 历史 Manifest 生成脚本
│   ├── verify-export.mjs      # 导出验证
│   ├── verify-theme.mjs       # 主题验证
│   ├── validate-phase.mjs     # 阶段验证
│   ├── e2e-test.mjs           # E2E 测试运行器
│   ├── check-dark-ui-colors.sh # Dark-UI 色值检查
│   ├── run-updater.mjs        # 已弃用（历史残留）
│   ├── generate_sample_image.py # 样例图片生成
│   └── lib/                   # 共享库
│       ├── build-global-colors.mjs
│       └── export-asset-rules.mjs
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
│   │   ├── ThemeDetector.ts    # 主题类型检测（V12~V17）
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
├── tests/                 # Vitest 测试套件（82 文件，247 测试）
│   ├── unit/              # 82 个单元测试
│   ├── integration/       # 1 个集成测试
│   ├── fixtures/          # 测试数据（zips, colors, images, SCSS）
│   ├── helpers/           # 测试工具（fixtureZips.ts）
│   ├── latest/            # 运行时测试输出（建议忽略/可清理）
│   └── history/           # 历史测试输出（建议忽略/可清理）
│
├── web/                   # Theme Studio Web 应用
│   ├── index.html         # 主入口（三列布局）
│   ├── src/               # 源码（详见第二节产品线 B）
│   ├── scripts/           # Playwright 截图 + 构建
│   ├── e2e/               # Playwright E2E
│   ├── presets/           # 预设配色
│   ├── public/            # 静态资源（背景图、颜色、Logo）
│   └── dist/              # 构建产物
│
└── output/                # 输出
    └── {日期}-{nameEn}/
        ├── 素材包/
        └── 输出包/
```

---

## 八、AI 行为规范

### 新对话开场

当用户打开新对话时，你应该：

1. **读取此文件**（AGENTS.md）了解项目
2. 根据用户意图判断需要什么上下文：
   - Web 应用开发 → 读 `DESIGN.md` + `PRODUCT.md`
   - 配色规则 → 读 `rules/` 全部规则
3. 向用户简要报告你了解的上下文

### Web 应用开发时

1. 遵循 `DESIGN.md` 的设计规范
2. HTML + CSS + TypeScript，不用框架（React/Vue）
3. Tailwind CSS v4 仅用于设计令牌映射（`tailwind.css` 中 21 个 CSS vars → 语义名），不用于组件样式
4. 中文 UI
5. CSS 变量驱动颜色，不硬编码
6. `main.ts` 已拆分为 5 个模块，修改时找对模块：
   - 项目 CRUD → `project-manager.ts`
   - 聊天/AI → `chat-manager.ts`
   - 主题/颜色 → `theme-engine.ts`
   - 打包 → `package-manager.ts`
   - UI/设置 → `ui-setup.ts`

### 技术栈

| 层 | 技术 |
|----|------|
| 主题包 | Python（当前主线为 `theme_builder.py`，其余历史脚本仅作参考） |
| Web 前端 | HTML + CSS + TypeScript + Tailwind v4（Vite 开发服务器） |
| AI 聊天 | 标准模式：用户自定义聊天模型；开发测试默认：通义千问 qwen3.6-plus（via DashScope Coding Plan API） |
| 图片生成 | 标准模式：用户自定义图像模型；开发测试默认：MiniMax image-01（via Token Plan API） |
| 设计文件 | `.pen` / 设计参考模板（仅作 HTML 模板参考） |
| 截图 | Playwright |
| 图片处理 | ImageMagick（convert） |
| 测试 | Vitest（单元，82 文件 247 测试）+ Playwright（E2E） |
| 构建 | Vite（Web）+ tsc（src/ → dist/） |

### Web 端 AI 数据流

```
用户消息 → chat-manager.ts::callAI()
  → chat-client.ts [SSE to qwen3.6-plus via Vite proxy → coding.dashscope.aliyuncs.com]
  ← 响应中嵌入 tool calls
   → tool-call-utils.ts::enrichToolCallsWithColorHints()
      └─ 色调推断 + prompt 补全
   → executor.ts::executeTool()
      ├─ generate_theme_pipeline → 1 张背景图(MiniMax image-01 1920x1080) + 颜色提取 + 配色应用
      ├─ update_colors → 直接操作 CSS vars（通过 theme-engine.ts）
     ├─ validate_colors → contrast-validator.ts
     └─ save/load_colors → localStorage
  → theme-engine.ts 应用颜色、chat-manager.ts 展开预览、project-manager.ts 保存项目
```

### API 配置

| 配置 | 值 |
|------|-----|
| 聊天 API（dev） | `/api/chat` → Vite proxy → `coding.dashscope.aliyuncs.com` |
| 聊天 API（prod） | `coding.dashscope.aliyuncs.com/v1` |
| 聊天模型 | `qwen3.6-plus` |
| 图片 API | `api.minimaxi.com/v1` |
| 图片模型 | `image-01` |
| 环境变量 | `VITE_DASHSCOPE_API_KEY`, `VITE_MINIMAX_API_KEY` |

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

- **Node.js**: `npm install`（项目根目录 + web/ 目录）
- **Python 3**: `theme_builder.py`、`deep-verify.py`（`update-pen-theme.py` 属历史参考脚本）
- **ImageMagick**: `convert` 命令（切图裁剪）
- **Pencil**: 仅在查看历史参考模板时可能需要，不属于当前产品必需依赖
- **Playwright**: Web 端截图 + E2E 测试
- **导出根目录**: 用户在设置中配置，本地桥接层必须有写权限
- **API Keys**:
  - 根 `.env`: `MINIMAX_API_KEY`
  - `web/.env`: `VITE_DASHSCOPE_API_KEY`, `VITE_MINIMAX_API_KEY`
  - 注意：根 `.env` 主要服务于根目录脚本/打包链路；Web 工作台主要依赖 `web/.env`

---

## 十、已知技术债

| 问题 | 严重性 | 说明 |
|------|--------|------|
| `styles.css` 与 Tailwind 共存 | 🟡 中 | 两者职责边界不清，需明确分工 |
| 配色 JSON 双份存储 | 🟡 中 | `colors/` 和 `web/public/colors/` 内容相同，应考虑 symlink |
| `src/` 状态模糊 | 🟡 中 | AGENTS.md 曾标"已弃用"但实际 27 文件活跃维护 + 编译到 dist/ |
| 无 CI | 🟢 低 | CI workflow 已被删 3 次，暂不需要重建 |
| Dark-UI 规则文档亮度值已修正 | 🟢 低 | 原值 214-216 超出 HSL 范围，已修正为实际代码值 L≈85, L≈90 |

---

## 十一、历史决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-04-09 | 废弃 `run-updater.mjs`，改用 `theme_builder.py` | 旧工具链 bug 多，13包→15包 |
| 2026-04-09 | 引入 `verify-build.py` 自动验证 | 避免人工检查 15 个 zip |
| 2026-04-09 | 强制阶段锁定机制 | 防止 AI 跳步 |
| 2026-04-10 | 阶段从 5 阶段简化为 4 阶段 | 合并冗余步骤 |
| 2026-04-11 | Web 端架构重构：原生 HTML 模板替代 .pen 渲染引擎 | 性能和可维护性 |
| 2026-04-11 | 删除 `web/src/pen-renderer/`（8 文件） | 渲染从 pen-renderer 迁移到原生 HTML 模板 |
| 2026-04-12 | Web 端三列布局（豆包风格）+ 跨项目偏好记忆 | 产品体验升级 |
| 2026-04-12 | 创建 AGENTS.md 持久记忆 | 解决新对话丢失上下文问题 |
| 2026-04-12 | 引入 Tailwind CSS v4（仅设计令牌） | 21 CSS vars → 语义 token 映射 |
| 2026-04-12 | AI 模型从 GLM-4-Flash 切换到 qwen3.6-plus | 模型能力升级 |
| 2026-04-12 | 图片生成从智谱切换到 MiniMax image-01 | 专用图片模型质量更好 |
| 2026-04-12 | 引入 `deep-verify.py` 深度验证 | 更严格的打包后校验 |
| 2026-04-13 | 引入 `config/` 配置即数据层 | 集中管理硬编码配置，CLI + Web 共享 |
| 2026-04-13 | Header 模板扩展到 9 种变体 | 覆盖更多 OA 版本布局需求 |
| 2026-04-13 | `src/` 从"已弃用"升级为活跃维护 | 新增 theme-automation 工作流 + 25 单元测试 |
| 2026-04-13 | AGENTS.md 全面更新 | 反映 Codex 修改后的实际项目状态 |
| 2026-04-13 | `main.ts` 上帝模块拆分（2310→143行） | 拆分为 5 个模块：project-manager, theme-engine, chat-manager, package-manager, ui-setup |
| 2026-04-13 | 删除死代码 `preview/theme-renderer.ts` | 零引用，已被 theme-engine.ts 替代 |
| 2026-04-13 | API 端点修正：Coding Plan + MiniMax Token Plan | dashscope→coding.dashscope, minimax response_format→url, IP 直连 47.100.184.181 |
| 2026-04-13 | 测试修复：ChatClientSettings.test.ts | 更新端点断言从旧 dashscope 直连到 /api/chat proxy |
| 2026-04-13 | SKILL.md v9.0：Agent 职责边界重定义 | 从 4 阶段流水线改为创建→迭代→导出，导出归产品功能 |
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
| 2026-04-19 | 修复 9 个过时测试断言 | 测试文件 82/82 通过，247/247 测试通过 |
| 2026-04-19 | Dark-UI 规则文档亮度值修正 | 214-216→85, 180+→90（HSL L 范围 0-100） |
