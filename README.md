# 主题自动化项目

## 快速开始

### 0. 克隆到新电脑后（首次运行）

```bash
# 安装依赖
npm install
cd web && npm install
cd ..

# 配置服务器环境变量（.env 文件不会被 git 追踪，需自行创建）
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD（后台管理口令）

# 启动后访问 /admin 页面配置模型（API Key、Endpoint、Model）
```

### 1. 安装 Skill（可选，用于 AI 辅助）
```bash
bash scripts/install-skill.sh
```
安装后重启 OpenCode，Skill 自动生效。

### 2. 启动 Web 应用

```bash
cd web
npm run dev
```

如需本地导出桥接：

```bash
cd web
npm run export-bridge
```

### 3. 使用方式

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
│   ├── theme_builder.py  # 统一打包工具（按产品生成主题+登录zip包）
│   ├── update-pen-theme.py # 历史 pen 文件更新器（非当前主链路）
│   ├── verify-build.py   # 打包后验证工具
│   └── ...               # 其他历史脚本/辅助脚本
├── web/                  # Theme Studio Web 应用（当前主线）
│   ├── src/              # HTML/CSS/TS 源码
│   ├── scripts/          # 截图、构建、导出桥接
│   └── package.json
├── src/                  # 根目录 TypeScript 工具链（仍在维护）
├── colors/               # 配色方案库
│   └── *.json           # 配色方案
├── designs/
│   ├── sources/
│   │   ├── Light-UI-模板.pen  # 设计参考模板（勿修改）
│   │   └── Dark-UI-模板.pen   # 设计参考模板（勿修改）
│   └── Topic-*.pen       # 历史/参考产物（非当前主链路）
├── assets/
│   └── references/samples/主题样例包/  # 主题包模板（symlink to 样例包）
└── output/               # 根目录脚本默认输出目录（Web 导出推荐使用用户自配目录）
```

## 主题包模板支持

| 类型 | 版本 | 说明 |
|------|------|------|
| 主体 | MK, V14, V15, V16, V17 | 完整主体样式包 |
| 登录 | MK, V14, V15, V16, V17 | 登录页样式包 |

**注意**: 当前系统支持生成 MK、EKP V14、V15、V16、V17 各自独立的主题包和登录包。默认全选时共生成 10 个 zip 包。EKP V12、V13、V13.5 已不再支持打包。

---

## 常见问题

**Q: OpenCode 不认识这个项目怎么办**
A: 告诉它："这是主题自动化项目，用 npm install 安装依赖"

**Q: Skill 不生效**
A: 运行 `bash scripts/install-skill.sh`，然后重启 OpenCode

**Q: 如何使用主题打包功能**
A: Web 应用里点击“打包”，先勾选产品，再由统一导出链在后台执行：
1. 固定当前项目快照
2. 基于背景图生成登录背景、登录缩略图、页眉和左导航素材
3. 基于确认后的 HTML 预览截图生成 `desktop.png`、`layout-banner.jpg`、`thumb.jpg`、`banner_personal.png`、`study_banner.png` 等封面图
4. 调用 `theme_builder.py` 标准打包并验证
手动方式仍可使用 `python3 theme_builder.py --config theme-build-request.yaml`，但 Web 主链的素材准备入口是 `scripts/prepare_export_assets.py`。

**Q: 能不能跳过前台按钮，直接检查打包内容是否正确**
A: 可以，根目录直接运行下面两条命令即可：
1. 直接打包并校验：`npm run export:check -- "清明主题" qingming '#2C615C' light-ui /绝对路径/bg.jpg mk,ekp_v14,ekp_v15,ekp_v16,ekp_v17`
2. 只校验已有输出包：`npm run export:verify -- output/20260423-qingming/输出包 --products mk,ekp_v14,ekp_v15,ekp_v16,ekp_v17`

`export:check` 会依次执行项目快照固定、素材准备、截图、`theme_builder.py` 打包、`verify-build.py` 校验。
如果主色以 `#` 开头，命令里要像示例那样加引号，避免被 shell 当成注释。

**Q: manifest.json 配置文件需要手动编辑吗**
A: 当前 Web 主链路不依赖手动编辑 `manifest.json`。该文件主要属于历史工具链参考范围，现行主链路以项目快照 + `scripts/prepare_export_assets.py` + `theme_builder.py` 打包为准。

**Q: 批量打包失败 "Unable to determine theme type"**
A: 这是旧 TypeScript 工具链的 bug。新的 `theme_builder.py` 已正确处理主题类型检测，不会出现此问题。

**Q: 如何查看生成的主题包**
A: Web 导出路径以后台 `/admin` 中配置的导出根目录为准，前台已不再提供单独的配置入口。导出结果位于：`projects/{projectId}-{nameEn}/exports/{timestamp}/输出包/`。根目录脚本默认仍可输出到项目内 `output/`。

**Q: 克隆到其他电脑后没有 API 密钥**
A: `.env` 文件被 git 忽略。正确步骤：
1. `npm install && cd web && npm install && cd ..`
2. `cp .env.example .env` 并设置 `ADMIN_PASSWORD`
3. `cd web && npm run dev`（**不是**直接打开 `index.html`）
4. 启动后访问 `/admin`，在页面中配置模型 API Key、Endpoint 和 Model Name
