# OpenCode 本地初始化指令（仅供另一台机器使用）

> ⚠️ 此文件只应保留占位符，不应写入真实 API Key。
> 用法：把这整个文件内容发给另一台机器上的 OpenCode，让它按步骤自动执行。

---

你现在在 Theme Studio 项目里，请严格按下面步骤执行，让当前项目在这台机器上达到和我主机一样的可用状态。

## 一、项目与目标

这是 Theme Studio（Topic Automation）项目。
目标是：
- 正常启动 Web 应用
- 正常使用当前模型和 key
- 能在浏览器里对话生成主题
- 能使用本地导出桥接

当前产品主链：
- Web 工作台
- HTML 预览
- Playwright 截图
- theme_builder.py 打包

不要走旧的 Pencil / `.pen` CLI 主流程。

---

## 二、先做环境准备

在项目根目录执行：

```bash
npm install
cd web && npm install && cd ..
```

---

## 三、创建环境变量文件

### 1. 根目录 `.env`

创建或覆盖根目录 `.env` 为以下内容：

```env
MINIMAX_API_KEY={替换为你的 MiniMax Key}
```

### 2. `web/.env`

创建或覆盖 `web/.env` 为以下内容：

```env
VITE_DASHSCOPE_API_KEY={替换为你的 DashScope Coding Plan Key}
VITE_MINIMAX_API_KEY={替换为你的 MiniMax Key}
```

---

## 四、启动服务

### 1. 启动 Web 应用

```bash
cd web
npm run dev
```

### 2. 如果需要导出功能，再开一个终端启动本地桥接

```bash
cd web
npm run export-bridge
```

---

## 五、启动后检查

在浏览器打开 Vite 输出的地址（通常是 `http://localhost:5173`）。

进入后检查：
- 页面能正常打开
- 不要直接打开本地 `index.html`
- 设置里不需要重新手填 key（因为 `.env` 已配置）
- 对话发送后不应该报“未配置 API Key”

---

## 六、如果还不能正常用，请继续检查

### 1. 检查依赖是否完整

```bash
npm install
cd web && npm install && cd ..
```

### 2. 检查环境文件是否真的写入成功

```bash
cat .env
cat web/.env
```

### 3. 重启 Vite

先 Ctrl+C 停掉，再重新执行：

```bash
cd web
npm run dev
```

### 4. 如需导出，再单独启动桥接

```bash
cd web
npm run export-bridge
```

---

## 七、额外说明

- 当前项目主入口是 `web/`
- 根目录主要用于测试、脚本和打包链路
- 当前推荐启动方式只有：
  - `cd web && npm run dev`
- 当前推荐导出方式：
  - Web 界面点击“打包”
  - 如需本地导出桥接，执行 `cd web && npm run export-bridge`

---

## 八、执行完成后，请回报

请告诉我以下结果：

1. Web 页面是否能打开
2. 对话是否能正常发送
3. 是否还有 401 / 超时 / localhost 无法访问
4. 如果失败，把终端报错原样贴给我
