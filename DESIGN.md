# Theme Studio — 设计系统文档

> **版本**: v1.2 | **更新日期**: 2026-04-11
> **本文档是 Theme Studio Web 应用的视觉设计规范，所有 UI 开发以此为准。**
> **原生 HTML 模板参照 .pen 设计稿创建，模板页完成后 .pen 文件不再参与流程。**

---

## 一、设计语言

### 产品定位

Theme Studio 是一个 **AI 驱动的 OA 主题设计工具**。视觉上传达"专业设计工具 + AI 智能助手"的双重气质。

### 设计关键词

- **克制**：企业级工具，不过度装饰，信息密度优先
- **清晰**：层次分明，重要操作一目了然
- **响应式**：所有操作即时反馈，流式输出、实时预览

### 不做什么

- 不使用渐变按钮、毛玻璃、大面积动效等消费级 UI 手法
- 不使用 emoji 作为 UI 图标（对话消息中的 emoji 头像除外）
- 不引入任何 CSS 框架或组件库

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
| 登录页原始尺寸 | 2215×1080 | — | .pen 渲染 |
| 主页原始尺寸 | 1920×1079 | — | .pen 渲染 |

---

## 三、色彩系统

### 品牌色

品牌色即当前主题的 `--primary-color`，随主题切换而变化。UI 固定元素使用以下独立色值：

| 用途 | 色值 | 说明 |
|------|------|------|
| 品牌色（默认） | `#2C615C` | CSS 变量 `--primary-color` |
| 品牌色深 | `#144E48` | CSS 变量 `--alter-color` |
| 品牌色浅 | `#B2FFE6` | CSS 变量 `--primary-color-hover` |

### 中性色

| 用途 | 色值 | CSS 变量 |
|------|------|---------|
| 标题文字 | `#333333` | `--header-font-color` |
| 正文辅助 | `#666666` | `--auxiliary-gray-dark` |
| 占位文字 | `#999999` | `--auxiliary-gray` |
| 页面背景 | `#F8F8F8` | `--body-bg-color` |
| 面板背景 | `#FFFFFF` | `--panel-bg-color` |
| 对话区背景 | `#F9FAFB` | `--chat-bg-color` |
| 边框 | `#E5E7EB` | `--border-color` |

### 主题色值体系（20 个变量）

这是 OA 主题渲染用的完整色值体系，所有预览区颜色由这 20 个 CSS 变量驱动：

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

### 字号层级

| 级别 | 大小 | 行高 | 用途 |
|------|------|------|------|
| H1 | 24px | 1.3 | 登录页标题 |
| H2 | 20px | 1.4 | banner 大标题 |
| H3 | 16px | 1.4 | 面板标题、卡片标题 |
| Body | 14px | 1.5 | 正文、消息内容、表单 |
| Caption | 12px | 1.4 | 辅助说明、时间戳、footer |

### 字重

| 用途 | 字重 |
|------|------|
| 标题 | 500 (Medium) |
| 正文 | 400 (Regular) |
| 强调 | 700 (Bold) |

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

### 6.1 对话面板

#### Chat Header

- 高度：auto（约 48px）
- 内边距：12px 16px
- 底部边框：1px solid var(--border-color)
- 背景：var(--panel-bg-color)
- 品牌标识区域：标题 + 副标题

#### 消息气泡

| 属性 | AI 消息 | 用户消息 |
|------|---------|---------|
| 对齐 | 左对齐 | 右对齐 |
| 背景 | var(--message-ai-bg) | 品牌色背景 / var(--message-user-bg) |
| 边框 | 1px solid var(--border-color) | 无 |
| 圆角 | 18px 18px 18px 4px | 18px 4px 18px 18px |
| 内边距 | 10px 12px | 10px 12px |
| 最大宽度 | 80% | 80% |

#### 头像

| 属性 | 值 |
|------|-----|
| 尺寸 | 32×32px |
| 圆角 | 50% |
| 背景 | #E5F0FF |
| 字号 | 16px |

#### 输入框

| 属性 | 值 |
|------|-----|
| 高度 | 40px |
| 内边距 | 10px 12px |
| 边框 | 1px solid var(--border-color) |
| 圆角 | 20px |
| focus 边框 | var(--primary-color) |

#### 发送按钮

| 属性 | 值 |
|------|-----|
| 尺寸 | 40×40px |
| 圆角 | 50% |
| 背景 | var(--primary-color) |
| 文字色 | 白色 |
| 左边距 | 8px |

### 6.2 预览面板

#### Tab 切换

| 状态 | 文字色 | 底边框 |
|------|--------|--------|
| 默认 | var(--auxiliary-gray) | 无 |
| 激活 | var(--primary-color) | 2px solid var(--primary-color) |
| 背景 | 白色 | — |

#### 预览页面

- 渲染尺寸：1920×1079（登录页 2215×1080）
- 显示缩放：transform: scale(0.5)
- 背景：var(--body-bg-color)

#### 底部操作按钮

| 按钮 | 背景 | 文字色 |
|------|------|--------|
| 截图 | var(--primary-color) | 白色 |
| 打包 | var(--alter-color) | 白色 |

### 6.3 色值编辑器（折叠面板）

- 位置：固定在底部，从右下角展开
- 触发按钮：品牌色背景，圆角上半部分
- 展开高度：max-height 60vh
- 每个 color picker = 色块(30×30) + hex 输入框(80px 宽)

### 6.4 设置弹窗

| 属性 | 值 |
|------|-----|
| 宽度 | 400px |
| 圆角 | 8px |
| 遮罩 | rgba(0,0,0,0.5) |
| z-index | 200 |

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
| bg-login.jpg | 2215×1080 | JPEG | #loginPage |
| login_thumb.jpg | 960×540 | JPEG | bg-login 派生 |
| header_tlayout_frame_bg.png | 1920×60 | PNG | .header-default |
| header_complex_frame_bg.png | 1920×90 | PNG | .header-complex |
| header_menu_frame_bg.png | 1920×130 | PNG | .header-menu |
| header-banner.png | 2560×480 | PNG | .header-banner |
| header-sideheader.png | 200×900 | PNG | .sidebar-panel |
| desktop.png | 1920×1079 | PNG | #main-preview |

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
4. 对话历史保存在内存中，刷新页面后清空（后续 Phase 3 做持久化）

### 预览交互

1. 登录页/主页通过 Tab 切换
2. 色值变化 → CSS 变量即时更新 → 预览自动刷新（无延迟）
3. 色值面板可展开/折叠
4. 底部截图/打包按钮

### 截图流程

```
点击"打包" → 检查 dev server → 切换 tab 截取所有元素 → 生成派生图 → 
写入 theme-build-request.yaml → 调 theme_builder.py → 输出 15 zip → 
调 verify-build.py → 打开 Finder
```

### Tool Calling 接口

| Tool | 输入 | 动作 |
|------|------|------|
| update_colors | 色值 JSON | 更新 CSS 变量 → 刷新预览 |
| analyze_image | 图片 URL | Canvas 色值提取 |
| parse_pen | .pen 文件内容 | JSON 解析 → 提取色值 |
| generate_background | prompt | 需要 Node 后端 |
| screenshot | 组件列表 | 需要 Node 后端 |
| build | YAML 配置 | 需要 Node 后端 |
| verify | zip 目录 | 需要 Node 后端 |
| save_colors | 色值 + 名称 | localStorage |
| load_colors | 名称 | localStorage |

---

## 十、文件结构

```
web/
├── index.html              # 主入口 HTML
├── src/
│   ├── styles.css          # 全部样式（CSS 变量 + 组件样式）
│   ├── main.ts             # 应用初始化 + 对话逻辑
│   ├── types.ts            # TypeScript 类型定义
│   ├── preview/
│   │   └── theme-renderer.ts  # 主题渲染（CSS 变量操作）
│   ├── components/
│   │   └── color-editor.ts    # 色值编辑面板
│   ├── agent/
│   │   ├── chat-client.ts     # OpenAI 兼容 API 客户端（SSE 流式）
│   │   └── system-prompt.ts   # AI 对话 System Prompt
│   └── tools/
│       └── executor.ts        # Tool Calling 执行器
├── scripts/
│   ├── screenshot.ts       # Playwright 截图脚本
│   ├── build.ts            # 一键构建脚本
│   ├── run-screenshot.sh   # 截图包装脚本
│   └── run-build.sh        # 构建包装脚本
├── .env                    # API Key（不提交）
├── .env.example            # 示例环境变量
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 十一、AI 配置

### 默认设置

| 配置 | 值 |
|------|-----|
| API 端点 | `https://open.bigmodel.cn/api/paas/v4` |
| 默认模型 | `GLM-4-Flash` |
| API Key 来源 | `.env` 文件 → `VITE_ZHIPU_API_KEY` |
| 备选模型 | `GLM-5.1`（需 API 余额） |

### 设置存储

- localStorage key: `theme-studio-settings`
- 字段: apiEndpoint, apiKey, model
- 环境变量 API Key 为默认值，用户设置面板可覆盖

---

## 十二、技术约束

| 约束 | 说明 |
|------|------|
| 无框架 | 不使用 React/Vue/Angular，纯 HTML + CSS + TypeScript |
| 无 CSS 库 | 不使用 Tailwind/Bootstrap/Ant Design |
| 无 JS 库 | 不使用 jQuery/Lodash/Moment |
| 中文 UI | 所有界面文字使用中文 |
| CSS 变量驱动 | 所有颜色通过 :root 变量控制，不硬编码 |
| Playwright 截图 | 打包输出必须通过截图，不能直接导出 DOM |

---

## 十三、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 产品定义 | `PRODUCT.md` | 功能规划、分期计划 |
| 配色规则(Dark) | `rules/dark-ui-color-rules.md` | Dark-UI 色值计算规则 |
| 配色规则(Light) | `rules/light-ui-color-rules.md` | Light-UI 色值计算规则 |
| 切图导出规则 | `rules/export-rules.md` | 截图尺寸、格式、命名规范 |
| 图片生成规则 | `rules/image-generation-rules.md` | AI 背景图生成规则 |
| AI 对话 SOP | `SKILL.md` | 4 阶段主题生成流程 |
| 打包脚本 | `theme_builder.py` | 生成 15 个 zip 包 |
| 验证脚本 | `scripts/verify-build.py` | 验证包结构和色值 |
