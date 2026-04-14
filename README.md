# 主题自动化项目

## 快速开始

### 1. 安装依赖
```bash
npm install
cd web && npm install
```

### 2. 安装 Skill（可选，用于 AI 辅助）
```bash
bash scripts/install-skill.sh
```
安装后重启 OpenCode，Skill 自动生效。

### 3. 启动 Web 应用

```bash
cd web
npm run dev
```

如需本地导出桥接：

```bash
cd web
npm run export-bridge
```

### 4. 使用方式

**方式一：AI 辅助（推荐）**
告诉 OpenCode：
```
这是主题自动化项目，我需要生成一个新主题
```

**方式二：标准脚本打包**
```bash
python3 theme_builder.py --config theme-build-request.yaml
```

---

## 项目结构

```
Topic Automation/
├── SKILL.md              # Skill 文档（AI 辅助时使用）
├── README.md             # 项目说明文档
├── scripts/
│   ├── install-skill.sh  # Skill 安装脚本
│   ├── theme_builder.py  # 统一打包工具（生成15个zip包）
│   ├── update-pen-theme.py # pen文件颜色/图片更新器
│   ├── verify-build.py   # 打包后验证工具
│   └── run-updater.mjs   # 批量更新脚本（已弃用）
├── web/                  # Theme Studio Web 应用（当前主线）
│   ├── src/              # HTML/CSS/TS 源码
│   ├── scripts/          # 截图、构建、导出桥接
│   └── package.json
├── src/                  # 根目录 TypeScript 工具链（仍在维护）
├── colors/               # 配色方案库
│   └── *.json           # 配色方案
├── designs/
│   ├── sources/
│   │   ├── Light-UI-模板.pen  # 设计模板（勿修改）
│   │   └── Dark-UI-模板.pen   # Dark 模板（实验性）
│   └── Topic-*.pen       # 生成的主题文件
├── assets/
│   └── references/samples/主题样例包/  # 主题包模板（symlink to 样例包）
└── output/               # 根目录脚本默认输出目录（Web 导出推荐使用用户自配目录）
```

## 主题包模板支持

| 类型 | 版本 | 说明 |
|------|------|------|
| 主体 | MK, V12, V13, V13.5, V14, V15, V16, V17 | 完整主体样式包 |
| 登录 | MK, V12, V13, V13.5, V14, V15, V16, V17 | 登录页样式包 |

**注意**: 系统生成15个zip包：MK(主题+登录), V12(主题+登录), V13〜V13.5(主题+V13登录+V13.5登录+V13_5登录变体), V14〜V16(主题+V14登录+V15登录+V16登录), V17(主题+登录)。

---

## 常见问题

**Q: OpenCode 不认识这个项目怎么办**
A: 告诉它："这是主题自动化项目，用 npm install 安装依赖"

**Q: Skill 不生效**
A: 运行 `bash scripts/install-skill.sh`，然后重启 OpenCode

**Q: 如何使用主题打包功能**
A: Web 应用里点击“打包”，先勾选产品，再由本地导出桥接在后台执行截图和标准脚本打包。手动方式仍可使用 `python3 theme_builder.py --config theme-build-request.yaml`。

**Q: manifest.json 配置文件需要手动编辑吗**
A: 不需要。`manifest.json` 现在由 `theme_builder.py` 自动生成，无需手动编辑。

**Q: 批量打包失败 "Unable to determine theme type"**
A: 这是旧 TypeScript 工具链的 bug。新的 `theme_builder.py` 已正确处理主题类型检测，不会出现此问题。

**Q: 如何查看生成的主题包**
A: Web 导出默认输出到你在设置中配置的导出根目录下：`projects/{projectId}-{nameEn}/exports/{timestamp}/输出包/`。根目录脚本默认仍可输出到项目内 `output/`。
