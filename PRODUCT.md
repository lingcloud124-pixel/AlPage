# Theme Studio — 产品定义文档

> **版本**: v4.1 | **更新日期**: 2026-04-11
> **本文档是产品的单一事实来源，所有迭代围绕本文档进行。**

---

## 一、产品定位

**一句话**：用户通过对话生成和管理 OA 主题，实时看到效果图，满意后按需打包。

---

## 二、用户操作流程

### 2.1 首页

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                   Theme Studio                               │
│                                                              │
│            ┌─────────────┐  ┌─────────────┐                 │
│            │  新建项目     │  │  历史项目     │                 │
│            └─────────────┘  └─────────────┘                 │
│                                                              │
│            历史项目列表（最近使用）：                           │
│            ┌──────────────────────────────────┐              │
│            │ 🎨 篮球对抗赛   2026-04-11 14:30 │              │
│            │ 🎨 国庆节喜庆   2026-04-10 09:15 │              │
│            │ 🎨 星际探索     2026-04-09 16:42 │              │
│            └──────────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**新建项目入口（二选一）**：
- **直接对话**：描述需求，AI 从头生成配色方案
- **选择模板**：从 35 个预设配色方案中快速开始

### 2.2 项目工作台

```
┌──────────────────────────────────────────────────────────────────┐
│  [篮球对抗赛]  登录页 | 主页 | 默认页眉 | 复杂页眉 | ...    [面板][打包] │
│  ┌────────────────────┬────────────────────────────────────┐   │
│  │                    │                                    │   │
│  │  对话区域           │        样式预览区                   │   │
│  │                    │                                    │   │
│  │  用户：做一个篮球    │   ┌─────────────────────────┐     │   │
│  │  主题               │   │                         │     │   │
│  │                    │   │    登录页 / 主页预览       │     │   │
│  │  AI：好的，我为你    │   │    (实时渲染)            │     │   │
│  │  生成了篮球主题...   │   │                         │     │   │
│  │                    │   │                         │     │   │
│  │  ┌──────────────┐  │   └─────────────────────────┘     │   │
│  │  │ 输入消息...    │  │                                    │   │
│  │  └──────────────┘  │                                    │   │
│  │                    │                                    │   │
│  │  [切换到其他项目 ▾]  │                                    │   │
│  └────────────────────┴────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**顶栏布局**：
- **左上角**：项目名称 + 板块切换 Tab（登录页 | 主页 | 默认页眉 | 复杂页眉 | 菜单页眉 | 横幅页眉 | 侧边页眉）
- **右上角**：修改面板按钮 + 打包按钮

**左侧对话区域**：
- 与 AI 对话修改当前项目
- 底部有「切换到其他项目」入口，可快速跳转历史项目

**右侧样式预览区**：
- 根据顶栏 Tab 切换显示不同模板页
- 所有修改实时反映

### 2.3 修改面板（右侧滑出）

```
 点击 [面板] 按钮后：
 
 ┌──────────┬─────────────────────────────────────────────────┐
 │          │  ┌─────────────────────────────────────────┐   │
 │ 对话区域  │  │         修改面板（右侧滑出）               │   │
 │ (自动收起) │  │                                         │   │
 │          │  │  主题色系                                │   │
 │          │  │  ┌──┐ 主题色      #2C615C  [██]          │   │
 │          │  │  ┌──┐ 主题色悬停   #B2FFE6  [██]          │   │
 │          │  │  ┌──┐ 辅助色      #144E48  [██]          │   │
 │          │  │                                         │   │
 │          │  │  文字色系                                │   │
 │          │  │  ┌──┐ 标题字体色  #333333  [██]          │   │
 │          │  │  ┌──┐ 辅助灰色    #999999  [██]          │   │
 │          │  │                                         │   │
 │          │  │  ...                                    │   │
 │          │  │                                         │   │
 │          │  │  [恢复默认]                              │   │
 │          │  └─────────────────────────────────────────┘   │
 └──────────┴─────────────────────────────────────────────────┘
```

**交互**：
- 点击 [面板] → 右侧滑出修改面板，对话区域自动收起
- 面板中 21 个色值可点击修改，预览实时刷新
- 点击面板外或关闭按钮 → 面板收起，对话区域恢复

### 2.4 打包流程

```
 点击 [打包] 按钮后：
 
 ┌──────────────────────────────────────────────────────────┐
 │                                                          │
 │  选择打包产品                                    [×]     │
 │                                                          │
 │  ☑ MK 主题包          ☑ MK 登录包                        │
 │  ☑ EKP V12 主题包     ☑ EKP V12 登录包                   │
 │  ☑ EKP V13.5 主题包   ☑ EKP V13.5 登录包                 │
 │  ☐ EKP V14.16 主题包  ☐ EKP V14.16 登录包                │
 │  ☐ EKP V17 主题包     ☐ EKP V17 登录包                   │
 │                                                          │
 │  [全选]  [取消选择]                                       │
 │                                                          │
 │              [开始打包]    [取消]                          │
 │                                                          │
 └──────────────────────────────────────────────────────────┘
```

**打包过程**：
1. 弹出框选择要打包的产品（复选框）
2. 点击「开始打包」
3. 后台执行：Playwright 截图 → ImageMagick 裁剪 → theme_builder.py 打包 → verify
4. 完成后弹出提示：「打包完成！已生成 N 个主题包」，可直接下载

---

## 三、详细工作流

### 3.1 配色生成

```
用户选择创建方式：
├── A. 从模板库选择（colors/*.json，35 个预设） → 加载到预览
├── B. 描述需求 → MiniMax API 生成背景图 → Python 色值提取 → HSL 规则计算 → 配色方案
└── C. 上传参考图 → 提取主色调 → HSL 规则计算 → 配色方案
```

**方式 B 详细流程（先出图再配色）**：
1. 用户描述主题需求（名称/风格/模板类型）
2. 调用 MiniMax Image API 生成背景图 → `designs/{nameEn}-bg.png`
3. 缩放图片至 100×56 像素，Python 量化提取主色 → 确定 HSL 色调
4. 按 Light-UI / Dark-UI 规则计算完整配色方案
5. 写入 `colors/{nameEn}.json`

### 3.2 预览调整（持续，无暂停点）

```
配色方案加载到 Web App：
    ↓
① CSS 变量注入 → 原生 HTML 模板即时渲染
   - 登录页（2215×1080）：背景图 + logo + 表单 + 交互态
   - 主页（1920×1079）：header + sidebar + 卡片 + 交互态
    ↓
② 用户自由修改（随时切换）：
   ├── 对话修改："主题色调亮一点" → AI 调整
   ├── 面板修改：21 个色值直接拖动/输入
   ├── 背景图替换：上传新图或 AI 生成
   └── 预览实时响应所有修改
    ↓
③ 持续迭代直到满意 → 用户主动选择"打包"
```

**交互态原生支持**：
- 侧边栏导航：`:hover` 背景从 `$primary-color` → `$primary-color-hover`
- 登录输入框：`:focus` 边框从灰色 → 主题色
- 搜索按钮：`:hover` 背景从 `$primary-color` → `$alter-color`
- 14 个 hover/state 色彩变量全部通过 CSS 变量驱动

### 3.3 按需打包

```
用户点击"打包"：
    ↓
① 选择打包范围：
   ├── 全部（15 个 zip：MK×2 + V12×2 + V13_5×4 + V14_16×5 + V17×2）
   └── 部分产品（如只要 MK + V17）
    ↓
② Playwright 截取所需区域（精确尺寸）：
   ├── 登录页整体 → bg-login.jpg (2215×1080)
   ├── 登录页背景 → login_thumb.jpg (960×540)
   ├── 工作台整体 → desktop.png (1920×1079)
   ├── 默认页眉 → header_tlayout_frame_bg.png (1920×60)
   ├── 复杂页眉 → header_complex_frame_bg.png (1920×90)
   ├── 菜单页眉 → header_menu_frame_bg.png (1920×130)
   ├── 横幅页眉 → header-banner.png (2560×480)
   └── 侧边页眉 → header-sideheader.png (200×900)
    ↓
③ ImageMagick 裁剪/缩放 → 标准素材文件
    ↓
④ theme_builder.py 打包选定的产品 → zip
    ↓
⑤ verify-build.py 验证 → 下载
```

---

## 四、当前状态

### 已完成的后端能力

| 能力 | 状态 | 说明 |
|------|------|------|
| 色值注入 | ✅ 可用 | `theme_builder.py` 替换 CSS/SCSS 中的主题色 |
| 批量打包 | ✅ 可用 | 输出 15 个 zip（MK + V12~V17 的主体+登录包） |
| 验证脚本 | ✅ 可用 | `verify-build.py` 验证包结构、色值、图片 |
| 配色方案库 | ✅ 可用 | `colors/` 下 35 个已验证的 JSON 配色方案 |
| MiniMax 背景图生成 | ✅ 可用 | `scripts/image_gen.py`，需 API Key |
| Python 色值提取 | ✅ 可用 | 量化提取 + HSL 计算 |

### 已完成的 Web App 能力

| 能力 | 状态 | 说明 |
|------|------|------|
| AI 对话（SSE 流式） | ✅ 可用 | 智谱 GLM-4-Flash，支持流式输出 |
| Tool Calling 执行器 | ✅ 可用 | update_colors / analyze_image / save_colors / load_colors |
| 色值编辑面板 | ✅ 可用 | 21 个 CSS 变量，实时更新预览 |
| 设置模态框 | ✅ 可用 | API 端点/Key/模型，localStorage 持久化 |
| 对话面板可拖动 | ✅ 可用 | 默认 320px，可拖动调整 |
| 图片上传颜色提取 | ✅ 可用 | Canvas 色值提取 |
| System Prompt | ✅ 可用 | 含完整配色规则 + 35 个预设列表 |

---

## 五、技术架构

### 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 前端 | Vite + TypeScript | 项目已有，快速构建 |
| UI | 纯 HTML + CSS + TypeScript | 不引入任何框架或 CSS 库 |
| 预览渲染 | **原生 HTML 模板** | CSS 变量驱动，交互态原生支持 |
| 截图 | Playwright | 精确控制视口尺寸 |
| AI | OpenAI 兼容 API（智谱） | SSE 流式，Tool Calling |
| 配色生成 | MiniMax API + Python | 先出图再提色 |
| 打包 | theme_builder.py | 已有，不需要改动 |
| 存储 | localStorage | 前端本地存储 |

### 预览渲染架构（新）

```
原生 HTML 模板 (web/templates/)
  │
  ├── login.html           登录页（2215×1080）
  ├── desktop.html         主页（1920×1079）
  ├── header-default.html  默认页眉（1920×60）
  ├── header-complex.html  复杂页眉（1920×90）
  ├── header-menu.html     菜单页眉（1920×130）
  ├── header-banner.html   横幅页眉（2560×480）
  └── sidebar.html         侧边页眉（200×900）
      │
      └── 所有颜色通过 CSS 变量控制 (:root)
          修改变量 → 全部模板即时刷新
          hover/focus/active 通过 CSS 伪类原生支持
```

### 文件结构（目标）

```
web/
├── index.html                     # 主入口 HTML
├── src/
│   ├── styles.css                 # 全部样式
│   ├── main.ts                    # 应用入口
│   ├── types.ts                   # 类型定义
│   ├── templates/                 # 🆕 原生 HTML 模板
│   │   ├── login.html             # 登录页模板
│   │   ├── desktop.html           # 主页模板
│   │   ├── header-default.html    # 默认页眉模板
│   │   ├── header-complex.html    # 复杂页眉模板
│   │   ├── header-menu.html       # 菜单页眉模板
│   │   ├── header-banner.html     # 横幅页眉模板
│   │   ├── sidebar.html           # 侧边页眉模板
│   │   └── theme-variables.css    # 共享 CSS 变量定义
│   ├── components/
│   │   └── color-editor.ts        # 色值编辑面板（21 个颜色变量）
│   ├── agent/
│   │   ├── chat-client.ts         # SSE 流式 API 客户端
│   │   └── system-prompt.ts       # AI System Prompt 生成
│   ├── tools/
│   │   └── executor.ts            # Tool Calling 执行器
│   ├── theme/
│   │   ├── color-utils.ts         # 🆕 RGB↔HSL、WCAG、亮度计算
│   │   ├── preset-loader.ts       # 🆕 加载 colors/*.json
│   │   └── variable-sync.ts       # 🆕 CSS 变量同步到模板
│   └── pen-renderer/              # 过渡期保留，模板页完成后移除
├── presets/                       # 模板预设
├── scripts/
│   ├── screenshot.ts              # Playwright 截图
│   └── build.ts                   # 打包流程
├── .env
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 六、开发计划

### Phase A：原生 HTML 模板建设（最高优先级）

**目标**：参照 .pen 设计稿，用原生 HTML/CSS 创建 7 个页面模板，CSS 变量驱动主题色，模板页完成后 .pen 文件不再参与流程。

**交付物**：

| # | 任务 | 说明 |
|---|------|------|
| A.1 | 登录页模板 | 参照 .pen 设计稿，纯 HTML+CSS，CSS 变量驱动，含 input focus 交互态 |
| A.2 | 主页模板 | 参照 .pen 设计稿，header+sidebar+卡片，含 sidebar nav hover、搜索按钮 hover 交互态 |
| A.3 | 6 个页眉/侧边栏模板 | 参照 .pen 设计稿，header-default(60px) / header-complex(90px) / header-menu(130px) / header-banner(2560×480) / sidebar(200×900) |
| A.4 | CSS 变量体系 | 21+ 个主题变量 + 14 个 hover 变量，统一定义在 theme-variables.css |
| A.5 | 模板加载 + 变量同步 | 切换配色方案 → CSS 变量注入 → 所有模板即时刷新 |
| A.6 | 预览区改造 | 从 .pen renderer 切换到原生模板渲染，Tab 切换 + 自适应 |

**验收标准**：
1. 登录页和主页视觉效果与设计稿一致
2. hover/focus 交互态正确响应
3. 修改任意 CSS 变量 → 预览即时刷新
4. 加载任意 colors/*.json → 预览正确显示

### Phase B：配色生成集成

**目标**：在 Web App 中集成完整的配色生成流程。

| # | 任务 | 说明 |
|---|------|------|
| B.1 | 模板库选择器 | 展示 35 个预设，点击加载，支持 Light-UI / Dark-UI 筛选 |
| B.2 | MiniMax API 集成 | 前端调用 → 生成背景图 → 自动应用 |
| B.3 | 品牌色推导 | 输入 #hex → JS HSL 计算 → 全套色值 + 显示推导过程 |
| B.4 | 图片色调推导 | 上传图片 → Canvas 提取主色 → HSL 计算 → 全套色值 |

### Phase C：按需打包

**目标**：用户选择产品范围 → 一键截图+打包。

| # | 任务 | 说明 |
|---|------|------|
| C.1 | 打包选择器 UI | 复选框选择要打包的产品（MK/V12/V13_5/V14_16/V17） |
| C.2 | Playwright 截图引擎 | 按需截取选定区域，精确尺寸 |
| C.3 | ImageMagick 后处理 | 裁剪/缩放为标准素材文件 |
| C.4 | theme_builder.py 集成 | YAML 生成 → 打包 → 验证 → 下载 |

### Phase D：增强功能

| # | 任务 | 说明 |
|---|------|------|
| D.1 | 对比模式 | 左右分屏对比当前方案 vs 历史方案 |
| D.2 | 质检预览 | WCAG 对比度检查、亮度排序、规则验证 |
| D.3 | 对话历史持久化 | 刷新不丢失，项目化管理 |

---

## 七、交互态定义

### 原生 HTML 模板中的交互态

| 元素 | 默认态 | 交互态 | CSS 实现 |
|------|--------|--------|---------|
| 侧边栏导航项 | bg: `$primary-color` | hover: `$primary-color-hover` | `.nav-item:hover` |
| 登录输入框 | border-bottom: `$auxiliary-gray-dark` | focus: `$primary-color` | `input:focus` |
| 搜索按钮 | bg: `$primary-color` | hover: `$alter-color` | `.search-btn:hover` |
| 页眉导航文字 | color: `$header-font-color` | hover: `$header-font-color-hover` → `$primary-color` | `.nav-link:hover` |
| 侧边栏图标 | color: `$sidebar-icon-color` | hover: `$sidebar-icon-color-hover` → #FFFFFF | `.sidebar-icon:hover` |

### 完整色彩变量体系（21 主题色 + 14 hover 色）

```css
:root {
  /* 主题色系 */
  --primary-color: #2C615C;
  --primary-color-hover: #B2FFE6;
  --alter-color: #144E48;
  --alter-color-hover-on: #73CAA6;
  --primary-color-opacity-10: #E9F1EB;
  --primary-color-opacity-20: #D3E2D8;
  --primary-color-opacity-30: #BDD4C4;

  /* 文字色系 */
  --header-font-color: #333333;
  --auxiliary-gray: #999999;
  --auxiliary-gray-dark: #666666;

  /* 背景色系 */
  --body-bg-color: #F8F8F8;
  --portal-header-bg-extend-color: #FBFCF2;
  --portal-header-complex-bg-extend-color: #FBFCF2;
  --login-bg-color: #144E48;

  /* 侧边栏 */
  --sidebar-panel-bg: #B8A9D9;
  --sidebar-color: #333333;
  --sidebar-icon-color: #9B8FC7;

  /* 边框 */
  --border-color: #E5E7EB;
  --border-icon-color: #E5E7EB;

  /* 渐变组件 */
  --gradient-start: #fdfff5;
  --gradient-mid: #f7f3cd;

  /* Hover 状态色 */
  --hover-bg-color: var(--body-bg-color);
  --sidebar-icon-color-hover: #FFFFFF;
  --sidebar-item-current-color: #FFFFFF;
  --header-font-color-hover: var(--primary-color);
  --portal-header-font-color-hover: var(--primary-color);
  --portal-header-simple-font-color-hover: var(--primary-color);
  --portal-header-complex-font-color-hover: #FFFFFF;
  --portal-header-zone-font-color-hover: var(--primary-color);
  --single-header-font-color-hover: var(--primary-color);
  --tlayout-header-font-color-hover: var(--primary-color);
}
```

---

## 八、素材导出规格

### Playwright 截图清单

| 切图类型 | 模板 | 尺寸 | 格式 | 输出文件名 |
|---------|------|------|------|-----------|
| 登录页背景 | login.html (去文字层) | 2215×1080 | jpg | bg-login.jpg |
| 登录页整体 | login.html | 2215×1080 | jpg | login_thumb.jpg → 960×540 |
| 工作台整体 | desktop.html | 1920×1079 | png | desktop.png + MK 缩略图 |
| 横幅页眉 | header-banner.html | 2560×480 | png | header-banner.png |
| 默认页眉 | header-default.html | 1920×60 | png | header_tlayout_frame_bg.png |
| 复杂页眉 | header-complex.html | 1920×90 | png | header_complex_frame_bg.png |
| 菜单页眉 | header-menu.html | 1920×130 | png | header_menu_frame_bg.png |
| 侧边页眉 | sidebar.html | 200×900 | png | header-sideheader.png |

### ImageMagick 后处理

| 输出文件 | 来源 | 操作 |
|---------|------|------|
| background.png | bg-login.jpg | 裁剪 1920×1080 居中 |
| login_thumb.jpg | nXv3Y 截图 | 缩放 960×540 |
| thumb-1.jpg | bg-login.jpg | 裁剪 800×390 |
| thumb-2.jpg | bg-login.jpg | 裁剪 800×390（偏移 800px） |
| desktop.png | dKOHu 截图 | 缩放 1440×800 |
| layout-banner.jpg | dKOHu 截图 | 缩放 1600×572 |
| fullscreen-sideheader.jpg | dKOHu 截图 | 缩放 1600×572 |
| fullscreen-sidenav.jpg | dKOHu 截图 | 缩放 1600×572 |
| center-sidenav.jpg | dKOHu 截图 | 缩放 1600×572 |

---

## 九、已有资产清单

```
可直接复用：
├── theme_builder.py          # 打包脚本（965行，完整可用）
├── scripts/verify-build.py   # 验证脚本
├── scripts/image_gen.py      # MiniMax 背景图生成
├── SKILL.md                  # 4阶段流程 SOP（571行）
├── rules/                    # 色值规则 + 切图规则 + 图片生成规则
├── colors/*.json             # 35个已验证配色方案
├── assets/references/samples/ # 15个模板zip
└── output/                   # 主题包输出目录

设计参考（模板页完成后不再需要）：
├── designs/*.pen             # Pencil 设计文件（参考用，非依赖）
└── screenshots/              # 截图参考
```

---

## 十、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v4.1 | 2026-04-11 | 新增完整用户操作流程：首页（新建/历史）→ 项目工作台（对话+预览）→ 修改面板（右侧滑出，对话收起）→ 打包弹窗（按需选择产品） |
| v4.0 | 2026-04-11 | 架构重构：原生 HTML 模板替代 .pen 渲染引擎；流程简化；模板库选择；按需打包 |
| v3.0 | 2026-04-11 | 全面状态更新，已知问题分级，Phase 0 渲染修复计划 |
| v2.0 | 2026-04-10 | 对话提升为 MVP 核心入口，多模态输入，Phase 合并为 4 期 |
| v1.0 | 2026-04-10 | 初始版本 |
