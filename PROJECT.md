# 主题自动化项目

**这是一个以 Web 工作台为主入口、正在从“主题设计与导出工具”转向“面向售前的 Portal Agent 工作台”的产品。**

## 当前对齐

- 后续接手的大模型先读：`docs/internal/PRODUCT-ALIGNMENT.md`
- 产品目标口径：`面向售前的 Portal Agent 工作台`
- 当前代码现状：仍保留较强的主题设计、项目持久化、打包导出心智
- 讨论产品时，必须区分“目标产品”与“当前实现”

## 如果你想继续这个产品

请告诉 OpenCode：

```text
这是 Theme Studio 项目，请先读取 docs/internal/PRODUCT-ALIGNMENT.md，再继续当前 Web 产品
```

## 当前主线

- Path B（Web 浏览器流程）是唯一主线
- `.pen` 文件只做视觉参考，不是运行时渲染源
- HTML 模板是当前主要渲染源
- 工作区编辑器已存在，是当前最接近目标产品的能力基础
- HTML 截图 + `theme_builder.py` 仍是现有底层导出链路，但不再应被当作产品主叙事
- 历史 CLI / Pencil / Manifest 工具链仅保留参考价值，不再作为产品执行步骤

## Portal Agent 方向

- 当前产品正逐步把旧的 **Theme Agent** 升级成 **Portal Agent**
- Agent 的目标不是只生成主题，而是为售前生成客户门户方案
- 门户结果必须同时覆盖：视觉主题、工作区结构、行业/企业适配示例内容
- 生成前必须先补齐客户名称、客户行业、客户核心职能/业务特征、本次门户用途、重点卡片、品牌/视觉倾向
- 当前自动能力仍主要落在视觉主题生成与编辑基础上，门户结构和示例内容的自动化仍是目标能力

---

## 项目信息

- **路径**: `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation`
- **目标用途**: 通过 Web 工作台从需求直接生成门户，并支持预览、编辑、全屏确认、保存/分享/再次编辑
- **当前实现**: 仍包含生成、预览、迭代、项目持久化与导出打包链路
- **Skill**: `theme-automation`
- **设计参考**: `designs/sources/Light-UI-模板.pen`
- **运行时渲染源**: `web/src/templates/*`
