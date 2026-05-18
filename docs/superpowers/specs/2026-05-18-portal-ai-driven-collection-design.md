# Portal Agent AI 驱动信息收集 — 设计文档

> 日期：2026-05-18
> 状态：待评审

## 1. 背景

Portal Agent 主链路：`客户需求输入 → 信息补齐 → 摘要确认 → 生成新门户 → 预览迭代`

当前信息补齐存在两套冲突逻辑：

1. 前端正则 `extractPortalProfileFromMessage` 在 AI 回复前拦截消息，判断信息不足则 `blocked: true`，返回固定追问模板
2. AI system prompt 要求先补齐 6 项信息再生成，但 AI 的自然语言理解结果无法回写到 `portalProfile`

结果：AI 理解能力被浪费，用户收到机械的追问模板，体验生硬。

## 2. 目标

- 信息收集的控制权交给 AI，利用 AI 的语义理解能力从自然对话中提取客户信息
- 移除前端正则拦截 + 固定追问模板
- 在生成前增加结构化表单作为最终确认，AI 预填 6 项信息，用户可修改
- 摘要确认合并到表单确认中，简化流程

## 3. 方案设计

### 3.1 新增工具 `update_portal_profile`

AI 在对话中调用此工具提交已理解的客户信息。

```json
{
  "tool": "update_portal_profile",
  "args": {
    "customerName": "国网某省电力公司",
    "customerIndustry": "能源",
    "customerFunctions": ["电力调度", "设备巡检", "安全管理"],
    "portalPurpose": "调度指挥门户",
    "highlightedCards": ["调度看板", "工单流转", "设备台账"],
    "visualPreference": "科技蓝白，稳重企业风"
  }
}
```

字段全部可选，AI 只提交它理解到的字段。

### 3.2 前端 tool call 处理

在 `chat-manager.ts` 的 AI tool call 处理流程中新增 `update_portal_profile` 分支：

1. 接收到 tool call → 调用 `mergePortalProfile(currentProfile, extracted, 'chat')` 合并到当前 profile
2. 持久化到 project
3. 检查 `getPortalWorkflowState`：
   - `collecting` → 不做额外动作，AI 会继续追问
   - `ready_to_generate`（6 项齐全）→ 自动构建摘要，通知 AI 可以提示用户确认

### 3.3 移除前端正则拦截

修改 `resolvePortalWorkflowForMessage`：

- **删除** `collecting` 状态下的 `blocked: true` + `buildPortalCollectionPrompt` 返回
- **删除** `summary_pending` 状态下的 `blocked: true` + `buildPortalSummaryPrompt` 返回
- 保留 profile 提取和持久化逻辑（作为 tool call 的补充，兼容直接结构化输入的场景）
- 保留 `ready_to_generate` 时的 portalDraft 构建和 workspace 渲染

### 3.4 确认表单 UI

用户确认摘要后、正式生成前，弹出结构化表单。表单包含 6 项，由 AI 通过 `update_portal_profile` 提取的结果预填。

**表单字段**：

| 字段 | 控件类型 | 说明 |
|------|----------|------|
| 客户名称 | 文本输入 | 预填 |
| 客户行业 | 下拉选择（12 个已知行业 + 自定义输入） | 预填 |
| 客户核心职能/业务特征 | 标签多选 + 自定义输入 | 预填 |
| 本次门户用途 | 下拉选择（常见用途 + 自定义输入） | 预填 |
| 重点卡片/重点信息 | 标签多选（从 CARD_ALIASES 映射） | 预填 |
| 品牌/视觉倾向 | 下拉选择（常见倾向 + 自定义输入） | 预填 |

**交互流程**：

1. AI 判断 6 项信息齐全 → 输出摘要文字 + 调用 `update_portal_profile` 提交完整 profile
2. 前端检测到 profile completeness = 100% → 自动弹出确认表单
3. 用户在表单中确认/修改 → 点击"确认并生成"
4. 表单提交 → `mergePortalProfile` 合并修改 → `buildPortalDraft` → 进入生成流程

**表单 UI 设计**：

- 模态弹窗，居中显示
- 标题："确认门户信息"
- 每个字段一行，预填值高亮显示
- 底部两个按钮："取消"（返回对话继续修改）、"确认并生成"（进入生成）
- 点击"确认并生成"后关闭弹窗，触发生成流程

### 3.5 System Prompt 调整

**第一步修改**：

```
第一步：理解客户需求并提取信息

收到用户消息后，主动调用 update_portal_profile 工具提交你从对话中理解到的客户信息。
需要收集的 6 项信息：
- 客户名称
- 客户行业
- 客户核心职能/业务特征
- 本次门户用途
- 希望突出哪些卡片或信息
- 品牌/视觉倾向

规则：
- 每次收到用户消息，都重新审视并更新 portal profile
- 即使只理解到部分信息也立即提交，不要等全部理解完
- 信息不足时，用自然的方式继续追问，不要列出模板化的检查清单
- 优先使用引导式问题和选项式问题
- 对上传图片、Word、PDF 等资料进行总结吸收

当 6 项信息都齐全时，先输出一份简洁的方案描述（2-3 句话），然后告知用户确认后即可生成。
系统会自动弹出确认表单。
```

**移除第二步（摘要确认）**：由表单确认替代。

**保留第三步（方案描述）**：AI 输出方案描述文字，在表单之前。

**保留第四步（生成预览图）**：表单提交后触发。

### 3.6 数据流总结

```
用户消息
  ↓
callAI()（不再被 blocked 拦截）
  ↓
AI 回复 + tool call: update_portal_profile
  ↓
前端处理 tool call → mergePortalProfile → saveProject
  ↓
检查 completeness:
  < 100% → AI 继续对话追问
  = 100% → AI 输出方案描述 + 系统弹出确认表单
  ↓
用户确认表单 → mergePortalProfile(表单数据) → buildPortalDraft
  ↓
进入生成流程（createPortalGenerationPrompt → callAI）
```

## 4. 不变的部分

- `portal-agent.ts`：`mergePortalProfile`、`buildPortalSummary`、`buildPortalDraft`、`getPortalWorkflowState`、`buildPortalSummaryPrompt` 保持不变
- `extractPortalProfileFromMessage`：保留但不再作为主要提取路径，作为兼容兜底
- 项目持久化、工作区渲染、生成后预览/编辑流程不变
- `buildPortalCollectionPrompt`：保留代码但不再被调用，未来可清理

## 5. 新增文件

- `web/src/components/portal-confirm-form.ts`：确认表单组件
- `web/index.html`：新增表单弹窗 HTML

## 6. 修改文件

| 文件 | 改动 |
|------|------|
| `web/src/agent/system-prompt.ts` | 第一步改为 AI 驱动收集，移除第二步摘要确认 |
| `web/src/agent/tool-call-utils.ts` | 新增 `update_portal_profile` tool call 处理 |
| `web/src/chat-manager.ts` | 移除收集阶段 blocked 逻辑，新增表单触发逻辑 |
| `web/src/portal-agent.ts` | 新增 `renderConfirmForm` 相关函数（可选，也可能放在组件文件中） |

## 7. 测试策略

- 新增单元测试：`update_portal_profile` tool call 解析 → profile 合并
- 新增单元测试：completeness 达 100% 时触发表单
- 新增单元测试：表单提交 → profile 合并 → draft 构建
- 更新现有测试：移除对 `buildPortalCollectionPrompt` 返回的断言
- E2E 测试：完整对话流程 → 表单确认 → 生成

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| AI 不调用 `update_portal_profile` | system prompt 中强调"每次收到消息都调用"；保留正则提取作为兜底 |
| AI 提取信息不准确 | 表单允许用户修改所有字段 |
| AI 过早判定信息齐全 | 表单显示后用户仍可取消回到对话 |
