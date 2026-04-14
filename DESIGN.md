# Theme Studio — 设计系统文档

> **版本**: v2.0 | **更新日期**: 2026-04-14
> **本文档是 Theme Studio Web 应用的视觉设计规范，所有 UI 开发以此为准。**
> **Web 应用使用原生 HTML + CSS + TypeScript，预览通过 CSS 变量实时驱动。**

---

## 一、设计语言

### 产品定位

Theme Studio 是一个 **AI 驱动的 OA 主题设计工具**。视觉上传达"专业设计工具 + AI 智能助手"的双重气质。

### 设计关键词

- **克制**：企业级工具，不过度装饰，信息密度优先
- **清晰**：层次分明，重要操作一目了然
- **响应式**：所有操作即时反馈，流式输出、实时预览

### 设计原则（选择性采纳 x.ai）

基于 x.ai 视觉规范的选择性采纳策略：

| 原则 | 采纳 | 具体实现 |
|------|------|---------|
| 暖化 dark 背景 | ✅ | `#111318` 而非纯黑 `#000000` |
| Surface 分层体系 | ✅ | 5 级 surface（bg → surface-0~3） |
| 零阴影 | ✅ | shell 元素一律 `box-shadow: none` |
| 无装饰 | ✅ | 无渐变按钮、无大面积动效 |
| 边框策略 | ✅ | subtle(0.10) / strong(0.18) 两级 |
| 颜色层级 | ✅ | 4 级文字（primary → secondary → muted → tertiary） |
| 0px 圆角 | ❌ | 保留 6-16px 圆角体系 |
| 等宽字体 | ❌ | 使用系统字体栈 |
| 大写按钮 | ❌ | 保持正常大小写 |
| hover 变暗 | ❌ | hover 只能变亮，不能变暗 |

### 不做什么

- 不使用渐变按钮、大面积动效等消费级 UI 手法
- 不使用 emoji 作为 UI 图标（对话消息中的 emoji 头像除外）
- Tailwind CSS v4 仅用于设计令牌映射（`tailwind.css`），不用于组件样式
- 不在 `:root` / light-theme 变量块之外硬编码任何颜色值（`rgba(...)` / `#xxxxxx`）
- 不用 `opacity` 降低来实现 hover 效果（只能变亮）
- shell 元素不使用 `box-shadow`

---

## 二、布局系统

### 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  左侧对话面板 (可拖动)     │  右侧预览区 (自适应填满)     │
│  ┌─────────────────┐ ║    │  ┌─────────┬─────────┐        │
│  │ Chat Header     │ ║    │  │登录页Tab│主页Tab  │        │
│  ├─────────────────┤ ║    │  ├─────────┴─────────┤        │
│  │                 │ ║    │  │                   │        │
│  │  Messages       │ ║    │  │   预览内容        │        │
│  │  (scrollable)   │ ║    │  │   (cover 填满)    │        │
│  │                 │ ║    │  │                   │        │
│  ├─────────────────┤ ║    │  ├───────────────────┤        │
│  │ Input Area      │ ║    │  │ 色值面板(折叠)    │        │
│  └─────────────────┘ ║    │  └───────────────────┘        │
└──────────────────────────────────────────────────────────┘
         ↑ 拖动分隔条可调整宽度，默认 320px
```

### 关键尺寸

| 元素 | 宽度 | 高度 | 备注 |
|------|------|------|------|
| 对话面板 | 320px（可拖动，260~50%） | 100vh | 拖动分隔条调整 |
| 预览面板 | 剩余空间 | 100vh | flex: 1, min-width: 400px |
| 预览渲染 | 自适应缩放（cover 模式） | — | Math.max(scaleX, scaleY) 完全填满 |
| 登录页原始尺寸 | 2215×1080 | — | HTML 模板 |
| 主页原始尺寸 | 1920×1079 | — | HTML 模板 |

---

## 三、色彩系统

### 品牌色

品牌色即当前主题的 `--primary-color`，随主题切换而变化。UI 固定元素使用以下独立色值：

| 用途 | 色值 | 说明 |
|------|------|------|
| 品牌色（默认） | `#2C615C` | CSS 变量 `--primary-color` |
| 品牌色深 | `#144E48` | CSS 变量 `--alter-color` |
| 品牌色浅 | `#B2FFE6` | CSS 变量 `--primary-color-hover` |

### Shell UI 色彩体系（CSS 变量驱动）

工作台外壳（sidebar、chat、topbar、modal）使用独立的 shell token 体系，与右侧 OA 预览主题完全隔离：

```css
/* Dark 模式（默认） */
:root {
  --app-bg: #111318;          /* 暖化近黑背景 */
  --surface-0: #161920;       /* 主面板背景（sidebar、chat、modal） */
  --surface-1: #1a1d25;       /* 次级背景（输入框、卡片） */
  --surface-2: #1f2228;       /* 三级背景（按钮组、菜单） */
  --surface-3: #252830;       /* 四级背景（hover 强调） */
  --text-primary: #F5F5F5;    /* 主文字 */
  --text-secondary: rgba(255,255,255,0.68);  /* 次要文字 */
  --text-muted: rgba(255,255,255,0.42);      /* 辅助文字 */
  --text-tertiary: rgba(255,255,255,0.28);   /* 占位/标签 */
  --border-subtle: rgba(255,255,255,0.10);   /* 轻边框 */
  --border-strong: rgba(255,255,255,0.18);   /* 强边框/hover */
  --accent-ui: #EDEDED;       /* 强调色（按钮背景） */
  --accent-ui-soft: rgba(255,255,255,0.12);  /* 柔和强调（hover 背景） */
  --surface-hover: rgba(255,255,255,0.06);   /* hover 微背景 */
  --surface-msg: rgba(255,255,255,0.03);     /* 消息微背景 */
  --surface-btn: rgba(255,255,255,0.04);     /* 按钮微背景 */
  --border-accent: rgba(255,255,255,0.40);   /* 按钮边框 */
}

/* Light 模式 */
body[data-ui-theme="light"] {
  --app-bg: #F5F5F5;
  --surface-0: #FFFFFF;
  --surface-1: #F7F7F7;
  --surface-2: #EFEFEF;
  --surface-3: #E7E7E7;
  --text-primary: #111111;
  --text-secondary: rgba(17,17,17,0.72);
  --text-muted: rgba(17,17,17,0.5);
  --text-tertiary: rgba(17,17,17,0.34);
  --border-subtle: rgba(17,17,17,0.10);
  --border-strong: rgba(17,17,17,0.18);
  --accent-ui: #111111;
  --accent-ui-soft: rgba(17,17,17,0.06);
  --surface-hover: rgba(17,17,17,0.06);
  --surface-msg: rgba(17,17,17,0.03);
  --surface-btn: rgba(17,17,17,0.04);
  --border-accent: rgba(17,17,17,0.30);
}
```

**核心规则**：
- Light Mode 只影响 Theme Studio 工作台外壳，**不影响右侧 OA 预览主题**
- 所有颜色必须通过 CSS 变量引用，禁止在 `:root`/light-theme 块之外硬编码
- 如需新色值，先在 `:root` + `body[data-ui-theme="light"]` 中定义新 token

### 主题色值体系（20 个变量）

这是 OA 主题渲染用的完整色值体系，所有预览区颜色由这 21 个 CSS 变量驱动：

```css
:root {
  --primary-color: #2C615C;
  --primary-color-hover: #B2FFE6;
  --alter-color: #144E48;
  --alter-color-hover-on: #73CAA6;
  --primary-color-opacity-10: #E9F1EB;
  --primary-color-opacity-20: #D3E2D8;
  --primary-color-opacity-30: #BDD4C4;
  --header-font-color: #333333;
  --auxiliary-gray: #999999;
  --auxiliary-gray-dark: #666666;
  --body-bg-color: #F8F8F8;
  --portal-header-bg-extend-color: #FBFCF2;
  --portal-header-complex-bg-extend-color: #FBFCF2;
  --login-bg-color: #144E48;
  --sidebar-panel-bg: #B8A9D9;
  --sidebar-color: #333333;
  --sidebar-icon-color: #9B8FC7;
  --border-color: #E5E7EB;
  --border-icon-color: #E5E7EB;
  --gradient-start: #fdfff5;
  --gradient-mid: #f7f3cd;
}
```

### 两套配色规则

| 规则 | 适用场景 | 文档 |
|------|---------|------|
| Light-UI | 浅色主题（默认） | `rules/light-ui-color-rules.md` |
| Dark-UI | 深色主题 | `rules/dark-ui-color-rules.md` |

**核心区别**：

| 维度 | Light-UI | Dark-UI |
|------|---------|---------|
| header-font-color | 深色 (#333) | 浅色 (primary +22°) |
| primary-hover | 中浅色 | 极浅色（亮度≈216） |
| sidebar-panel-bg | 独立值 | = header-font-color |
| 登录背景 | 浅色 | 深色 |
| 边框 | 纯灰 | 纯灰 |
| 渐变组件 | #fdfff5 → #f7f3cd | themeDeepColor → transparent |

---

## 四、排版

### 字体

```css
font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

不引入任何 Web 字体，使用系统字体栈。

### Shell 字号层级（CSS 变量驱动）

| Token | 大小 | 用途 |
|-------|------|------|
| `--font-size-display` | 28px | 欢迎页标题 |
| `--font-size-title` | 16px | 面板标题、按钮文字 |
| `--font-size-body` | 14px | 正文、消息内容、表单、sidebar 项目 |
| `--font-size-meta` | 12px | 辅助说明、时间戳 |
| `--font-size-micro` | 11px | 标签、副标题 |

### 字重

| 用途 | 字重 |
|------|------|
| 标题 | 600 (Semi-bold) |
| 正文 | 400 (Regular) |
| 强调/按钮 | 700 (Bold) |

---

## 五、间距

### 基础单位

基础间距单位 = **4px**。所有间距为 4px 的倍数。

### 常用间距

| 场景 | 间距 |
|------|------|
| 面板内边距 | 16px |
| 元素间距（gap） | 8px / 12px / 16px |
| 消息间距 | 12px |
| 输入框内边距 | 10px 12px |
| 按钮内边距 | 8px 16px |
| 页面区块间距 | 20px |

---

## 六、组件规范

### 6.1 Shell 组件通用规则

- **圆角体系**：6px（紧凑）/ 8px（标准）/ 10px（按钮）/ 12-16px（卡片/modal）
- **阴影**：一律 `box-shadow: none`
- **hover**：只能变亮（更亮背景或更亮文字色），不能变暗（不用 `opacity` 降低）
- **分隔线**：chat-header 底部和 input-area 顶部使用 8px 渐变消融（`var(--surface-0)` → `transparent`），不用硬线

### 6.2 对话面板

#### Chat Header

- 高度：70px
- 内边距：14px 18px
- 底部分隔：8px 渐变消融（`::after` pseudo-element），无硬线
- 背景：`var(--surface-0)` + `backdrop-filter: blur(16px)`

#### 消息气泡

| 属性 | AI 消息 | 用户消息 |
|------|---------|---------|
| 对齐 | 左对齐 | 右对齐 |
| 背景 | `var(--accent-ui-soft)` | `var(--border-strong)` |
| 边框 | `1px solid var(--border-subtle)` | `1px solid var(--border-subtle)` |
| 圆角 | 12px | 12px |
| 内边距 | 12px 14px | 12px 14px |
| 字色 | `var(--text-primary)` | `var(--text-primary)` |

#### 头像

| 属性 | 值 |
|------|-----|
| 尺寸 | 28×28px |
| 圆角 | 6px |
| 背景 | `var(--surface-2)` |
| 边框 | `1px solid var(--border-subtle)` |

#### 输入框

| 属性 | 值 |
|------|-----|
| 内边距 | 14px 52px 14px 16px |
| 边框 | `1px solid var(--border-subtle)` |
| 圆角 | 14px |
| 背景 | `var(--surface-1)` |
| focus 边框 | `var(--border-strong)` |
| 最小高度 | 52px |

#### 发送按钮

| 属性 | 值 |
|------|-----|
| 尺寸 | 46×46px |
| 圆角 | 12px |
| 背景 | `var(--accent-ui)` |
| 文字色 | `var(--app-bg)` |
| 边框 | `1px solid var(--border-strong)` |
| hover | `background: var(--text-primary)` |

#### 输入区域（.input-area）

- 顶部：8px 渐变消融（`::before` pseudo-element），无硬线
- 背景：transparent
- 内边距：18px 20px 24px

### 6.3 侧边栏

#### 项目列表

- 滚动条：4px 宽，`var(--accent-ui-soft)` 色，hover `var(--border-strong)`
- 列表右侧 padding：4px（与滚动条间距）

#### 项目项（.sidebar-project-item）

| 属性 | 值 |
|------|-----|
| 圆角 | 6px |
| 字色 | `var(--text-secondary)` |
| hover 背景 | `var(--accent-ui-soft)` |
| active 背景 | `var(--border-strong)` |
| active 字色 | `var(--text-primary)` |

#### 设置按钮（#sidebarSettingsBtn）

- hover：仅变色（`var(--text-primary)`），**无底色**

### 6.4 Topbar

#### Tab 切换（胶囊控件）

- 外框：`var(--surface-2)` 背景，7px 圆角，35px 高
- 滑块（tab-indicator）：`var(--surface-3)` 背景 + `1px solid var(--border-subtle)`，5px 圆角
- 按钮：transparent 背景，10px 宽，10px 字号
- 激活态字色：`var(--text-primary)`
- 未激活态字色：dark `var(--text-secondary)` / light `var(--text-muted)`

#### 操作按钮（topbar-action-btn）

- 背景：`var(--accent-ui-soft)`
- 边框：`1px solid var(--border-subtle)`
- 圆角：10px
- hover：`background: var(--border-strong)` + `color: var(--text-primary)`

### 6.5 设置弹窗

| 属性 | 值 |
|------|-----|
| 宽度 | auto（section 卡片布局） |
| 圆角 | 20px |
| 遮罩 | `rgba(0,0,0,0.72)` + `backdrop-filter: blur(10px)` |
| 背景 | `var(--surface-0)` |
| 边框 | `1px solid var(--border-subtle)` |
| 内部卡片 | `var(--surface-1)` 背景，16px 圆角 |

### 6.6 打包弹窗

| 属性 | 值 |
|------|-----|
| 圆角 | 16px |
| 背景 | `var(--surface-0)` |
| 边框 | `1px solid var(--border-subtle)` |
| 产品选项 | 10px 圆角，hover `var(--accent-ui-soft)` |
| 开始打包按钮 | `var(--accent-ui)` 背景，hover `var(--text-primary)` |

### 6.7 Toast

- 圆角：8px
- 背景：`var(--surface-1)`
- 边框：`1px solid var(--border-subtle)`
- `backdrop-filter: blur(20px)`
- `box-shadow: none`

---

## 七、Header 渲染公式

OA 主题的核心视觉元素。所有 header 都遵循相同的图层叠加公式：

```
header = {
  第1层（底）: 纯色背景
    - 默认/简洁页眉: var(--portal-header-bg-extend-color)
    - 复杂页眉: var(--portal-header-complex-bg-extend-color)
    - 菜单页眉: var(--portal-header-complex-bg-extend-color)
    - 横幅页眉: var(--portal-header-complex-bg-extend-color)

  第2层: 背景图（可选）
    - AI 生成的图片或纯色
    - opacity: 0.5 | 0.6 | 1.0（根据 header 类型）
    - clip 到 header 区域

  第3层: 左渐变叠加
    - 方向: 从左到右
    - 颜色: var(--gradient-start) → var(--gradient-mid) → transparent
    - 宽度: 859px（小 header）| 1145px（大 header）

  第4层: 右渐变叠加
    - 方向: 从右到左
    - 颜色: var(--gradient-start) → var(--gradient-mid) → transparent
    - 宽度: 920px（小 header）| 1226px（大 header）

  第5层（顶）: 内容（logo、导航、图标）
    - z-index: 2
}
```

### 各 Header 变体尺寸

| 变体 | CSS class | 宽度 | 高度 | 用途 |
|------|-----------|------|------|------|
| 默认页眉 | `.header-default` | 1920px | 60px | header_tlayout_frame_bg.png |
| 复杂页眉 | `.header-complex` | 1920px | 90px | header_complex_frame_bg.png |
| 菜单页眉 | `.header-menu` | 1920px | 130px | header_menu_frame_bg.png |
| 横幅页眉 | `.header-banner` | 2560px | 480px | header-banner.png |
| 侧边页眉 | `.sidebar-panel` | 200px | 900px | header-sideheader.png |
| 完整桌面 | `#main-preview` | 1920px | 1079px | desktop.png |
| 登录页 | `#loginPage` | 2215px | 1080px | bg-login.jpg |

---

## 八、截图输出规格

Playwright 截图必须输出的图片清单：

### 主图（8 张）

| 文件名 | 尺寸 | 格式 | 来源元素 |
|--------|------|------|---------|
| bg-login.jpg | 2215×1080 | JPEG | .template-login |
| login_thumb.jpg | 960×540 | JPEG | bg-login 派生 |
| header_tlayout_frame_bg.png | 1920×60 | PNG | .template-header-default |
| header_complex_frame_bg.png | 1920×90 | PNG | .template-header-complex |
| header_menu_frame_bg.png | 1920×130 | PNG | .template-header-menu |
| header-banner.png | 2560×480 | PNG | .template-header-banner |
| header-sideheader.png | 200×900(light) / 200×488(dark) | PNG | .template-sidebar |
| desktop.png | 1920×1079 | PNG | .desktop-wrapper |

### 派生图（9 张，ImageMagick 生成）

| 文件名 | 来源 | 操作 |
|--------|------|------|
| background.png | bg-login.jpg | 裁剪 1920×1080 居中 |
| login_thumb.jpg | login_thumb.jpg | 缩放 960×540 |
| thumb-1.jpg | bg-login.jpg | 裁剪 800×390 |
| thumb-2.jpg | bg-login.jpg | 裁剪 800×390（偏移 800px） |
| desktop-resized.png | desktop.png | 缩放 1440×800 |
| layout-banner.jpg | desktop.png | 缩放 1600×572 |
| fullscreen-sideheader.jpg | desktop.png | 缩放 1600×572 |
| fullscreen-sidenav.jpg | desktop.png | 缩放 1600×572 |
| center-sidenav.jpg | desktop.png | 缩放 1600×572 |

### 登录页子目录

| 文件名 | 路径 |
|--------|------|
| thumb-1.jpg | login_bg/thumb-1.jpg |
| thumb-2.jpg | login_bg/thumb-2.jpg |

---

## 九、交互规范

### 对话交互

1. 用户输入文字 → 按 Enter 或点击发送 → AI 流式回复
2. AI 回复过程中，消息逐 token 追加显示
3. AI 输出 JSON 格式的 tool call → 前端解析执行 → 显示执行结果
4. 对话历史保存在 localStorage 中（按项目隔离）

### 预览交互

1. 登录页/主页通过 Tab 切换
2. 色值变化 → CSS 变量即时更新 → 预览自动刷新（无延迟）
3. 色值面板可展开/折叠
4. 底部截图/打包按钮

### 截图流程

```
点击"打包" → 校验导出根目录 → 创建导出批次 → 交给本地桥接层 →
Playwright 按模板直接截图（不依赖页面控件切换）→ 生成派生图 →
写入 theme-build-request.yaml → 调 theme_builder.py → 输出 15 zip →
调 verify-build.py
```

### Tool Calling 接口

| Tool | 输入 | 动作 |
|------|------|------|
| generate_theme_pipeline | prompt + templateType | 生图(MiniMax) + 提色(Canvas) + deriveColorsFromPrimary() |
| update_colors | 色值 JSON | 更新 CSS 变量 → 刷新预览 |
| validate_colors | — | WCAG 2.1 对比度校验 |
| save_colors | 色值 + 名称 + templateType | localStorage 持久化 |
| load_colors | 名称 | 从 localStorage 加载 |
| analyze_image | 图片 dataURL | Canvas 色值提取 |

---

## 十、文件结构

```
web/
├── index.html              # 主入口 HTML（三列布局：侧边栏 + 对话 + 预览）
├── desktop-preview.html    # 独立桌面预览页（截图用）
├── login-preview.html      # 独立登录预览页（截图用）
├── src/
│   ├── main.ts             # 精简入口（143行）— 初始化 + showWorkspace
│   ├── project-manager.ts  # 项目 CRUD + localStorage + 侧边栏 + 预设（509行）
│   ├── theme-engine.ts     # CSS 变量管理 + 颜色操作 + QC（192行）
│   ├── chat-manager.ts     # 聊天 UI + AI 调用 + 工具执行（678行）
│   ├── package-manager.ts  # 打包模态框 + 导出任务创建（146行）
│   ├── ui-setup.ts         # DOM 事件 + 设置对话框 + 布局（291行）
│   ├── types.ts            # TypeScript 类型定义
│   ├── styles.css          # 全局样式
│   ├── tailwind.css        # Tailwind v4 设计令牌（21 CSS vars → 语义名）
│   ├── components/
│   │   └── color-editor.ts # 21 色编辑面板
│   ├── agent/
│   │   ├── chat-client.ts  # SSE 流式客户端（Coding Plan + MiniMax）
│   │   ├── system-prompt.ts # 动态 System Prompt
│   │   ├── knowledge-base.ts # 34 预设描述 + 12 行业色板
│   │   └── user-preferences.ts # 跨项目偏好记忆
│   ├── tools/
│   │   ├── executor.ts     # Tool Calling 执行器
│   │   └── contrast-validator.ts # WCAG 对比度校验
│   ├── templates/          # HTML/CSS 模板（28 文件）
│   ├── theme/              # 颜色与模板逻辑
│   ├── packaging/          # 旧浏览器打包参考实现
│   └── export/             # 截图规则 + 导出任务 + 导出路径 + 桥接契约
├── scripts/
│   ├── screenshot.ts       # Playwright 截图脚本
│   ├── build.ts            # 一键构建脚本
│   └── export-bridge.ts    # 本地导出桥接服务
├── presets/                # 预设配色（light-ui.json, dark-ui.json）
├── public/
│   ├── backgrounds/        # 14 张预设背景图
│   └── colors/             # 35 个配色 JSON
├── .env                    # API Keys
├── package.json
├── tsconfig.json
└── vite.config.ts          # Vite + Tailwind v4 + chat/image/export Proxy
```

---

## 十一、AI 配置

### 默认设置

| 配置 | 值 |
|------|-----|
| 聊天 API（dev） | `/api/chat` → Vite proxy → `coding.dashscope.aliyuncs.com` |
| 聊天模型 | `qwen3.6-plus`（DashScope Coding Plan） |
| 图片 API（dev） | `/api/image` → Vite proxy → `api.minimaxi.com`（IP 直连） |
| 图片模型 | `image-01`（MiniMax Token Plan） |
| API Key 来源 | `.env` → `VITE_DASHSCOPE_API_KEY`, `VITE_MINIMAX_API_KEY` |

### 设置存储

- localStorage key: `themeStudioSettings`
- 字段: apiEndpoint, apiKey, model, imageApiEndpoint, imageApiKey, imageModel, exportRoot
- 环境变量 API Key 为默认值，用户设置面板可覆盖
- `migrateEndpoint()` 自动迁移旧的直连端点到 Vite proxy 路径

---

## 十二、技术约束

| 约束 | 说明 |
|------|------|
| 无框架 | 不使用 React/Vue/Angular，纯 HTML + CSS + TypeScript |
| Tailwind v4 仅设计令牌 | 仅用于 `tailwind.css` 中 21 个 CSS vars → 语义名映射，不用于组件样式 |
| 中文 UI | 所有界面文字使用中文 |
| CSS 变量驱动 | 所有颜色通过 :root 变量控制，禁止在变量块外硬编码色值 |
| 零阴影 | shell 元素一律 `box-shadow: none` |
| hover 只变亮 | hover 状态只能变亮（更亮背景/文字），不能通过 opacity 变暗 |
| 渐变分隔 | chat-header 底部和 input-area 顶部使用渐变消融，不用硬线 |
| Light Mode 隔离 | Light Mode 只影响工作台外壳，不影响右侧 OA 预览主题 |
| Playwright 截图 | 打包输出必须通过截图，不能直接导出 DOM |
| 本地导出桥接 | Web 端只创建导出任务，本地桥接负责执行截图与打包 |
| Vite Proxy | 所有 API 调用走 `/api/chat` 和 `/api/image` 代理，避免 CORS |

---

## 十三、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 产品定义 | `PRODUCT.md` | 功能规划、分期计划 |
| 配色规则(Dark) | `rules/dark-ui-color-rules.md` | Dark-UI 色值计算规则 |
| 配色规则(Light) | `rules/light-ui-color-rules.md` | Light-UI 色值计算规则 |
| 切图导出规则 | `rules/export-rules.md` | 截图尺寸、格式、命名规范 |
| 图片生成规则 | `rules/image-generation-rules.md` | AI 背景图生成规则 |
| AI 对话 SOP | `SKILL.md` | Agent 专注创建 + 迭代，导出归产品功能 |
| AI 持久记忆 | `AGENTS.md` | 项目状态、架构、技术债、决策记录 |
| 打包脚本 | `theme_builder.py` | 生成 15 个 zip 包 |
| 验证脚本 | `scripts/verify-build.py` | 验证包结构和色值 |
