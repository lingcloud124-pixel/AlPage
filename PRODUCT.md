# Theme Studio — 产品定义文档

> **版本**: v2.0 | **更新日期**: 2026-04-10 | **状态**: 规划中
> **本文档是产品的单一事实来源，所有迭代围绕本文档进行。**

---

## 一、产品定位

**一句话**：用户通过对话生成和管理 OA 主题，实时看到效果图，满意后一键打包。

**核心交互模型**：

```
对话是唯一入口。新建主题 = 开启一段新对话。

用户输入 → AI 分析 → 生成配色方案 → 实时预览 → 用户反馈 → AI 调整 → 满意后打包

对话支持三种输入：
1. 文字描述（"做一个国庆节喜庆主题"）
2. 图片（上传参考图 / 品牌素材 / 气氛图）
3. .pen 文件（上传已有设计，AI 解析并还原/改造）
```

**色值编辑面板的角色**：
- 不是独立入口，是对话流程中的**微调工具**
- AI 生成配色方案后，用户可以在面板上手动精调单个色值
- 面板上的改动实时反映到预览区
- 修改色值有两种方式，用户可自由选择：
  1. **对话修改**："把主题色调亮一点" → AI 理解意图 → 自动调整相关色值
  2. **手动改值**：直接在色值面板中点击颜色选择器或输入 hex 值

**核心价值**：
- 替代 Pencil 设计工具，用 HTML 实时渲染替代静态 .pen 文件预览
- 用对话式交互替代手动配色，降低主题制作门槛
- 保留专业级打包质量，输出与当前方案完全一致的 15 个 zip 包

**不是什么**：
- 不是通用网页设计工具
- 不是 AI 聊天机器人产品
- 不是设计系统管理平台

---

## 二、当前状态

### 已完成

| 能力 | 状态 | 说明 |
|------|------|------|
| 切图流程 | ✅ 可用 | 从 .pen 文件导出精确尺寸的 header/login 图片 |
| 色值注入 | ✅ 可用 | `theme_builder.py` 替换 CSS/SCSS 中的主题色 |
| 批量打包 | ✅ 可用 | 输出 15 个 zip（MK + V12~V17 的主体+登录包） |
| 验证脚本 | ✅ 可用 | `verify-build.py` 验证包结构、色值、图片 |
| 配色方案库 | ✅ 可用 | `colors/` 下 36 个已验证的 JSON 配色方案 |
| SKILL 流程 | ✅ 可用 | 4 阶段 SOP（配色→背景图→切图→打包） |
| 经验积累 | ✅ 可用 | `.sisyphus/notepads/` 下的项目记忆 |

### 待建设

| 能力 | 阶段 | 说明 |
|------|------|------|
| HTML 实时预览 | Phase 1 | 替代 Pencil，毫秒级渲染登录页+主页 |
| 截图导出 | Phase 1 | Playwright 截图，精确尺寸 PNG/JPG |
| Skill 驱动的对话 Agent | Phase 2 | LLM 按 SKILL 流程执行，Tool Calling 驱动 |
| 项目管理+记忆 | Phase 3 | 对话历史即项目，跨项目偏好积累 |
| Agent 增强 | Phase 4 | 自动生成背景图、批量主题、配色推荐 |

---

## 三、核心设计决策

### 决策 1：废弃 Pencil

**决定**：完全废弃 Pencil (.pen) 作为设计源和预览工具。

**理由**：
- .pen 文件的 header 图层本质是 `背景图(opacity) + 左渐变 + 右渐变 + 纯色底`，HTML/CSS 完全可以还原
- 打包流程 (`theme_builder.py`) 不依赖 Pencil，只需要图片文件路径 + 色值配置
- Pencil 是额外依赖，增加流程复杂度

**约束**：
- 预览用 HTML 渲染（快速迭代）
- 打包用 Playwright 截图（精确尺寸，保证输出质量）
- 输出包必须与当前 Pencil 方案完全一致

### 决策 2：Chat UI 不复用开源项目

**调研结论**：LibreChat(35k⭐)、LobeChat(73k⭐)、Open WebUI(130k⭐)、NextChat(87k⭐) 等都是独立应用，不是可嵌入组件。

**决定**：用 shadcn/ui 自建 Chat 面板，支持左对话+右预览的分栏布局。

### 决策 3：AI 接入用 LiteLLM Gateway

**决定**：LiteLLM Proxy 作为统一 AI 网关。

**理由**：
- 自托管、100+ provider、统一 OpenAI 兼容 API
- 用户在设置页配置自己的 API Key（BYOK）
- 支持成本追踪、负载均衡、故障转移
- 前端只对接一个 API endpoint

**不做**：
- ❌ 不用 OpenClaw（是个人 AI 助手平台，不符合）
- ❌ 不用 AG-UI/MCP（过度设计，Tool Calling 足够）
- ❌ 不直接接模型 SDK（用户切换模型太麻烦）

### 决策 4：Skill 直接转为 System Prompt

**决定**：现有 `SKILL.md` 改造为对话机器人的 System Prompt。

**理由**：
- SKILL.md 已经定义了完整的 4 阶段流程、色值规则、验证清单
- 只需要把"Pencil 操作"替换为"HTML 渲染 + Playwright 截图"
- LLM 通过 Tool Calling 输出 JSON 动作指令，前端解析执行

### 决策 5：记忆分两层

| 层 | 内容 | 存储 |
|----|------|------|
| 项目记忆 | 每个主题的配色方案、对话历史、修改记录 | 项目数据库/JSON |
| 跨项目记忆 | 用户偏好、配色习惯、踩坑经验 | 全局 learnings 存储 |

---

## 四、技术架构

### 渲染公式（替代 .pen 图层）

从 .pen 文件分析得出的通用 header 渲染公式：

```
header(高度, 类型) = CSS 渲染 {
  底色: $portal-header-xxx-extend-color 或 $primary-color
  背景图: AI图(或纯色), opacity: 0.5 | 0.6 | 1.0
  左渐变: themeDeepColor → transparent, 宽度: 859px | 1145px
  右渐变: themeDeepColor → transparent, 宽度: 920px | 1226px
}
```

### 各组件图层对照表

| 组件 | 底色变量 | 背景图opacity | 左渐变宽 | 右渐变宽 |
|------|---------|--------------|---------|---------|
| 默认页眉 60px | `$portal-header-complex-bg-extend-color` | 1.0 | 859 | 920 |
| 经典页眉 130px | `$primary-color` | 0.5 | 859 | 920 |
| 横幅页眉 480px | `$portal-header-bg-extend-color` | 0.6 | 1145 | 1226 |
| 侧边页眉 | `$sidebar-panel-bg` | 1.0 | — | — |
| 登录页 | PAgAA 纯色或 AI 图 | 1.0 | — | — |
| 工作台 | `$body-bg-color` | — | 含 header + 侧边栏 + 内容区 | — |

### 色值变量体系

| 变量 | 作用 | Light-UI 默认 | Dark-UI(企业) |
|------|------|--------------|--------------|
| `$primary-color` | 主题色 | `#2C615C` | `#226F3B` |
| `$header-font-color` | 页眉文字色 | `#333` | `#CCFEEB` |
| `$portal-header-complex-bg-extend-color` | 页眉延展色 | `#FBFCF2` | `#154726` |
| `$sidebar-panel-bg` | 侧边栏背景 | — | `#CCFEEB` |
| `$body-bg-color` | 页面背景 | `#F8F8F8` | `#F8F8F8` |
| 渐变组件色 | 左右渐变 | `#fdfff5 → #f7f3cd` | `#154726 → transparent` |

### 系统架构

```
┌──────────────────────────────────────────────────────┐
│                   Theme Studio (Web)                  │
│  ┌─────────────────┬───────────────────────────────┐ │
│  │   对话面板       │      效果预览区               │ │
│  │   (Chat UI)     │   ┌─────────┐ ┌──────────┐   │ │
│  │                 │   │ 登录页   │ │  主页     │   │ │
│  │  用户消息 ──→   │   │         │ │          │   │ │
│  │  AI 回复 ←──    │   │ 实时渲染│ │ 实时渲染  │   │ │
│  │                 │   └─────────┘ └──────────┘   │ │
│  └─────────────────┴───────────────────────────────┘ │
│                                                       │
│  控制层:                                              │
│  ├── Tool Executor (解析 AI 输出的 JSON 动作指令)     │
│  ├── Color Engine (色值计算 + CSS 变量注入)           │
│  ├── Screenshot Service (Playwright 截图)             │
│  └── Build Service (调用 theme_builder.py)            │
└──────────────────────────────────────────────────────┘
                         │
                    LiteLLM Proxy
                    (统一 AI 网关)
                         │
              ┌──────────┼──────────┐
              │          │          │
          OpenAI     Claude    用户自定义
```

### Tool Calling 接口定义

AI 通过 Tool Calling 输出结构化指令，前端执行：

| Tool | 输入 | 动作 | 输出 |
|------|------|------|------|
| `update_colors` | 色值 JSON | 更新 CSS 变量 → 刷新预览 | 预览实时更新 |
| `analyze_image` | 图片 URL/文件 | AI 视觉分析 → 提取色调/风格/氛围 | 色值建议 JSON |
| `parse_pen` | .pen 文件内容 | 解析 JSON → 提取色值变量 → 还原到预览 | 色值 JSON |
| `generate_background` | prompt | 调 MiniMax API 生成背景图 | 背景图 URL |
| `upload_background` | 图片文件 | 用户上传背景图 | 背景图 URL |
| `screenshot` | 组件名列表 | Playwright 截图精确尺寸 | PNG/JPG 文件路径 |
| `build` | 配置 YAML | 调 theme_builder.py | 15 个 zip 路径 |
| `verify` | zip 目录 | 调 verify-build.py | 验证报告 |
| `save_colors` | 色值 JSON | 写入 colors/{nameEn}.json | 文件路径 |
| `load_colors` | nameEn | 读取历史配色方案 | 色值 JSON |

---

## 五、分期计划

### Phase 1：预览 + 对话 MVP — 预计 2 周

**目标**：跑通完整链路 — 对话开启主题 → AI 生成配色 → HTML 实时预览 → 截图打包

**布局**：
```
┌──────────────────────────────────────────────────────┐
│  左侧：对话面板 (40%)    │  右侧：预览区 (60%)       │
│  ─────────────────       │  ┌──────┐ ┌──────┐        │
│  用户: 国庆节喜庆主题     │  │登录页│ │ 主页 │        │
│  AI: 已生成配色方案...    │  │      │ │      │        │
│  用户: 主题色调亮一点     │  │ 预览 │ │ 预览 │        │
│  AI: 已调整 ✅           │  │      │ │      │        │
│  ─────────────────       │  └──────┘ └──────┘        │
│  [📎 上传图片/pen] [发送] │  色值面板(折叠)│质检│打包  │
└──────────────────────────────────────────────────────┘
```

**交付物**：

*对话与 AI：*
- [ ] Chat 面板 UI（消息列表 + 输入框 + 图片/文件上传按钮）
- [ ] LiteLLM Gateway 集成（用户配置 API Key / 选择模型）
- [ ] SKILL.md 改造为 System Prompt（替换 Pencil 操作为 HTML 操作）
- [ ] Tool Calling 执行器（AI 输出 JSON → 前端执行动作）
- [ ] rules/*.md + colors/*.json 上下文注入
- [ ] 多模态输入：支持文字描述、上传图片（AI 视觉分析）、上传 .pen 文件（解析 JSON）
- [ ] 对话修改色值："把主题色调亮一点" → AI 调整相关色值

*预览渲染：*
- [ ] 模板预设结构定义（dark-ui / light-ui 两个预设 JSON）**[优化3]**
- [ ] 登录页 HTML 渲染（还原 .pen 图层结构）
- [ ] 主页 HTML 渲染（header + 侧边栏 + 内容区）
- [ ] 色值编辑面板（折叠式，手动精调单个色值，实时刷新）
- [ ] 背景图上传/切换

*截图与打包：*
- [ ] Playwright 截图导出（精确尺寸 PNG/JPG）
- [ ] 一键打包（截图 → theme_builder.py → 15 zip → verify）
- [ ] 验证：输出包与当前 Pencil 方案完全一致

**Tool Calling 接口**：
| Tool | 输入 | 动作 |
|------|------|------|
| `update_colors` | 色值 JSON | 更新 CSS 变量 → 刷新预览 |
| `analyze_image` | 图片 URL/文件 | AI 视觉分析 → 提取色调/风格 |
| `parse_pen` | .pen 文件内容 | 解析 JSON → 提取色值变量 → 还原到预览 |
| `generate_background` | prompt | 调 MiniMax API 生成背景图 |
| `upload_background` | 图片文件 | 用户上传背景图 |
| `screenshot` | 组件名列表 | Playwright 截图精确尺寸 |
| `build` | 配置 YAML | 调 theme_builder.py |
| `verify` | zip 目录 | 调 verify-build.py |

**验收标准**：
1. 新建主题只能通过对话入口发起（没有"手动创建"按钮）
2. 用户说"做一个 XX 主题"→ AI 生成配色方案 → 预览自动渲染
3. 用户说"主题色调亮一点"→ AI 调整 → 预览实时更新
4. 用户上传图片 → AI 视觉分析 → 基于图片生成配色方案
5. 用户上传 .pen 文件 → AI 解析 → 还原主题到预览
6. 色值面板可手动精调，改值后预览即时刷新
7. HTML 预览效果与 .pen 文件截图视觉一致
8. 打包后的 15 个 zip 全部通过 verify-build.py 验证
9. dark-ui 和 light-ui 两个预设可切换

---

### Phase 2：预览增强 — 预计 3-5 天

**目标**：在 MVP 基础上加入智能配色和质检能力

**交付物**：
- [ ] **[优化1] 对比模式**：预览区支持左右分屏，右侧可加载 colors/*.json 历史方案作为参考
- [ ] **[优化2] 智能配色建议**：
  - 背景图推导模式：上传图片 → 提取主色调 → 自动计算全套色值
  - 品牌色推导模式：输入一个 #hex → 按色调偏移规则计算全套
  - 显示推导过程（Primary=品牌色, Hover=H+26°…）
- [ ] **[优化4] 质检预览（基础）**：实时对比度检查、亮度排序检查、sidebar-panel-bg=header-font 检查
- [ ] 质检结果在预览区底部实时显示

**验收标准**：
1. 上传背景图后能自动提取主色并生成全套配色方案
2. 输入品牌色后能一键生成符合规则的配色方案
3. 对比模式能加载任意 colors/*.json 并实时渲染
4. 色值不合规时（如 sidebar-panel-bg ≠ header-font）有醒目提示

---

### Phase 3：项目管理 + 记忆 — 预计 1-2 周

**目标**：对话历史即项目，可回溯、可复用，积累用户偏好

**交付物**：
- [ ] 项目列表侧边栏（每个对话历史 = 一个项目）
- [ ] 项目状态管理（草稿 / 已打包 / 已归档）
- [ ] 项目记忆（对话历史 + 配色方案 + 修改记录）
- [ ] 跨项目记忆（用户偏好 learnings）
- [ ] 历史配色方案检索（从 colors/*.json 中推荐）
- [ ] 项目克隆/复用
- [ ] 项目导出（对话记录 + 配色 JSON + 素材包 + zip）
- [ ] **[优化5] 设计规格书导出**：自动生成 Markdown 格式的设计规格文档（配色方案、推导过程、质检结果）

**数据模型**：
```
Project {
  id: string
  name: string
  nameEn: string
  templateType: "light-ui" | "dark-ui"
  status: "draft" | "built" | "archived"
  colors: ColorScheme          // 当前配色方案
  messages: Message[]          // 对话历史
  learnings: string[]          // 本项目经验
  attachments: Attachment[]    // 用户上传的图片/pen文件
  output: {                    // 打包输出
    assetsPath: string
    packagesPath: string
    verified: boolean
  }
  createdAt: datetime
  updatedAt: datetime
}

Message {
  role: "user" | "assistant"
  content: string
  timestamp: datetime
  toolCalls?: ToolCall[]       // AI 发出的工具调用
  attachments?: Attachment[]   // 用户上传的文件
}

Attachment {
  type: "image" | "pen" | "other"
  name: string
  url: string                  // 本地文件路径
}

GlobalLearnings {
  userPreferences: string[]    // 用户偏好
  commonPitfalls: string[]     // 常见踩坑
  colorTrends: string[]        // 配色趋势
}
```

**验收标准**：
1. 可以从历史项目快速克隆配色方案
2. 跨项目记忆在新建项目时自动注入上下文
3. 项目列表支持搜索和筛选

---

### Phase 4：Agent 增强 + 生产化 — 预计 2-3 周

**目标**：Agent 自主完成更多步骤，减少人工干预

**交付物**：
- [ ] Agent 自动生成背景图（调 MiniMax API）
- [ ] Agent 自动计算最优配色（从背景图色调推导）
- [ ] Agent 自动执行打包 + 验证（端到端自动化）
- [ ] 批量主题生成（一次生成多个主题）
- [ ] 配色方案库管理（收藏/评分/推荐）
- [ ] 用户权限和 API 用量统计
- [ ] 错误恢复（Agent 自动诊断打包失败原因并修复）
- [ ] **[优化4] 质检预览（完整版）**：WCAG AA 对比度、色调协调性、自动修复建议

**验收标准**：
1. 从"用户描述"到"15 个 zip 全部验证通过"端到端无人工干预
2. 批量生成 10 个主题全部通过验证
3. 打包失败时 Agent 能自动诊断并修复

---

## 六、技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 前端框架 | Vite + TypeScript | 项目已有，快速构建 |
| UI 组件 | shadcn/ui | 可定制、TypeScript 原生支持 |
| 预览渲染 | 原生 HTML/CSS | 保持精确控制，不依赖框架渲染 |
| 截图 | Playwright | 已在依赖中，精确控制视口尺寸 |
| AI 网关 | LiteLLM Proxy | 自托管、100+ provider、BYOK |
| LLM | 用户自选 | 通过 LiteLLM 统一接口 |
| 打包 | theme_builder.py | 已有，不需要改动 |
| 验证 | verify-build.py | 已有，不需要改动 |
| 存储 | SQLite / JSON | 本地优先，轻量 |
| 图片生成 | MiniMax API | 已有，通过 .env 配置 |

---

## 七、风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| HTML 渲染与 Pencil 输出有视觉差异 | 中 | Phase 1 重点验证，逐像素对比截图 |
| LLM 色值计算不符合规则 | 中 | System Prompt 注入完整 rules + 前端校验层 |
| Playwright 截图质量不稳定 | 低 | 固定 viewport、禁用动画、设定 scale |
| LiteLLM 部署增加复杂度 | 低 | Docker 一键部署，或先直连 OpenAI 后期再接 |
| 用户对 AI 生成结果不满意 | 中 | 保留手动调色能力，AI 只是辅助 |

---

## 八、产品优化特性

> 以下特性在基础 4 期计划之上，按优先级逐步纳入。

### 特性 1：对比模式

**问题**：用户做完主题后发现效果不对，但不知道哪里不对。

**方案**：预览区支持左右分屏对比：

```
┌────────────────────────────────────────────┐
│  [当前主题]          │  [参考主题]           │
│  ┌──────────────┐   │  ┌──────────────┐    │
│  │ 新主题预览    │   │  │ 历史方案预览  │    │
│  │              │   │  │              │    │
│  └──────────────┘   │  └──────────────┘    │
│                     │  ▼ 选择参考：         │
│                     │  ○ 申能企业           │
│                     │  ○ 国庆节             │
│                     │  ○ 清明节             │
│                     │  ○ 从 colors/ 加载...  │
└────────────────────────────────────────────┘
```

**数据源**：`colors/` 下 36 个已验证的 JSON 配色方案，可一键加载到参考侧。

**纳入阶段**：Phase 1（作为预览区的一个 tab）

---

### 特性 2：品牌色智能推导

**问题**：当前流程是"背景图 → 提取主色 → 计算全套色值"。但很多企业有自己的品牌色（VI），不需要从图片提取。

**方案**：支持两种配色起点：

| 模式 | 输入 | 计算逻辑 |
|------|------|---------|
| **背景图推导**（现有） | AI 生成/上传的图片 | 提取主色调 H → 全套色值 |
| **品牌色推导**（新增） | 用户输入一个 #hex 色值 | 直接以此为基础，按色调偏移规则计算全套 |

品牌色推导公式（与现有 SKILL 规则一致）：

```
用户输入品牌色 #hex
  → 提取 HSL(H, S, L)
  → Primary = 品牌色
  → Primary-hover = H + 26°（L≈85%）
  → Header-font = H + 22°（L≈90%）
  → Alter-color = darken(primary, 15-20%)
  → Alter-color-hover-on = darken(primaryHover, 15%)
  → Sidebar-panel-bg = header-font
  → 显示推导过程，让用户理解每个色值的来源
```

**UI 交互**：

```
配色起点：
  ○ 从背景图提取（生成/上传背景图后自动提取）
  ○ 从品牌色推导（输入一个色值 → 自动计算全套）
       [#226F3B] [选择颜色]
       → 点击"应用" → 全套色值自动填入 + 预览刷新
```

**纳入阶段**：Phase 1（色值编辑面板的一个输入模式）

---

### 特性 3：模板预设库

**问题**：Dark-UI 和 Light-UI 的差异是硬编码在流程里的。未来新增 UI 版本时需要改代码。

**方案**：把不同 UI 风格抽象为"模板预设"：

```typescript
interface TemplatePreset {
  id: string;                    // "dark-ui" | "light-ui" | "future-ui"
  name: string;                  // "深色主题" | "浅色主题"
  
  // 渐变组件
  gradientStart: string;         // "#fdfff5" (light) | "#154726" (dark)
  gradientMid: string;           // "#f7f3cd" (light) | transparent (dark)
  
  // 各 header 的背景图 opacity
  headerOpacities: {
    default: number;             // 1.0 (light) | 1.0 (dark)
    classic: number;             // 0.5 (light) | 0.5 (dark)
    banner: number;              // 0.6 (light) | 0.6 (dark)
    sidebar: number;             // 1.0 (light) | 1.0 (dark)
  };
  
  // 渐变宽度
  gradientWidths: {
    leftSmall: number;           // 859
    rightSmall: number;          // 920
    leftLarge: number;           // 1145
    rightLarge: number;          // 1226
  };
  
  // 色值默认值
  defaults: Record<string, string>;
}
```

**效果**：新增 UI 版本 = 新增一个预设 JSON，不改代码。

**预设存储位置**：`web/presets/*.json`

**纳入阶段**：Phase 1（定义预设结构，至少包含 dark-ui 和 light-ui 两个预设）

---

### 特性 4：打包前质检预览

**问题**：当前 `verify-build.py` 是打包后才验证。如果色值有问题，要重新打包才能发现。

**方案**：在预览阶段实时做轻量质检，打包前就能发现问题：

| 检查项 | 规则 | 时机 |
|--------|------|------|
| 对比度检查 | WCAG AA 标准（文字与背景对比度 ≥ 4.5:1） | 色值变化时实时检查 |
| 色调协调性 | 背景图主色调与主题色偏差 < 30° | 背景图加载时 |
| 亮度排序 | alter < primary < hover < font | 色值变化时实时检查 |
| sidebar-panel-bg = header-font | 必须相等 | 色值变化时实时检查 |
| 必填色值完整 | 所有变量都有值 | 打包前 |

**UI 展示**：

```
┌─ 质检报告 ──────────────────────┐
│ ✅ 对比度达标 (7.2:1)           │
│ ✅ 色调协调 (偏差 12°)          │
│ ✅ 亮度排序正确                  │
│ ✅ sidebar-panel-bg = header-font│
│ ⚠️ 建议调亮 header-font-color    │
│    当前与背景对比度仅 3.8:1      │
│    建议值: #D8FFE8 (预估 5.1:1) │
└────────────────────────────────┘
```

**实现**：纯前端计算，不需要后端。对比度公式用 WCAG 2.0 标准算法。

**纳入阶段**：Phase 1（基础检查）+ Phase 4（完整质检 + 自动修复建议）

---

### 特性 5：设计规格书导出

**问题**：企业客户需要文档存档和交接，当前只有 zip 包没有文档。

**方案**：每个主题打包后，自动生成一份设计规格文档：

```markdown
# {主题名} 设计规格书

## 基本信息
- 模板类型: Dark-UI / Light-UI
- 配色起点: 品牌色推导 / 背景图提取
- 生成时间: 2026-04-10 14:30
- 验证状态: 15/15 通过

## 配色方案
| 变量 | 色值 | 用途 |
|------|------|------|
| Primary | #226F3B | 主题色 |
| Primary-hover | #B2FFE6 | 悬停色 (H+26°) |
| Header-font | #CCFEEB | 页眉文字 (H+22°) |
| ... | ... | ... |

## 配色推导过程
背景图主色调: H=135° (深绿)
→ Primary = #226F3B (H=135°)
→ Primary-hover = #B2FFE6 (H=161°, +26°, L=85%)
→ Header-font = #CCFEEB (H=157°, +22°, L=90%)
→ Alter = #1A5530 (darken primary 15%)

## 打包输出
- 15 个主题包全部通过验证
- 输出目录: output/20260410-{nameEn}/输出包/

## 质检结果
✅ 所有检查项通过
```

**输出格式**：Markdown 文件（可转 PDF/Word）

**纳入阶段**：Phase 3（项目导出功能的一部分）

---

## 九、已有资产清单

```
可直接复用：
├── theme_builder.py          # 打包脚本（965行，完整可用）
├── scripts/verify-build.py   # 验证脚本
├── scripts/update-pen-theme.py # 色值更新（改造为 HTML 版）
├── SKILL.md                  # 4阶段流程 SOP（571行）
├── rules/                    # 色值规则 + 切图规则 + 图片生成规则
├── colors/*.json             # 36个已验证配色方案
├── .sisyphus/notepads/       # 项目经验记录
└── assets/references/samples/主题样例包/  # 15个模板zip

需要新建：
├── src/preview/              # HTML 预览渲染
├── src/chat/                 # 对话面板 UI
├── src/tools/                # Tool Calling 执行器
├── src/memory/               # 记忆管理
└── src/builder/              # 截图 + 打包服务
```

---

## 十、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v2.0 | 2026-04-10 | **重大重构**：对话提升为 MVP 核心入口（不再是 Phase 2 才有），Phase 1=预览+对话一体，新增多模态输入（图片/pen），Phase 合并为 4 期 |
| v1.2 | 2026-04-10 | Phase 1 拆分为 1a（核心 MVP）+ 1b（预览增强），优化特性合理分配到各阶段 |
| v1.1 | 2026-04-10 | 新增第八章：产品优化特性（对比模式、品牌色推导、模板预设、质检预览、设计规格书） |
| v1.0 | 2026-04-10 | 初始版本：产品定义 + 4阶段计划 + 技术架构 |
