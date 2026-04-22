# 主题自动化生成 Skill v9.0

## ⚠️ 规则优先级声明

**本 Skill 执行全流程时，`archive/legacy-tools/rules/` 目录下的规则文件是最高权威，优先级高于任何临时决策。使用本 Skill 即意味着严格遵守以下所有规则。**

> **核心原则：规则不是参考，是必须遵守的铁律。每次触发本 Skill，必须逐条检查规则清单，不允许跳步、不允许凭感觉、不允许"差不多就行"。**

---

## 🔒 会话初始化指令（每次触发必须执行）

**当用户触发此 Skill 时，你必须立即执行以下操作：**

1. 读取 `archive/legacy-tools/rules/` 下所有 4 个规则文件
2. 如果 `colors/{nameEn}.json` 已存在，读取它
3. **向用户报告当前状态：**
   ```
   ✅ Skill 已加载。当前主题：{主题名}
   📋 当前状态：创建 / 迭代 / 导出
   ⚠️ 待确认：模板类型（light-ui 或 dark-ui）
   ```
4. **等待用户回复模板类型和风格偏好后，立即开始执行。**

---

## 描述

AI 辅助的 OA 系统主题设计器。AI 负责创意部分（生图、配色、迭代），导出由标准脚本自动完成。

**触发关键词**：
- "生成主题"、"创建主题"、"新主题"
- "清明节主题"、"春节主题" 等节日主题
- "主题包"、"批量主题"
- "主题自动化"

**主题变更范围限制**：
1. ✅ **主图**（背景氛围图）
2. ✅ **主题色**
3. ✅ **渐变色值**
4. ❌ **整体框架结构不能修改**

---

## 📋 产品模型

### AI 工作范围：创建 → 迭代

AI 的职责是帮用户完成**创意设计**，产出标准的主题素材包。到用户满意预览为止，AI 工作结束。

```
用户描述需求
    ↓
AI 生成背景图（MiniMax image-01）
    ↓
AI 从背景图提取主色 → 计算完整配色（deriveColorsFromPrimary）
    ↓
配色实时应用到 HTML 预览 ← 用户可随时对话调整或手动微调
    ↓
用户满意 → 保存项目（标准输出就绪）
```

### 脚本工作范围：按需导出

用户满意后，点击打包 → 标准脚本自动完成截图 + 打包。AI 不参与此过程。

```
用户选择产品和打包方式
    ↓
创建导出批次（当前项目快照 + 用户勾选产品）
    ↓
本地桥接层执行 Playwright 自动截图（login/desktop/header）
    ↓
theme_builder.py 按需输出所选产品 zip 文件
```

### 项目持久化

- 每个项目自动保存到 localStorage
- 用户可以随时从侧边栏打开历史项目
- 可以继续对话调整，也可以直接重新打包
- 导出根目录由用户在设置中配置
- 每次打包都会生成独立导出批次目录
- 打包是**一次性按需操作**，不是流水线阶段

---

## 🔴 Part A：AI 工作详细流程

### 步骤 1：生成背景图

**输入**：用户描述（如 "东北冰雪世界度假季，蓝青风格"）

1. 根据用户描述先做 **Theme Agent 结构化规划**（主题类别 / 子类 / 场景 / 主体 / 光线 / 构图 / 氛围 / UI 约束）
2. 再由 Theme Agent 将结构化规划转成最终 prompt（不是直接把主题词翻译成英文）
3. 调用 MiniMax image-01 API 生成背景图
4. 返回背景图 URL

#### Theme Agent 设计原则（必须遵守）

- 首图必须达到及格线以上：方向正确、适合 OA 场景、可用于继续微调
- 背景图必须是 **产品背景图**，不是普通壁纸
- 必须考虑：左侧视觉锚点、右侧登录/工作台 UI 留白、企业感、可读性
- 画面应有主体和支撑元素，不能只有颜色氛围
- 用户反馈后只做结构化局部修正，不盲目整段重写
- 导出/打包阶段绝不允许 Theme Agent 重新改图或动态改方向

#### 必须遵守 archive/legacy-tools/rules/image-generation-rules.md：

| 检查项 | 规则 | 验证方法 |
|--------|------|---------|
| **API 端点** | `api.minimaxi.com`（注意不是 `.io`） | 检查 URL |
| **模型** | `image-01` | 检查请求体 |
| **response_format** | `url`（不是 `base64`，Token Plan 密钥用 base64 会返回 1033 错误） | 检查请求体 |
| **禁止参数** | **禁止 `prompt_optimizer`** | 检查请求体 |
| **prompt 约束** | 包含主体/氛围/风格，**不含文字/界面元素** | 检查 prompt 内容 |
| **超时** | 至少 180 秒（图片生成平均 91 秒，偶有 120 秒） | 检查 timeout |

### 步骤 2：从背景图提取主色

1. 使用 Canvas API 缩放图片至 100×56 像素
2. 使用量化算法提取主色
3. 分析最多色值的前 3-5 个颜色
4. 确定主色调 HSL(H, L, S)

#### Dark-UI 色调计算规则（⭐ 权威）：
```
背景主色调 H → Primary = 该色值
→ Primary-hover = H + 26°（极浅色，L≈85%）
→ Header-font = H + 22°（浅色文字，L≈90%）
```

#### Light-UI 色调计算规则：
```
主色 = 背景图亮色提取（L>60%）
Primary-hover = 更浅（L更高）
AlterColor = 更深（L更低）
```

### 步骤 3：计算完整配色方案

根据主色调计算完整配色方案，使用 `deriveColorsFromPrimary()` 函数，必须遵守 `archive/legacy-tools/rules/dark-ui-color-rules.md` 或 `archive/legacy-tools/rules/light-ui-color-rules.md`。

#### Dark-UI 配色计算：
```javascript
primary = 背景图主色调
primaryHover = primary +26° (L≈85%, 极浅)
headerFont = primary +22° (L≈90%, 浅色文字)
alterColor = darken(primary, 15-20%)
alterColorHoverOn = darken(primaryHover, 15%)
sidebar-panel-bg = header-font  // 必须相同
```

#### Light-UI 配色计算：
```javascript
primary = 背景图亮色提取 (L=45-60%)
primaryHover = lighten(primary, 15%)
headerFont = #333333 (深色文字)
alterColor = desaturate(darken(primary, 15%), 20%)
```

### 步骤 4：实时预览

配色生成后立即应用到 Web 预览：

1. 21 个 CSS 变量实时更新到 `#previewPanel` 元素
2. HTML 模板（login/desktop/header 变体）通过 CSS 变量自动响应颜色变化
3. 背景图通过 `--theme-login-bg-image` / `--theme-header-bg-image` CSS 变量注入
4. 用户在右侧预览面板实时查看效果

**关键代码路径**：
- `theme-engine.ts::setThemeVar()` — 设置单个 CSS 变量
- `theme-engine.ts::applyThemeImageAssignments()` — 应用背景图到模板
- `theme-engine.ts::applyTemplateSpecificThemeVars()` — Dark-UI 特殊变量
- `project-manager.ts::saveCurrentColorsToProject()` — 保存到项目

### 🛑 配色验证清单（自查后继续，无需暂停）

```
✅ 配色方案校验报告：
- 模板类型：{light-ui/dark-ui}
- 主色 primary：{值}（H={角度}°）
- 主色 hover primaryHover：{值}（H={角度}°，偏移={±值}°）
- 亮度排序：alter < primary < alterHover < primaryHover < headerFont ✅/❌
- sidebar-panel-bg = header-font：{值} == {值} ✅/❌
- colorSource: "从背景图 {主色} (H={°}°) 提取计算"

⚠️ 如果任何一项为 ❌，必须修复后再继续。
```

### 迭代调整

用户可以继续调整，直到满意为止：

- **继续对话**：用户发送消息（如"颜色再深一点"），AI 通过 tool calling 修改配色
- **手动微调**：用户通过颜色编辑面板（`color-editor.ts`）直接修改 21 个颜色值，即时生效
- **冲突处理**：最后修改者胜出（谁最后改谁赢）

---

## 📦 标准输出（AI 工作完成的交付物）

**当 AI 工作完成、用户对预览满意时，项目应包含以下标准输出：**

### 1. 色值库（21 个 CSS 变量）

```json
{
  "name": "主题显示名",
  "nameEn": "english-id",
  "templateType": "light-ui | dark-ui",
  "colors": {
    "--primary-color": "#...",
    "--primary-color-hover": "#...",
    "--alter-color": "#...",
    "--alter-color-hover-on": "#...",
    "--primary-color-opacity-10": "#...",
    "--primary-color-opacity-20": "#...",
    "--primary-color-opacity-30": "#...",
    "--header-font-color": "#...",
    "--auxiliary-gray": "#...",
    "--auxiliary-gray-dark": "#...",
    "--body-bg-color": "#...",
    "--portal-header-bg-extend-color": "#...",
    "--portal-header-complex-bg-extend-color": "#...",
    "--login-bg-color": "#...",
    "--sidebar-panel-bg": "#...",
    "--sidebar-color": "#...",
    "--sidebar-icon-color": "#...",
    "--border-color": "#...",
    "--border-icon-color": "#...",
    "--gradient-start": "#...",
    "--gradient-mid": "#..."
  },
  "backgroundImageUrl": "https://...",
  "colorSource": "从背景图 {主色} (H={°}°) 提取计算",
  "createdAt": "2026-04-13T..."
}
```

### 2. 背景图

- URL：MiniMax 返回的图片链接
- 用途：注入到登录页、桌面页、header 的背景

### 3. HTML 预览状态

- 实时渲染的 login / desktop / header 变体预览
- 所有 CSS 变量已应用，背景图已注入
- 用户可在预览面板中查看最终效果

### 4. 项目元数据

- 项目名称、创建时间、最后修改时间
- 自动保存到 localStorage（`project-manager.ts`）
- 可从侧边栏随时打开

**这套标准输出就是后续打包的输入。打包是产品功能，Agent 不参与。**

---

## 配置必需字段

`colors/{nameEn}.json` 必须包含：

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | 主题显示名称 | "星际探索，我的征途是星辰大海" |
| `nameEn` | 英文标识符（唯一） | "interstellar" |
| `templateType` | 模板类型 | "light-ui" 或 "dark-ui" |
| `primary` | 主色 | "#1A1A2E" |
| `primaryHover` | 主色 hover | "#FF8C42" |
| `alterColor` | 辅助色 | "#0F3460" |
| `alterColorHoverOn` | 辅助色 hover | "#CC6633" |

---

## 配色计算公式

### Light-UI 透明度计算（白色混合法）

```javascript
primaryOpacity10 = blendWhite(primary, 0.1)
primaryOpacity20 = blendWhite(primary, 0.2)
primaryOpacity30 = blendWhite(primary, 0.3)
```

### Light-UI AlterColor 计算

```javascript
alterColor = desaturate(darken(primary, 15%), 20%)
alterColorHoverOn = lighten(primaryHover, 15%)
```

### Dark-UI AlterColor 计算

```javascript
alterColor = darken(primary, 15-20%)
alterColorHoverOn = darken(primaryHover, 15%)
```

---

## 文件结构

```text
Topic Automation/
├── SKILL.md                        # 本文件（AI 辅助时使用）
├── AGENTS.md                       # AI 持久记忆（项目状态 + 架构）
├── theme_builder.py                # 统一打包工具（生成15个zip包）
├── archive/legacy-tools/rules/     # 📐 技术规则（⭐ MUST READ EVERY TIME）
│   ├── dark-ui-color-rules.md
│   ├── light-ui-color-rules.md
│   ├── image-generation-rules.md
│   └── export-rules.md
├── scripts/                        # 🤖 自动化脚本
│   ├── verify-build.py             # 构建结果验证
│   └── deep-verify.py              # 深度验证
├── colors/                         # 🎨 配色方案（35 个 JSON）
├── config/                         # 📋 配置即数据（8 个 JSON）
├── web/                            # 🌐 Theme Studio Web 应用（当前活跃）
│   ├── index.html
│   ├── src/
│   │   ├── main.ts                 # 精简入口（143行）
│   │   ├── project-manager.ts      # 项目 CRUD + 预设（509行）
│   │   ├── theme-engine.ts         # CSS 变量 + 颜色（192行）
│   │   ├── chat-manager.ts         # 聊天 + AI + 工具（678行）
│   │   ├── package-manager.ts      # 打包弹窗 + 导出任务创建（146行）
│   │   ├── ui-setup.ts             # UI 事件 + 设置（291行）
│   │   ├── agent/                  # AI 对话层
│   │   ├── tools/                  # Tool Calling
│   │   ├── templates/              # HTML/CSS 模板（28 文件）
│   │   └── theme/                  # 颜色与模板逻辑
│   └── scripts/                    # Playwright 截图 + 构建
├── designs/sources/                # Pen 模板（仅供参考，不参与 Web 流程）
└── output/                         # 📦 输出
    └── {日期}-{nameEn}/
        ├── 素材包/
        └── 输出包/
```

---

## 规则文档索引

| 文档 | 用途 | 关键约束 |
|------|------|---------|
| [archive/legacy-tools/rules/dark-ui-color-rules.md](../../archive/legacy-tools/rules/dark-ui-color-rules.md) | Dark-UI 配色规则 | 色调偏移、亮度排序、sidebar-panel-bg=header-font |
| [archive/legacy-tools/rules/light-ui-color-rules.md](../../archive/legacy-tools/rules/light-ui-color-rules.md) | Light-UI 配色规则 | 白色混合透明度、亮度排序 |
| [archive/legacy-tools/rules/image-generation-rules.md](../../archive/legacy-tools/rules/image-generation-rules.md) | MiniMax API 调用 | url 格式（非 base64）、禁止 prompt_optimizer |
| [archive/legacy-tools/rules/export-rules.md](../../archive/legacy-tools/rules/export-rules.md) | 截图输出规范 | 尺寸/命名/格式必须100%一致 |

---

## 版本历史

- **v9.0 (2026-04-13)** - 🔄 **Agent 职责边界重定义**：从 4 阶段流水线改为 Agent 专注创意（创建+迭代），导出归产品功能；移除导出脚本细节；新增标准输出定义（色值库 + 背景图 + 预览状态）
- **v8.0 (2026-04-13)** - Path B 重写：全面改为 Web 浏览器流程，移除 Pencil MCP 操作步骤
- **v7.1 (2026-04-10)** - 流程确认点优化
- **v7.0 (2026-04-10)** - Python 工具链全面替代：5阶段→4阶段，13包→15包
- **v6.0 (2026-04-09)** - 强制阶段锁定机制
