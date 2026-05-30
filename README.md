# 主题自动化项目

## 快速开始

### 0. 克隆到新电脑后（首次运行）

```bash
# 安装依赖
npm install
cd web && npm install && cd ..
cd server && npm install && cd ..

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
# 启动前端
cd web
npm run dev

# 启动后端（另一个终端）
cd server
npm run dev
```

### 3. 使用方式

告诉 OpenCode：
```
这是主题自动化项目，我需要生成一个新门户
```

---

## 项目结构

```
AlPage/
├── README.md             # 项目说明文档
├── docs/                 # 项目文档
├── scripts/              # 辅助脚本
├── config/               # 配置即数据层（JSON）
├── web/                  # Theme Studio Web 前端（当前主线）
│   ├── src/              # HTML/CSS/TS 源码
│   ├── scripts/          # 截图、构建
│   └── package.json
├── server/               # Theme Studio 服务端（Express + SQLite）
│   ├── src/              # TypeScript 源码
│   ├── admin/            # 管理后台页面
│   └── package.json
├── archive/              # 历史工具链与规则（仅供参考）
├── colors/               # 配色方案库
│   └── *.json            # 配色方案
└── designs/              # 设计参考
    └── sources/
        ├── Light-UI-模板.pen  # 设计参考模板（勿修改）
        └── Dark-UI-模板.pen   # 设计参考模板（勿修改）
```

---

## 常见问题

**Q: OpenCode 不认识这个项目怎么办**
A: 告诉它："这是主题自动化项目，用 npm install 安装依赖"

**Q: Skill 不生效**
A: 运行 `bash scripts/install-skill.sh`，然后重启 OpenCode

**Q: 克隆到其他电脑后没有 API 密钥**
A: `.env` 文件被 git 忽略。正确步骤：
1. `npm install && cd web && npm install && cd ..`
2. `cp .env.example .env` 并设置 `ADMIN_PASSWORD`
3. 启动前端和后端服务
4. 启动后访问 `/admin`，在页面中配置模型 API Key、Endpoint 和 Model Name
