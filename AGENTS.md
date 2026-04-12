# AGENTS.md — Theme Studio 项目 AI 持久记忆

> **本项目 AI 助手（OpenCode/Sisyphus）在每次新对话时自动加载此文件。**
> **最后更新**: 2026-04-12

---

## 一、项目身份

**这是一个 OA 系统主题包生成工具，不是网页设计工具。**

- **项目名**: Theme Studio（主题自动化 / Topic Automation）
- **项目路径**: `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation`
- **核心用途**: 用户描述需求 → AI 生成背景图 → 提取配色 → 编辑 .pen 设计文件 → 切图导出 → 打包生成 15 个 OA 主题 zip 包
- **目标产品**: EKp / MK / KK 等 OA 系统（版本 V12 ~ V17）
- **Skill 名称**: `theme-automation`

---

## 二、架构概览

本项目有 **两条独立的产品线**，共享配色和模板资源但技术栈完全不同：

### 产品线 A：主题包生成（核心，Python + Pencil MCP）

这是主要工作流，用户通过对话生成 OA 主题包：

```
用户描述 → MiniMax 生图 → 从图提取配色 → 编辑 .pen 文件 → Pencil 切图 → theme_builder.py 打包 → 15 个 zip
```

**关键文件**：
| 文件 | 作用 |
|------|------|
| `SKILL.md` | AI 操作手册（4 阶段流程，每次必须读取） |
| `theme_builder.py` | 统一打包工具（生成 15 个 zip） |
| `scripts/update-pen-theme.py` | Pen 文件颜色/图片自动更新 |
| `scripts/verify-build.py` | 打包后验证 |
| `designs/sources/Light-UI-模板.pen` | Light 模板（勿删改） |
| `designs/sources/Dark-UI-模板.pen` | Dark 模板（勿删改，实验性） |
| `rules/*.md` | 4 个技术规则文件（铁律，每次必须遵守） |
| `workflows/*.md` | 5 个流程文档 |

**输入输出**：
- 输入：`colors/{nameEn}.json`（配色方案）
- 输出：`output/{日期}-{nameEn}/输出包/`（15 个 zip）

### 产品线 B：Theme Studio Web 应用（前端，纯 HTML+CSS+TS）

一个 AI 驱动的 Web 界面，让用户通过对话方式生成主题：

```
web/
├── index.html              # 主入口
├── src/
│   ├── main.ts             # 应用初始化
│   ├── styles.css          # 全局样式
│   ├── types.ts            # 类型定义
│   ├── agent/              # AI 对话（OpenAI 兼容 API）
│   │   ├── chat-client.ts  # SSE 流式客户端
│   │   ├── system-prompt.ts
│   │   ├── knowledge-base.ts
│   │   └── user-preferences.ts
│   ├── preview/            # 主题预览
│   │   └── theme-renderer.ts
│   ├── components/         # UI 组件
│   │   └── color-editor.ts
│   ├── packaging/          # 打包功能
│   │   └── package-builder.ts
│   ├── templates/          # HTML 模板（登录页/工作台/Header变体/Sidebar）
│   ├── theme/              # 颜色工具
│   │   └── color-utils.ts
│   └── tools/              # Tool Calling 执行器
│       ├── executor.ts
│       └── contrast-validator.ts
```

**技术约束**：纯 HTML + CSS + TypeScript，无框架（不用 React/Vue），不用 CSS 库。

---

## 三、核心工作流（4 阶段）

用户说"生成主题"时，按以下 4 阶段严格执行：

| 阶段 | 任务 | 输出 | 锁定验证 |
|------|------|------|---------|
| **1** | 配色方案生成（从图片分析） | `colors/{nameEn}.json` | 颜色规则校验 |
| **2** | 背景图生成 + Pen 文件更新 | Pen 文件 + 背景图 | **必须用户在 Pencil 中确认** |
| **3** | Pencil 切图导出 | `output/{date}-{nameEn}/素材包/` | 尺寸校验 |
| **4** | 批量打包 | `output/{date}-{nameEn}/输出包/*.zip` | 15 个包全部成功 |

**核心原则**：
1. 先出图，再配色，保证主题色与背景图色调匹配
2. `rules/` 目录下规则是最高权威，不能跳步
3. 整个流程中**只有阶段 2 完成后需要暂停等用户确认** Pen 文件效果
4. 颜色必须由图片决定，不能凭空编造

---

## 四、关键规则速查

### 配色规则

| 规则 | 文件 | 核心要点 |
|------|------|---------|
| Light-UI | `rules/light-ui-color-rules.md` | 白色混合透明度、亮度排序 |
| Dark-UI | `rules/dark-ui-color-rules.md` | 色调偏移 +22°/+26°、sidebar-panel-bg = header-font |

### 背景图生成

- API：MiniMax（`api.minimaxi.com`，注意不是 `.io`）
- `response_format` 必须 `base64`
- **禁止** `prompt_optimizer` 参数
- Prompt 必须包含："no text", "no UI elements"

### 切图导出

- **必须用 `scale: 1`**（不能用 scale: 2）
- Light-UI 节点：`A7bgM`(60px), `TdfhH`(90px), `C0kVM`(130px), `Nk9d0`(banner), `jTA4O`(sidebar), `LiN3g`(login bg), `nXv3Y`(login full), `dKOHu`(desktop)
- Dark-UI 节点：`y6LPs`, `CagmA`, `KDpQp`, `K7n6g`, `zmpSH`, `PAgAA`, `nXv3Y`, `dKOHu`

### 打包

- 15 个 zip：MK(2) + V12(2) + V13_5(4) + V14_16(5) + V17(2)
- 验证命令：`python3 scripts/verify-build.py "output/{date}-{nameEn}/输出包"`

---

## 五、20 个 CSS 变量体系

所有主题颜色由 20 个 CSS 变量驱动，这是核心数据结构：

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
| 打包图片是模板原始图 | 没执行阶段 2 插入背景图 | 背景图生成后必须立即插入 Pen |
| 硬编码旧色值残留 | update-pen-theme.py 只更新变量 | 需手动检查清理硬编码色值 |
| V12/V13 登录包丢根文件 | `find_first_subdir` 逻辑错 | 从 extract root 打包 |
| 渐变组件被清空 | 脚本匹配太宽泛 | 只更新精确节点 RWYIx/6U9v0 |
| 找不到模板目录 | 目录名不一致 | `assets/references/samples/主题样例包` 是 symlink |
| `npm run update` 失败 | 已弃用 | 用 `python3 theme_builder.py` |

---

## 七、目录结构速查

```
Topic Automation/
├── AGENTS.md              # ← 你正在读的文件（AI 持久记忆）
├── SKILL.md               # AI 操作手册（4 阶段流程）
├── PRODUCT.md             # 产品定义（Web 应用规划）
├── DESIGN.md              # 设计系统文档
├── PROJECT.md             # 项目简介
├── README.md              # 使用说明
├── 操作说明书.md           # 用户操作手册
├── theme_builder.py       # 统一打包工具（15 zip）
├── .env                   # API Keys（MINIMAX_API_KEY, VITE_ZHIPU_API_KEY）
├── rules/                 # ⭐ 技术规则铁律
│   ├── dark-ui-color-rules.md
│   ├── light-ui-color-rules.md
│   ├── image-generation-rules.md
│   └── export-rules.md
├── workflows/             # 流程文档
├── scripts/               # 自动化脚本
│   ├── update-pen-theme.py
│   ├── verify-build.py
│   └── install-skill.sh
├── colors/                # 配色方案 JSON
├── designs/
│   ├── sources/           # 模板（勿删改）
│   └── Topic-*.pen        # 生成的主题文件
├── assets/references/samples/主题样例包/  # 官方样例包（symlink）
├── output/                # 输出
│   └── {日期}-{nameEn}/
│       ├── 素材包/
│       └── 输出包/
├── web/                   # Theme Studio Web 应用
│   ├── index.html
│   ├── src/               # 纯 TS，无框架
│   └── scripts/           # Playwright 截图 + 构建脚本
├── src/                   # 旧 TS 代码（已弃用）
└── templates/             # 主题模板目录
```

---

## 八、AI 行为规范

### 新对话开场

当用户打开新对话时，你应该：

1. **读取此文件**（AGENTS.md）了解项目
2. 根据用户意图判断走哪条产品线：
   - 主题包生成 → 读 `SKILL.md` + `rules/` 全部规则
   - Web 应用开发 → 读 `DESIGN.md` + `PRODUCT.md`
3. 向用户简要报告你了解的上下文

### 主题包生成时

1. **必须**先读 `SKILL.md`（完整 4 阶段流程）
2. **必须**读 `rules/` 下全部 4 个规则文件
3. 严格遵守阶段锁定机制，不能跳步
4. 配色必须从图片提取，不能凭空编造
5. 背景图路径用绝对路径

### Web 应用开发时

1. 遵循 `DESIGN.md` 的设计规范
2. 纯 HTML + CSS + TypeScript，不用框架
3. 中文 UI
4. CSS 变量驱动颜色，不硬编码

### 技术栈

| 层 | 技术 |
|----|------|
| 主题包 | Python（theme_builder.py, update-pen-theme.py） |
| Web 前端 | 纯 HTML + CSS + TypeScript（Vite 开发服务器） |
| AI API | 智谱 GLM-4-Flash（Web 端）/ OpenCode（命令行端） |
| 图片生成 | MiniMax Image API |
| 设计文件 | Pencil（.pen 格式，通过 MCP 操作） |
| 截图 | Playwright |
| 图片处理 | ImageMagick（convert） |
| 测试 | Vitest（单元）+ Playwright（E2E） |

---

## 九、环境依赖

- **Node.js**: `npm install`（项目根目录 + web/ 目录）
- **Python 3**: theme_builder.py, update-pen-theme.py
- **ImageMagick**: `convert` 命令（切图裁剪）
- **Pencil**: .pen 文件编辑器（MCP 连接）
- **Playwright**: Web 端截图
- **API Keys**: `.env` 文件中 `MINIMAX_API_KEY`, `VITE_ZHIPU_API_KEY`

---

## 十、历史决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-04-09 | 废弃 `run-updater.mjs`，改用 `theme_builder.py` | 旧工具链 bug 多，13包→15包 |
| 2026-04-09 | 引入 `verify-build.py` 自动验证 | 避免人工检查 15 个 zip |
| 2026-04-09 | 强制阶段锁定机制 | 防止 AI 跳步 |
| 2026-04-10 | 阶段从 5 阶段简化为 4 阶段 | 合并冗余步骤 |
| 2026-04-11 | Web 端架构重构：原生 HTML 模板替代 .pen 渲染引擎 | 性能和可维护性 |
| 2026-04-12 | Web 端三列布局（豆包风格）+ 跨项目偏好记忆 | 产品体验升级 |
| 2026-04-12 | 创建 AGENTS.md 持久记忆 | 解决新对话丢失上下文问题 |
