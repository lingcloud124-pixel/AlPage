# 模型接入说明

本文档用于明确 Theme Studio 当前的两种模型接入语义，避免把“产品标准能力”和“开发测试特殊接法”混为一谈。

---

## 一、两种接入方式

### 1. 产品标准接入（正式能力）

Theme Studio 产品本身支持用户在设置界面填写模型配置：

- 聊天模型：
  - `apiEndpoint`
  - `apiKey`
  - `model`
- 图像模型：
  - `imageApiEndpoint`
  - `imageApiKey`
  - `imageModel`

这意味着产品设计上支持用户接入自己的模型服务，不绑定某一家供应商。

相关代码：
- `web/src/ui-setup.ts`
- `web/src/types.ts`

---

### 2. 开发测试接入（当前默认环境）

为了让当前研发/测试环境稳定跑通，项目默认使用的是一套特殊配置：

- 聊天模型：DashScope Coding Plan
- 图像模型：MiniMax Token Plan

实际默认连接并不是直接让浏览器访问公网地址，而是走 Vite 代理：

- `/api/chat` → `coding.dashscope.aliyuncs.com`
- `/api/image` → `47.100.184.181`，并附带 `Host: api.minimaxi.com`

相关代码：
- `web/src/agent/chat-client.ts`
- `web/vite.config.ts`

---

## 二、当前默认配置（开发测试）

### 1. Web 工作台

`web/.env`

```env
VITE_DASHSCOPE_API_KEY={替换为你的 DashScope Coding Plan Key}
VITE_MINIMAX_API_KEY={替换为你的 MiniMax Key}
```

说明：
- `VITE_DASHSCOPE_API_KEY`：聊天模型使用
- `VITE_MINIMAX_API_KEY`：图像模型使用
- Web 工作台运行时主要依赖这个文件

### 2. 根目录脚本 / 打包链路

根目录 `.env`

```env
MINIMAX_API_KEY={替换为你的 MiniMax Key}
```

说明：
- 主要给 `theme_builder.py`、脚本链路、历史工具链/打包链路使用
- 如果只跑 Web 工作台，不一定必须使用这个文件

---

## 三、为什么“按标准方式填写”经常配不成功

原因不是产品不支持标准接入，而是：

1. 当前研发测试默认跑的是 Coding Plan / MiniMax Token Plan
2. 代码中已经写死了开发测试代理逻辑（`/api/chat`、`/api/image`）
3. 如果把它理解成“普通标准 endpoint 直连”，就容易填错配置或误判问题来源

因此：

- **讲产品能力** → 讲“标准模型接入”
- **讲当前本地开发/测试怎么跑通** → 讲“Coding Plan 特殊接法”

---

## 四、对外说明建议

### 对用户/产品文档

应该写：

> 系统支持用户填写模型地址、API Key 和模型名，自定义接入聊天模型与图像模型。

### 对开发者/测试环境文档

应该写：

> 当前开发测试阶段默认使用 DashScope Coding Plan 与 MiniMax Token Plan，并通过 `vite.config.ts` 中的代理配置进行转发。该方案是研发环境特殊接法，不等同于产品正式标准接入说明。

---

## 五、关键代码位置

- `web/src/ui-setup.ts`
  - 设置界面字段加载/保存
- `web/src/types.ts`
  - `AISettings` 类型定义
- `web/src/agent/chat-client.ts`
  - 默认 endpoint、默认 model、环境变量读取、请求发送
- `web/vite.config.ts`
  - `/api/chat`、`/api/image` 代理逻辑
