# 主题自动化生成 Skill v7.1

## ⚠️ 规则优先级声明

**本 Skill 执行全流程时，`rules/` 目录下的规则文件是最高权威，优先级高于任何临时决策。使用本 Skill 即意味着严格遵守以下所有规则。**

> **核心原则：规则不是参考，是必须遵守的铁律。每次触发本 Skill，必须逐条检查规则清单，不允许跳步、不允许凭感觉、不允许"差不多就行"。**

---

## 🔒 会话初始化指令（每次触发必须执行）

**当用户触发此 Skill 时，你必须立即执行以下操作：**

1. 读取 `rules/` 下所有 4 个规则文件
2. 如果 `colors/{nameEn}.json` 已存在，读取它
3. **向用户报告当前状态：**
   ```
   ✅ Skill 已加载。当前主题：{主题名}
   📋 当前阶段：阶段 1/4（配色方案生成前）
   ⚠️ 待确认：模板类型（light-ui 或 dark-ui）
   ```
4. **等待用户回复模板类型和风格偏好后，立即开始执行。** 整个流程中只有阶段 2 完成后需要暂停等待用户确认 Pen 文件效果，其他阶段连续执行。

---

## 描述

自动化生成企业OA系统主题包，从设计到打包的完整流程。

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

## 📋 完整流程（4阶段，带强制锁定）

**核心原则：先出图，再配色，保证主题色与背景图色调匹配。**

每个阶段**必须验证通过后**才能进入下一阶段。验证不通过必须停止并报告。

| 阶段 | 任务 | 输出 | 锁定验证 |
|------|------|------|---------|
| **阶段 1** | 配色方案生成（从图片分析） | `colors/{nameEn}.json` | ✅ 颜色规则校验 |
| **阶段 2** | 背景图生成 + Pen 文件更新 | Pen 文件 + 背景图 | ✅ 截图确认 |
| **阶段 3** | Pencil 切图导出 | `output/{date}-{nameEn}/素材包/` | ✅ 尺寸校验 |
| **阶段 4** | 批量打包 | `output/{date}-{nameEn}/输出包/*.zip` | ✅ 15个包全部成功 |

---

## 🔴 阶段 1：配色方案生成

**输入**：用户描述（如 "东北冰雪世界度假季，蓝青风格"）
**输出**：`colors/{nameEn}.json`

### 步骤 1：生成背景图

1. 根据用户描述设计 prompt（主体/氛围/风格/约束）
2. 调用 MiniMax API 生成背景图
3. 保存到 `designs/{nameEn}-bg.png`

### 必须遵守 rules/image-generation-rules.md：
| 检查项 | 规则 | 验证方法 |
|--------|------|---------|
| **API_key** | `source .env`，确认加载 | `echo $MINIMAX_API_KEY` |
| **Endpoint** | `api.minimaxi.com`（不是 minimax.io） | 检查 URL |
| **response_format** | 必须 `base64`（不是 `url`） | 检查请求体 |
| **禁止参数** | **禁止 `prompt_optimizer`** | 检查请求体 |
| **prompt 约束** | 包含主体/氛围/风格，**不含文字/界面元素** | 检查 prompt 内容 |
| **保存位置** | `designs/{nameEn}-bg.png` | 文件路径正确 |

### 步骤 2：从背景图提取主色

1. 缩放图片至 100×56 像素
2. 使用量化算法（step=40）提取主色
3. 分析最多色值的前 3-5 个颜色
4. 确定主色调 HSL(H, L, S)

### Dark-UI 色调计算规则（⭐ 权威）：
```
背景主色调 H → Primary = 该色值
→ Primary-hover = H + 26°（极浅色，L≈85%）
→ Header-font = H + 22°（浅色文字，L≈90%）
```

### Light-UI 色调计算规则：
```
主色 = 背景图亮色提取（L>60%）
Primary-hover = 更浅（L更高）
AlterColor = 更深（L更低）
```

### 步骤 3：计算完整配色方案

根据主色调计算完整配色方案，必须遵守 `rules/dark-ui-color-rules.md` 或 `rules/light-ui-color-rules.md`，写入 `colors/{nameEn}.json`。

### Dark-UI 配色计算：
```javascript
primary = 背景图主色调
primaryHover = primary +26° (L≈85%, 极浅)
headerFont = primary +22° (L≈90%, 浅色文字)
alterColor = darken(primary, 15-20%)
alterColorHoverOn = darken(primaryHover, 15%)
sidebar-panel-bg = header-font  // 必须相同
```

### Light-UI 配色计算：
```javascript
primary = 背景图亮色提取 (L=45-60%)
primaryHover = lighten(primary, 15%)
headerFont = #333333 (深色文字)
alterColor = desaturate(darken(primary, 15%), 20%)
```

### 🛑 [PHASE LOCK] 阶段 1 验证清单

**自查后直接进入阶段 2，无需暂停等用户确认：**
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
**校验通过后直接进入阶段 2，无需等待用户确认。**

---

## 🔴 阶段 2：背景图插入 Pen 文件 + Pen 更新

**背景图生成后必须立即执行此步骤，否则打包出来的图片是模板原始图片而非新主题图。**

### 步骤 1：复制模板并替换框架名称

```bash
# Light-UI 模板
cp "designs/sources/Light-UI-模板.pen" "designs/Topic-{主题名}-{timestamp}.pen"
# Dark-UI 模板
cp "designs/sources/Dark-UI-模板.pen" "designs/Topic-{主题名}-{timestamp}.pen"
```

模板中的示例名称（如【春节】、【清明节】等）需要替换为新主题名：
| 节点 ID | 需改为 |
|---------|--------|
| `5puUK` | 【{主题名}】页眉设计 |
| `dKOHu` | 【{主题名}】工作台设计 |
| `nXv3Y` | 【{主题名}】登录页 |

**注意**：不同模板的默认名称可能不同（春节、清明节等），替换时需先检查模板中实际使用的名称。

### 步骤 2：用 update-pen-theme.py 更新颜色变量

```bash
python3 scripts/update-pen-theme.py {nameEn}
```

### 步骤 3：清理硬编码色值

**update-pen-theme.py 只更新变量，不会清理节点中硬编码的旧色值。必须手动检查并清理。**

```bash
# 检查残留硬编码色值
python3 -c "
import json
with open('designs/Topic-{主题名}-{timestamp}.pen') as f:
    content = f.read()
for color in ['#a7160b', '#94170e', '#fdd0a3', '#C41B00', '#c41a00', '#DCB496', '#FFE4CF']:
    count = content.count(color)
    if count > 0:
        print(f'  ⚠️ {color}: {count} occurrences')
"
```

需要清理的常见硬编码色值（Dark-UI）：
| 旧色值 | 替换为 | 说明 |
|--------|--------|------|
| `#a7160b` | `$primary-color` | 旧红色按钮 |
| `#94170e` | `$alter-color` | 旧红色按钮深色 |
| `#C41B00` / `#c41a00` | `$alter-color` | 旧红色强调 |
| `#fdd0a3` | `$primary-color-hover` | 旧暖色 hover |
| `#c41a0000` | `{primary}00` | 渐变组件终止色（带透明度） |
| `#DCB496` | `$header-font-color` | 旧暖色图标 |
| `#FFE4CF` | `$header-font-color` | 旧暖色文字 |
| `#FBFCF2` | `$sidebar-panel-bg` | 旧浅色侧边栏背景 |
| `#FDFFF6` | `$login-bg-color` | 旧浅色登录背景 |

**渐变组件 `Ckc3l`（左渐变）和 `XQPAz`（右渐变）的终止色必须从旧色值改为 `{primary}00`（主题色+全透明）。**

### 步骤 4：用 Pencil MCP 插入背景图

**Dark-UI 模板：**
```javascript
pencil_batch_design({
  filePath: "designs/Topic-{主题名}-{timestamp}.pen",
  operations: [
    U("02cTp", { fill: { type: "image", url: "/Users/.../designs/{nameEn}-bg.png", enabled: true, mode: "fill" } }),
    U("CIokf/02cTp", { fill: { type: "image", url: "/Users/.../designs/{nameEn}-bg.png", enabled: true, mode: "fill" } })
  ]
})
```

> **⚠️ 背景图 URL 必须使用绝对路径**（如 `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/designs/{nameEn}-bg.png`），相对路径会导致图片一闪消失。

**Light-UI 模板：**
```javascript
pencil_batch_design({
  filePath: "designs/Topic-{主题名}-{timestamp}.pen",
  operations: [
    U("qSBnY", { fill: { url: "/Users/.../designs/{nameEn}-bg.png" } }),
    U("Nk9d0", { fill: { url: "/Users/.../designs/{nameEn}-bg.png" } })
  ]
})
```

> **⚠️ 背景图 URL 必须使用绝对路径**（如 `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/designs/{nameEn}-bg.png`），相对路径会导致图片一闪消失。

### 步骤 5：打开 Pen 文件给用户确认

**这是整个流程中唯一需要暂停等待用户确认的步骤。**

完成以上所有步骤后（颜色变量✅ + 硬编码清理✅ + 渐变组件✅ + 背景图✅），用 Pencil 打开 Pen 文件：

```javascript
pencil_open_document({ filePathOrTemplate: "designs/Topic-{主题名}-{timestamp}.pen" })
```

**打开的 Pen 文件必须是已完成全部主题变更的完整状态：**
- ✅ 背景图已插入且正常显示（登录页、工作台、页眉都能看到新主题图）
- ✅ 颜色变量已替换为新主题色
- ✅ 硬编码旧色值已清理
- ✅ 渐变组件色值已更新
- ✅ 框架名称已替换为主题名

**⚠️ 用户确认 Pen 文件效果满意后，才能进入阶段 3（切图导出）。如果用户指出问题，立即修复后重新打开确认。**

---

## 🔴 阶段 3：Pencil 切图导出

**输入**：Pen 设计文件
**输出**：`output/{date}-{nameEn}/素材包/`

### ⭐ 导出命令必须用 `scale: 1`（不能用 scale: 2！）

### Light-UI 节点 ID 对照表：

| 切图类型 | 节点 ID（必须用这个！） | 尺寸 | 格式 | 用途 |
|---------|----------------------|------|------|------|
| 登录页背景 V | `LiN3g` | 2215×1080 | jpg | bg-login.jpg（登录包） |
| 登录页整体 | `nXv3Y` | 2215×1080 | jpg | login_thumb.jpg（缩略图） |
| 工作台整体 | `dKOHu` | 1920×1079 | png | desktop.png、MK缩略图 |
| 横幅页眉 | `Nk9d0` | 2560×480（需裁剪 y+30） | png | header-banner.png |
| 默认页眉(60px) | `A7bgM` | 1920×60 | png | header_tlayout_frame_bg.png |
| 复杂页眉(90px) | `TdfhH` | 1920×90 | png | header_complex_frame_bg.png |
| 菜单页眉(130px) | `C0kVM` | 1920×130 | png | header_menu_frame_bg.png |
| 侧边页眉 | `jTA4O` | 200×900 | png | header-sideheader.png |

### Dark-UI 节点 ID 对照表：

| 切图类型 | 节点 ID（必须用这个！） | 尺寸 | 格式 | 用途 |
|---------|----------------------|------|------|------|
| 登录页背景 V | `PAgAA` | 2215×1080 | jpg | bg-login.jpg（登录包） |
| 登录页整体 | `nXv3Y` | 2215×1080 | jpg | login_thumb.jpg（缩略图） |
| 工作台整体 | `dKOHu` | 1920×1079 | png | desktop.png、MK缩略图 |
| 横幅页眉 | `K7n6g` | 2560×480（需裁剪 y+30） | png | header-banner.png |
| 默认页眉(60px) | `y6LPs` | 1920×60 | png | header_tlayout_frame_bg.png |
| 复杂页眉(90px) | `CagmA` | 1920×90 | png | header_complex_frame_bg.png |
| 菜单页眉(130px) | `KDpQp` | 1920×130 | png | header_menu_frame_bg.png |
| 侧边页眉 | `zmpSH` | 200×488 | png | header-sideheader.png |

### 导出步骤：

**1. 创建输出目录：**
```bash
DATE=$(date +%Y%m%d)
mkdir -p "output/${DATE}-{nameEn}/素材包/login_bg"
mkdir -p "output/${DATE}-{nameEn}/输出包"
```

**2. 导出 PNG 切图（Light-UI 示例）：**
```javascript
pencil_export_nodes({
  filePath: "designs/Topic-{主题名}-{timestamp}.pen",
  nodeIds: ["A7bgM", "TdfhH", "C0kVM", "Nk9d0", "jTA4O", "dKOHu"],
  outputDir: "output/{date}-{nameEn}/素材包",
  format: "png",
  scale: 1
})
```

**3. 导出 JPG 切图：**
```javascript
pencil_export_nodes({
  filePath: "designs/Topic-{主题名}-{timestamp}.pen",
  nodeIds: ["LiN3g", "nXv3Y"],
  outputDir: "output/{date}-{nameEn}/素材包",
  format: "jpeg",
  scale: 1
})
```

**4. 裁剪并整理（ImageMagick convert）：**
```bash
cd "output/{date}-{nameEn}/素材包"

# 页眉背景（直接复制）
cp A7bgM.png header_tlayout_frame_bg.png
cp TdfhH.png header_complex_frame_bg.png
cp C0kVM.png header_menu_frame_bg.png
cp jTA4O.png header-sideheader.png
cp jTA4O.png header_single_menu_frame_bg.png

# 横幅页眉（需裁剪 y+30）
convert Nk9d0.png -crop 2560x480+0+30 +repage header-banner.png

# 登录包图片
cp LiN3g.jpeg bg-login.jpg
convert bg-login.jpg -crop 1920x1080+147+0 +repage background.png
convert nXv3Y.jpeg -resize 960x540\! login_thumb.jpg

# thumb-1 和 thumb-2
convert bg-login.jpg -crop 800x390+0+345 +repage login-bg-thumb1.jpg
convert bg-login.jpg -crop 800x390+800+345 +repage login-bg-thumb2.jpg
mv login-bg-thumb1.jpg login_bg/thumb-1.jpg
mv login-bg-thumb2.jpg login_bg/thumb-2.jpg

# MK 主题缩略图
convert dKOHu.png -resize 1440x800\! desktop.png
convert dKOHu.png -resize 1600x572\! layout-banner.jpg
convert dKOHu.png -resize 1600x572\! fullscreen-sideheader.jpg
convert dKOHu.png -resize 1600x572\! fullscreen-sidenav.jpg
convert dKOHu.png -resize 1600x572\! center-sidenav.jpg

# 清理原始导出文件
rm -f LiN3g.jpeg nXv3Y.jpeg A7bgM.png TdfhH.png C0kVM.png Nk9d0.png jTA4O.png dKOHu.png login-bg-thumb1.jpg login-bg-thumb2.jpg
```

### 🛑 [PHASE LOCK] 阶段 3 验证清单

**必须逐项验证文件尺寸：**
```bash
# 验证所有文件尺寸
sips -g pixelWidth -g pixelHeight "output/{date}-{nameEn}/素材包/"*.png "output/{date}-{nameEn}/素材包/"*.jpg
```

**预期尺寸清单：
- bg-login.jpg: 2215×1080
- background.png: 1920×1080
- login_thumb.jpg: 960×540
- header-banner.png: 2560×480
- header_tlayout_frame_bg.png: 1920×60
- header_complex_frame_bg.png: 1920×90
- header_menu_frame_bg.png: 1920×130
- header-sideheader.png: 200×900
- login_bg/thumb-1.jpg: 800×390
- login_bg/thumb-2.jpg: 800×390
- desktop.png: 1440×800
- layout-banner.jpg: 1600×572

**尺寸验证不通过必须重新导出，不能进入阶段 4。**

**报告给用户并等待确认后，才能进入阶段 4。**

---

## 🔴 阶段 4：批量打包

**输入**：`colors/{nameEn}.json` + `output/{date}-{nameEn}/素材包/` 切图
**输出**：`output/{date}-{nameEn}/输出包/*.zip`（15个zip包）

### 步骤：

**1. 创建构建配置 YAML：**

在 `output/{date}-{nameEn}/素材包/` 下创建 `theme-build-request.yaml`：
```yaml
title: "{主题名}"
subtitle: "{副标题}"
buttonText: "立即进入"
themeColor: "{primary色值}"
products:
  - mk
  - ekp_v12
  - ekp_v13_5
  - ekp_v14_16
  - ekp_v17
images:
  headerBanner: "header-banner.png"
  headerClassic: "header_complex_frame_bg.png"
  headerSimple: "header_tlayout_frame_bg.png"
  headerTabs: "header_tlayout_frame_bg.png"
  headerIcon: "header_tlayout_frame_bg.png"
  headerSideheader: "header-sideheader.png"
  loginBackground: "bg-login.jpg"
  loginLogo: ""
```

**2. 执行打包：**
```bash
python3 theme_builder.py --config "output/{date}-{nameEn}/素材包/theme-build-request.yaml" --output "output/{date}-{nameEn}/输出包"
```

> **⚠️ `theme_builder.py` 自动处理的图片替换**（无需手动配置）：
> - `login_thumb.jpg` — 从 `loginBackground` 自动生成缩略图替换
> - `login_bg/thumb-1.jpg`、`login_bg/thumb-2.jpg` — 从 `loginBackground` 自动裁剪替换
> - `images/bg_login_iframe.png` — V12 登录包 iframe 背景自动替换

**3. 验证打包结果：**
```bash
python3 scripts/verify-build.py "output/{date}-{nameEn}/输出包"
# 应该输出: Results: 15 passed, 0 failed (of 15)
#           ✅ ALL CHECKS PASSED
```

### 🛑 [PHASE LOCK] 阶段 4 验证清单

- [ ] 15 个主题包全部生成成功（MK×2 + V12×2 + V13_5×4 + V14_16×5 + V17×2）
- [ ] verify-build.py 输出 ALL CHECKS PASSED
- [ ] 无错误报告

**全部验证通过后，流程完成。向用户报告最终结果。**

---

## 快速命令

```bash
# 1. 更新 Pen 文件颜色和图片
python3 scripts/update-pen-theme.py --pen designs/Topic-{name}.pen --colors colors/{nameEn}.json

# 2. 执行打包（生成15个zip）
python3 theme_builder.py --config "output/{date}-{nameEn}/素材包/theme-build-request.yaml" --output "output/{date}-{nameEn}/输出包"

# 3. 验证打包结果
python3 scripts/verify-build.py "output/{date}-{nameEn}/输出包"
```

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
primaryOpacity10 = blendWhite(primary, 0.1)  // 10% 透明度
primaryOpacity20 = blendWhite(primary, 0.2)  // 20% 透明度
primaryOpacity30 = blendWhite(primary, 0.3)  // 30% 透明度
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

## MK 主题包缩略图格式

MK 主题包的缩略图文件名格式为：
```
layout-banner.{nameEn}.simple.desktop.jpg
fullscreen-sideheader.{nameEn}.simple.desktop.jpg
fullscreen-sidenav.{nameEn}.simple.desktop.jpg
center-sidenav.{nameEn}.simple.desktop.jpg
```

其中 `{nameEn}` 使用 `nameEn` 字段值（如 `西瓜丰收了-zhuti-mk`）。

---

## 文件结构

```text
Topic Automation/
├── SKILL.md                        # 本文件（AI 辅助时使用）
├── theme_builder.py                # 统一打包工具（生成15个zip包）
├── workflows/                      # 📋 工作流程
│   ├── 00-端到端流程.md
│   ├── 01-新建主题流程.md
│   ├── 02-设计确认流程.md
│   ├── 03-导出素材流程.md
│   └── 04-批量打包流程.md
├── rules/                          # 📐 技术规则（⭐ MUST READ EVERY TIME）
│   ├── dark-ui-color-rules.md
│   ├── light-ui-color-rules.md
│   ├── image-generation-rules.md
│   └── export-rules.md
├── scripts/                        # 🤖 自动化脚本
│   ├── update-pen-theme.py         # Pen 文件颜色/图片更新
│   ├── verify-build.py             # 构建结果验证（15 zip 结构+颜色检查）
│   ├── verify-theme.mjs            # 主题完整性验证（旧工具链）
│   └── generate-manifest.mjs       # manifest 生成（旧工具链）
├── colors/                         # 🎨 配色方案
├── designs/
│   ├── sources/                    # 🎨 模板文件
│   │   ├── Light-UI-模板.pen
│   │   └── Dark-UI-模板.pen
│   └── Topic-*.pen                # 生成的主题文件
├── assets/references/samples/
│   └── 主题样例包/                  # 主题包模板（symlink to 样例包）
└── output/                         # 📦 输出
    ├── 20260410-{nameEn}/
    │   ├── 素材包/                  # 图片素材（阶段 3 输出）
    │   │   ├── bg-login.jpg
    │   │   ├── header-banner.png
    │   │   ├── theme-build-request.yaml
    │   │   └── ...
    │   └── 输出包/                  # .zip 主题包（阶段 4 输出，15个zip）
    └── history/                    # 旧版本归档
```

---

## 规则文档索引

| 文档 | 用途 | 关键约束 |
|------|------|---------|
| [rules/dark-ui-color-rules.md](rules/dark-ui-color-rules.md) | Dark-UI 配色规则 | 色调偏移、亮度排序、sidebar-panel-bg=header-font |
| [rules/light-ui-color-rules.md](rules/light-ui-color-rules.md) | Light-UI 配色规则 | 白色混合透明度、亮度排序 |
| [rules/image-generation-rules.md](rules/image-generation-rules.md) | MiniMax API 调用 | base64 格式、禁止 prompt_optimizer |
| [rules/export-rules.md](rules/export-rules.md) | 切图导出、节点 ID | 尺寸/命名/格式必须100%一致 |

---

## 版本历史

- **v7.1 (2026-04-10)** - 🔄 **流程确认点优化**：阶段 2 新增完整的硬编码色值清理步骤（渐变组件、旧红色系）和背景图插入步骤；明确整个流程中**只有阶段 2 完成后需要暂停给用户确认 Pen 文件效果**，其他阶段连续执行；阶段 1 验证改为自查后直接继续；模板名称替换增加注意事项（不同模板默认名不同）
- **v7.0 (2026-04-10)** - 🔄 **Python 工具链全面替代**：5阶段→4阶段，13包→15包，`run-updater.mjs`→`theme_builder.py`，新增 `verify-build.py` 验证脚本，更新文件结构，统一 `主题样例包` 路径
- **v6.0 (2026-04-09)** - 🔒 **强制阶段锁定机制**：每个阶段末尾添加 [PHASE LOCK] 验证清单，验证不通过禁止进入下一阶段；新增会话初始化指令；修复文件结构重复内容
- **v5.3 (2026-04-09)** - 📂 **重构 output 目录结构**：改为 `date-{name}/输出包/` + `date-{name}/素材包/`，移除 themes/history/latest 子目录；generate-manifest.mjs 自动带日期前缀
- **v5.2 (2026-04-09)** - 🔴 **补充 nXv3Y/dKOHu 节点**：登录页整体截图 nXv3Y → login_thumb.jpg，工作台整体截图 dKOHu → desktop.png 及 MK 缩略图；修正"禁止事项"中错误表述（之前错误地说 dKOHu/nXv3Y 不是正确节点）；新增完整裁剪命令覆盖所有输出文件
- **v5.1 (2026-04-09)** - 🔴 **新增阶段 2.5（背景图必须插入 Pen 文件）**：明确禁止跳过背景图插入步骤，添加 `pencil_batch_design` 替换命令；修正阶段 3 导出节点 ID 表和 `scale: 1` 强制要求；更新 workflow 文档导出命令
- **v5.0 (2026-04-09)** - 🔴 **规则强制执行**：添加逐阶段强制检查点，禁止跳步，强调 rules/ 为最高权威
