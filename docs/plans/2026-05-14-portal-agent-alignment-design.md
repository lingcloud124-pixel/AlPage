# Portal Agent Alignment Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Theme Studio 的产品口径、交接文档和运行中 Agent 提示词统一到 “Portal Agent 为售前生成门户方案”。

**Architecture:** 先用一份统一设计把产品定义、输入模型、主链路和差距分析收敛，再同步到产品文档、交接入口和运行时 system prompt。运行时提示词不伪装尚未落地的能力，只把视觉主题生成明确降级为门户生成中的一个子步骤。

**Tech Stack:** Markdown, TypeScript, 现有 Theme Studio Agent tool calling

---

### Task 1: 固化统一定义

**Files:**
- Modify: `docs/internal/PRODUCT-ALIGNMENT.md`
- Modify: `docs/internal/PRODUCT.md`
- Modify: `docs/PRD-产品使用流程.md`
- Modify: `docs/internal/workflows/00-端到端流程.md`

**Step 1: 写入统一产品定义**

- 产品使用者：售前人员
- Agent 目标：生成门户，不是只生成主题
- 门户结果：视觉主题 + 工作区结构 + 行业/企业适配示例内容
- 主链路：对话输入/上传资料 -> 补齐客户信息 -> 摘要确认 -> 生成门户 -> 迭代 -> 全屏查看 -> 保存/分享/再次编辑

**Step 2: 写入生成前门槛**

- 必备字段：
  - 客户名称
  - 客户行业
  - 客户核心职能/业务特征
  - 本次门户用途
  - 希望突出哪些卡片或信息
  - 品牌/视觉倾向
- 收集方式：
  - 对话提问
  - 选项选择
  - 一次性补充表单
  - 上传图片/Word/PDF 等资料辅助理解

**Step 3: 更新差距分析**

- 当前最大差距不是“图不够好”，而是：
  - Agent 仍偏 Theme Agent
  - 缺少客户信息完成度门槛
  - 缺少摘要确认
  - 缺少按客户信息动态生成工作区结构和示例内容
  - 全屏/分享/结果心智未闭环

**Step 4: 手工检查文档口径一致**

确认 4 份文档都使用同一套术语：
- `Portal Agent`
- `售前人员`
- `客户信息`
- `门户`
- `摘要确认`

### Task 2: 更新交接入口

**Files:**
- Modify: `PROJECT.md`
- Modify: `docs/README.md`
- Modify: `docs/internal/AGENTS.md`
- Modify: `docs/internal/SKILL.md`

**Step 1: 更新后续接手入口**

- 所有入口先指向 `docs/internal/PRODUCT-ALIGNMENT.md`
- 强调讨论产品目标时必须使用 Portal Agent 口径

**Step 2: 在 AGENTS/SKILL 中加入覆盖规则**

- 旧的 Theme Agent 说明保留历史背景
- 新增 2026-05-14 覆盖规则：
  - 当前目标是售前门户方案生成
  - 视觉主题生成只是门户生成子能力
  - 当前实现未完成的能力不能伪装成已落地

**Step 3: 手工检查历史术语冲突**

重点检查：
- “主题生成工具”
- “主题视觉总监”
- “主题包主链路”

### Task 3: 修正运行时 Agent 提示词

**Files:**
- Modify: `web/src/agent/system-prompt.ts`

**Step 1: 改写角色定义**

- 角色从 `OA 主题设计师` 改成 `Portal Agent / 售前门户方案顾问`
- 明确服务对象是售前，不是单一企业内部用户

**Step 2: 改写前置工作流**

- 先判断 6 项客户信息是否足够
- 不足时继续追问
- 允许结合上传资料
- 信息足够后先输出摘要确认
- 摘要确认后才调用生成工具

**Step 3: 对齐当前能力边界**

- 说明当前自动工具主要负责视觉主题生成与配色应用
- 门户结构与卡片内容是目标能力，当前阶段先作为门户方案理解的一部分，不得虚构已自动落地的系统动作

**Step 4: 验证 TypeScript 诊断**

Run: 使用 IDE diagnostics 检查 `web/src/agent/system-prompt.ts`
Expected: 无新增语法或类型错误

### Task 4: 最终核对

**Files:**
- Check: 上述全部已改文件

**Step 1: 检查关键词**

确认核心文档已出现：
- `Portal Agent`
- `客户名称`
- `本次门户用途`
- `摘要确认`

**Step 2: 检查不应再作为主叙事的关键词**

确认没有把以下词继续写成主链路：
- `主题包生成服务`
- `先创建项目再开始`
- `打包导出是产品主目标`

**Step 3: 运行诊断**

Run: IDE diagnostics
Expected: 编辑文件无新增问题

**Step 4: 交付说明**

- 汇总修改文件
- 汇总统一后的产品定义
- 汇总当前产品与目标差距
