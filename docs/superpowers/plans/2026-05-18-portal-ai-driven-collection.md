# Portal AI 驱动信息收集 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Portal Agent 信息收集从前端正则拦截改为 AI 工具调用驱动，并在生成前增加结构化确认表单。

**Architecture:** AI 通过 `update_portal_profile` 工具调用回写客户信息到 project.portalProfile，前端移除收集阶段的 blocked 拦截。profile 齐全后弹出预填确认表单，用户确认后进入生成。

**Tech Stack:** TypeScript, HTML/CSS (现有 modal 模式), Vitest

---

### Task 1: 新增 `update_portal_profile` 工具注册

**Files:**
- Modify: `web/src/tools/executor.ts:648-672` (validateToolArgs)
- Test: `tests/unit/PortalToolValidation.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalToolValidation.test.ts
import { describe, expect, test } from 'vitest';

describe('update_portal_profile tool validation', () => {
  test('accepts update_portal_profile with valid args', async () => {
    const { executeTool } = await import('../../web/src/tools/executor');
    const result = await executeTool(
      { tool: 'update_portal_profile', args: { customerName: '国网电力', customerIndustry: '能源' } },
      () => {},
    );
    expect(result.success).toBe(true);
  });

  test('update_portal_profile returns merged profile in result data', async () => {
    const { executeTool } = await import('../../web/src/tools/executor');
    const result = await executeTool(
      {
        tool: 'update_portal_profile',
        args: {
          customerName: '国网电力',
          customerIndustry: '能源',
          customerFunctions: ['电力调度', '安全管理'],
        },
      },
      () => {},
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
    expect(result.data.profile.customerName).toBe('国网电力');
    expect(result.data.profile.customerIndustry).toBe('能源');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalToolValidation.test.ts`
Expected: FAIL — `update_portal_profile` 不在 executor 的处理分支中

- [ ] **Step 3: 实现 — 在 executor.ts 中注册工具**

在 `validateToolArgs` 的 `default` 之前添加 case：

```typescript
    case 'update_portal_profile':
      return null;
```

在 executor 主 switch 中（`validate_colors` case 之后）添加处理分支：

```typescript
      case 'update_portal_profile': {
        const profileArgs = args as {
          customerName?: string;
          customerIndustry?: string;
          customerFunctions?: string[];
          portalPurpose?: string;
          highlightedCards?: string[];
          visualPreference?: string;
        };
        const partial: Partial<import('../types').PortalCustomerProfile> = {};
        if (typeof profileArgs.customerName === 'string' && profileArgs.customerName.trim()) {
          partial.customerName = profileArgs.customerName.trim();
        }
        if (typeof profileArgs.customerIndustry === 'string' && profileArgs.customerIndustry.trim()) {
          partial.customerIndustry = profileArgs.customerIndustry.trim();
        }
        if (Array.isArray(profileArgs.customerFunctions)) {
          partial.customerFunctions = profileArgs.customerFunctions.filter(
            (f) => typeof f === 'string' && f.trim(),
          );
        }
        if (typeof profileArgs.portalPurpose === 'string' && profileArgs.portalPurpose.trim()) {
          partial.portalPurpose = profileArgs.portalPurpose.trim();
        }
        if (Array.isArray(profileArgs.highlightedCards)) {
          partial.highlightedCards = profileArgs.highlightedCards.filter(
            (c) => typeof c === 'string' && c.trim(),
          );
        }
        if (typeof profileArgs.visualPreference === 'string' && profileArgs.visualPreference.trim()) {
          partial.visualPreference = profileArgs.visualPreference.trim();
        }
        return {
          success: true,
          data: { profile: partial },
        };
      }
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/PortalToolValidation.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/tools/executor.ts tests/unit/PortalToolValidation.test.ts
git commit -m "feat: register update_portal_profile tool in executor"
```

---

### Task 2: 前端处理 `update_portal_profile` tool call 回写 profile

**Files:**
- Modify: `web/src/chat-manager.ts:1111-1262` (tool call dispatch loop)
- Test: `tests/unit/PortalProfileToolCall.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalProfileToolCall.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('update_portal_profile tool call handling', () => {
  test('chat-manager handles update_portal_profile tool call', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain("tc.tool === 'update_portal_profile'");
    expect(source).toContain('mergePortalProfile');
  });

  test('chat-manager checks profile completeness after update_portal_profile', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain('getPortalWorkflowState');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalProfileToolCall.test.ts`
Expected: FAIL — chat-manager 中还没有 `update_portal_profile` 分支

- [ ] **Step 3: 实现 — 在 chat-manager.ts 的 tool call 循环中添加处理**

在 `else if (tc.tool === 'update_colors')` 分支之后、`} else {` 之前，添加：

```typescript
          } else if (tc.tool === 'update_portal_profile') {
            const toolProfile = (result.data as { profile?: Partial<import('./types').PortalCustomerProfile> }).profile;
            if (toolProfile) {
              const pid = getCurrentProjectId();
              if (pid) {
                const proj = await loadProject(pid);
                if (proj) {
                  const previousProfile = proj.portalProfile;
                  const nextProfile = mergePortalProfile(previousProfile, toolProfile, 'chat');
                  proj.portalProfile = nextProfile;
                  if (proj.name === '未命名项目' && nextProfile.customerName) {
                    proj.name = `${nextProfile.customerName}门户`;
                    proj.themeName = proj.name;
                    updateProjectNameDisplay(proj);
                  }
                  await saveProject(proj);
                  const workflow = getPortalWorkflowState(proj.portalProfile, proj.portalSummary);
                  if (workflow.status === 'ready_to_generate' && !proj.portalSummary) {
                    proj.portalSummary = buildPortalSummary(proj.portalProfile);
                    await saveProject(proj);
                    const confirmMsg = '📋 已完整收集客户信息，请确认后开始生成门户。';
                    await addMessageToChat('ai', confirmMsg);
                    pushToolResultToHistory(confirmMsg);
                    showPortalConfirmForm(proj);
                  }
                }
              }
            }
            await saveChatHistory();
```

同时在文件顶部的 import 中确认已有 `mergePortalProfile`、`getPortalWorkflowState`、`buildPortalSummary` 的导入（当前已有，无需修改）。

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/PortalProfileToolCall.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/chat-manager.ts tests/unit/PortalProfileToolCall.test.ts
git commit -m "feat: handle update_portal_profile tool call in chat-manager"
```

---

### Task 3: 移除收集阶段的 blocked 拦截

**Files:**
- Modify: `web/src/chat-manager.ts:304-390` (resolvePortalWorkflowForMessage)
- Modify: `tests/unit/WebLandingLegacyPromptMode.test.ts` (更新断言)

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalNoBlockedCollection.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal collection does not block AI', () => {
  test('resolvePortalWorkflowForMessage does not block on collecting status', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');
    const funcMatch = source.match(
      /async function resolvePortalWorkflowForMessage[\s\S]*?^}/m,
    );
    expect(funcMatch).toBeTruthy();
    const funcBody = funcMatch![0];
    expect(funcBody).not.toContain('blocked: true');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalNoBlockedCollection.test.ts`
Expected: FAIL — `resolvePortalWorkflowForMessage` 中仍包含 `blocked: true`

- [ ] **Step 3: 实现 — 重写 resolvePortalWorkflowForMessage**

将整个 `resolvePortalWorkflowForMessage` 函数替换为：

```typescript
async function resolvePortalWorkflowForMessage(project: Project, userMessage: string): Promise<{
  generationPrompt?: string;
  project: Project;
}> {
  const extracted = extractPortalProfileFromMessage(userMessage);
  const previousProfile = project.portalProfile;
  const nextProfile = hasPortalProfilePatch(extracted)
    ? mergePortalProfile(previousProfile, extracted, 'chat')
    : previousProfile;
  const profileChanged = didPortalProfileChange(previousProfile, nextProfile);

  if (nextProfile) {
    project.portalProfile = nextProfile;
    if (project.name === '未命名项目' && nextProfile.customerName) {
      project.name = `${nextProfile.customerName}门户`;
      project.themeName = project.name;
      updateProjectNameDisplay(project);
    }
  }

  if (profileChanged && project.portalSummary?.confirmedAt) {
    project.portalSummary = undefined;
    project.portalDraft = undefined;
  }

  if (profileChanged && nextProfile) {
    project.portalSummary = buildPortalSummary(nextProfile);
  }

  await saveProject(project);

  return { project };
}
```

同时更新调用处 (`chat-manager.ts` 约 853 行)：

```typescript
        const portalFlow = await resolvePortalWorkflowForMessage(activeProject, content);
        portalGenerationPrompt = undefined;
```

删除原来的 `portalFlow.aiReply`、`portalFlow.blocked` 相关代码块（约 854-861 行）。

- [ ] **Step 4: 运行全量测试验证**

Run: `npx vitest run`
Expected: 全部通过。修复引用旧函数签名的测试。

- [ ] **Step 5: 提交**

```bash
git add web/src/chat-manager.ts tests/unit/PortalNoBlockedCollection.test.ts
git commit -m "feat: remove blocked collection, let AI drive info gathering"
```

---

### Task 4: 确认表单 HTML + CSS

**Files:**
- Modify: `web/index.html`
- Modify: `web/src/styles.css`
- Test: `tests/unit/PortalConfirmFormHTML.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalConfirmFormHTML.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal confirm form HTML', () => {
  test('index.html contains portal confirm modal', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'web/index.html'), 'utf8');

    expect(html).toContain('id="portalConfirmModal"');
    expect(html).toContain('id="portalConfirmCustomerName"');
    expect(html).toContain('id="portalConfirmIndustry"');
    expect(html).toContain('id="portalConfirmPurpose"');
    expect(html).toContain('id="portalConfirmSubmitBtn"');
    expect(html).toContain('id="portalConfirmCancelBtn"');
  });

  test('styles.css contains portal confirm form styles', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'web/src/styles.css'), 'utf8');

    expect(css).toContain('.portal-confirm-form');
    expect(css).toContain('.portal-confirm-field');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalConfirmFormHTML.test.ts`
Expected: FAIL — HTML 和 CSS 中还没有确认表单

- [ ] **Step 3: 实现 — 在 index.html 中添加确认表单 HTML**

在 `</body>` 之前添加：

```html
        <div class="modal-overlay" id="portalConfirmModal">
            <div class="modal-content portal-confirm-modal">
                <header class="package-modal-header">
                    <div>
                        <h2 class="package-modal-title">确认门户信息</h2>
                        <p class="package-modal-subtitle">请确认以下信息无误后开始生成</p>
                    </div>
                    <button class="package-modal-close-btn" id="portalConfirmCloseBtn" aria-label="关闭">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </header>
                <div class="portal-confirm-form" id="portalConfirmFormBody">
                    <div class="portal-confirm-field">
                        <label for="portalConfirmCustomerName">客户名称</label>
                        <input type="text" id="portalConfirmCustomerName" class="portal-confirm-input" placeholder="请输入客户名称" />
                    </div>
                    <div class="portal-confirm-field">
                        <label for="portalConfirmIndustry">客户行业</label>
                        <select id="portalConfirmIndustry" class="portal-confirm-input">
                            <option value="">请选择</option>
                            <option value="能源">能源</option>
                            <option value="医疗">医疗</option>
                            <option value="教育">教育</option>
                            <option value="金融">金融</option>
                            <option value="制造">制造</option>
                            <option value="零售">零售</option>
                            <option value="物流">物流</option>
                            <option value="科技">科技</option>
                            <option value="政务">政务</option>
                            <option value="文旅">文旅</option>
                            <option value="交通">交通</option>
                            <option value="化工">化工</option>
                            <option value="__custom__">其他（自定义）</option>
                        </select>
                        <input type="text" id="portalConfirmIndustryCustom" class="portal-confirm-input portal-confirm-custom-input" placeholder="自定义行业" style="display:none;" />
                    </div>
                    <div class="portal-confirm-field">
                        <label for="portalConfirmFunctions">核心职能/业务特征</label>
                        <input type="text" id="portalConfirmFunctions" class="portal-confirm-input" placeholder="如：电力调度、设备巡检" />
                    </div>
                    <div class="portal-confirm-field">
                        <label for="portalConfirmPurpose">本次门户用途</label>
                        <select id="portalConfirmPurpose" class="portal-confirm-input">
                            <option value="">请选择</option>
                            <option value="客户演示门户">客户演示门户</option>
                            <option value="运营管理门户">运营管理门户</option>
                            <option value="调度指挥门户">调度指挥门户</option>
                            <option value="方案汇报门户">方案汇报门户</option>
                            <option value="活动专题门户">活动专题门户</option>
                            <option value="__custom__">其他（自定义）</option>
                        </select>
                        <input type="text" id="portalConfirmPurposeCustom" class="portal-confirm-input portal-confirm-custom-input" placeholder="自定义用途" style="display:none;" />
                    </div>
                    <div class="portal-confirm-field">
                        <label for="portalConfirmCards">重点卡片/重点信息</label>
                        <input type="text" id="portalConfirmCards" class="portal-confirm-input" placeholder="如：调度看板、工单流转、设备台账" />
                    </div>
                    <div class="portal-confirm-field">
                        <label for="portalConfirmVisual">品牌/视觉倾向</label>
                        <select id="portalConfirmVisual" class="portal-confirm-input">
                            <option value="">请选择</option>
                            <option value="科技蓝白，稳重企业风">科技蓝白，稳重企业风</option>
                            <option value="蓝白简洁，现代商务">蓝白简洁，现代商务</option>
                            <option value="喜庆红金，热闹氛围">喜庆红金，热闹氛围</option>
                            <option value="深色科技风，未来感">深色科技风，未来感</option>
                            <option value="轻盈明亮，清新自然">轻盈明亮，清新自然</option>
                            <option value="绿蓝生态，环保清新">绿蓝生态，环保清新</option>
                            <option value="__custom__">其他（自定义）</option>
                        </select>
                        <input type="text" id="portalConfirmVisualCustom" class="portal-confirm-input portal-confirm-custom-input" placeholder="自定义视觉倾向" style="display:none;" />
                    </div>
                </div>
                <footer class="package-modal-footer">
                    <button id="portalConfirmSubmitBtn" class="btn-primary">确认并生成</button>
                    <button id="portalConfirmCancelBtn" class="btn-secondary">取消</button>
                </footer>
            </div>
        </div>
```

在 `styles.css` 末尾添加：

```css
.portal-confirm-modal
{
  max-width: 520px;
  width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  background: #1a1a1a;
  border-radius: 16px;
  padding: 0;
}

.portal-confirm-form
{
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.portal-confirm-field
{
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.portal-confirm-field label
{
  font-size: 13px;
  color: #aaa;
  font-weight: 500;
}

.portal-confirm-input
{
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.portal-confirm-input:focus
{
  border-color: #5b9bd5;
}

.portal-confirm-custom-input
{
  margin-top: 6px;
}

.portal-confirm-modal .package-modal-footer
{
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #333;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/PortalConfirmFormHTML.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/index.html web/src/styles.css tests/unit/PortalConfirmFormHTML.test.ts
git commit -m "feat: add portal confirm form HTML and CSS"
```

---

### Task 5: 确认表单 TS 组件

**Files:**
- Create: `web/src/components/portal-confirm-form.ts`
- Test: `tests/unit/PortalConfirmFormComponent.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalConfirmFormComponent.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal confirm form component', () => {
  test('exports showPortalConfirmForm function', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8',
    );

    expect(source).toContain('export function showPortalConfirmForm');
    expect(source).toContain('export function hidePortalConfirmForm');
  });

  test('showPortalConfirmForm pre-fills fields from profile', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8',
    );

    expect(source).toContain('portalConfirmCustomerName');
    expect(source).toContain('portalConfirmIndustry');
    expect(source).toContain('.value =');
  });

  test('form submit handler collects all 6 fields', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'web/src/components/portal-confirm-form.ts'),
      'utf8',
    );

    expect(source).toContain('customerName');
    expect(source).toContain('customerIndustry');
    expect(source).toContain('customerFunctions');
    expect(source).toContain('portalPurpose');
    expect(source).toContain('highlightedCards');
    expect(source).toContain('visualPreference');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalConfirmFormComponent.test.ts`
Expected: FAIL — 文件不存在

- [ ] **Step 3: 实现 — 创建 portal-confirm-form.ts**

```typescript
import type { Project } from '../types';

type PortalConfirmCallback = (project: Project) => void;

let onSubmitCallback: PortalConfirmCallback | null = null;

export function showPortalConfirmForm(project: Project): void {
  const modal = document.getElementById('portalConfirmModal');
  if (!modal) return;

  const profile = project.portalProfile;
  if (profile) {
    const nameInput = document.getElementById('portalConfirmCustomerName') as HTMLInputElement;
    const industrySelect = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
    const functionsInput = document.getElementById('portalConfirmFunctions') as HTMLInputElement;
    const purposeSelect = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
    const cardsInput = document.getElementById('portalConfirmCards') as HTMLInputElement;
    const visualSelect = document.getElementById('portalConfirmVisual') as HTMLSelectElement;

    if (nameInput) nameInput.value = profile.customerName ?? '';
    if (industrySelect) {
      const options = Array.from(industrySelect.options).map((o) => o.value);
      if (profile.customerIndustry && options.includes(profile.customerIndustry)) {
        industrySelect.value = profile.customerIndustry;
      } else if (profile.customerIndustry) {
        industrySelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.customerIndustry;
        }
      }
    }
    if (functionsInput) functionsInput.value = profile.customerFunctions?.join('、') ?? '';
    if (purposeSelect) {
      const options = Array.from(purposeSelect.options).map((o) => o.value);
      if (profile.portalPurpose && options.includes(profile.portalPurpose)) {
        purposeSelect.value = profile.portalPurpose;
      } else if (profile.portalPurpose) {
        purposeSelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.portalPurpose;
        }
      }
    }
    if (cardsInput) cardsInput.value = profile.highlightedCards?.join('、') ?? '';
    if (visualSelect) {
      const options = Array.from(visualSelect.options).map((o) => o.value);
      if (profile.visualPreference && options.includes(profile.visualPreference)) {
        visualSelect.value = profile.visualPreference;
      } else if (profile.visualPreference) {
        visualSelect.value = '__custom__';
        const customInput = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;
        if (customInput) {
          customInput.style.display = 'block';
          customInput.value = profile.visualPreference;
        }
      }
    }
  }

  modal.classList.add('active');
}

export function hidePortalConfirmForm(): void {
  const modal = document.getElementById('portalConfirmModal');
  if (modal) modal.classList.remove('active');
  onSubmitCallback = null;
}

export function onPortalConfirmSubmit(callback: PortalConfirmCallback): void {
  onSubmitCallback = callback;
}

export function initPortalConfirmForm(): void {
  const industrySelect = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
  const industryCustom = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
  const purposeSelect = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
  const purposeCustom = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
  const visualSelect = document.getElementById('portalConfirmVisual') as HTMLSelectElement;
  const visualCustom = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;

  if (industrySelect && industryCustom) {
    industrySelect.addEventListener('change', () => {
      industryCustom.style.display = industrySelect.value === '__custom__' ? 'block' : 'none';
    });
  }
  if (purposeSelect && purposeCustom) {
    purposeSelect.addEventListener('change', () => {
      purposeCustom.style.display = purposeSelect.value === '__custom__' ? 'block' : 'none';
    });
  }
  if (visualSelect && visualCustom) {
    visualSelect.addEventListener('change', () => {
      visualCustom.style.display = visualSelect.value === '__custom__' ? 'block' : 'none';
    });
  }

  const closeBtn = document.getElementById('portalConfirmCloseBtn');
  const cancelBtn = document.getElementById('portalConfirmCancelBtn');
  if (closeBtn) closeBtn.addEventListener('click', hidePortalConfirmForm);
  if (cancelBtn) cancelBtn.addEventListener('click', hidePortalConfirmForm);

  const submitBtn = document.getElementById('portalConfirmSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('portalConfirmCustomerName') as HTMLInputElement;
      const industrySelectEl = document.getElementById('portalConfirmIndustry') as HTMLSelectElement;
      const industryCustomEl = document.getElementById('portalConfirmIndustryCustom') as HTMLInputElement;
      const functionsInput = document.getElementById('portalConfirmFunctions') as HTMLInputElement;
      const purposeSelectEl = document.getElementById('portalConfirmPurpose') as HTMLSelectElement;
      const purposeCustomEl = document.getElementById('portalConfirmPurposeCustom') as HTMLInputElement;
      const cardsInput = document.getElementById('portalConfirmCards') as HTMLInputElement;
      const visualSelectEl = document.getElementById('portalConfirmVisual') as HTMLSelectElement;
      const visualCustomEl = document.getElementById('portalConfirmVisualCustom') as HTMLInputElement;

      const customerName = nameInput?.value.trim() ?? '';
      const customerIndustry = industrySelectEl?.value === '__custom__'
        ? (industryCustomEl?.value.trim() ?? '')
        : (industrySelectEl?.value ?? '');
      const customerFunctions = (functionsInput?.value ?? '').split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean);
      const portalPurpose = purposeSelectEl?.value === '__custom__'
        ? (purposeCustomEl?.value.trim() ?? '')
        : (purposeSelectEl?.value ?? '');
      const highlightedCards = (cardsInput?.value ?? '').split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean);
      const visualPreference = visualSelectEl?.value === '__custom__'
        ? (visualCustomEl?.value.trim() ?? '')
        : (visualSelectEl?.value ?? '');

      if (onSubmitCallback) {
        const pid = document.getElementById('chatProjectName')?.dataset?.projectId;
        if (pid) {
          import('../project-manager').then(({ loadProject }) => {
            loadProject(pid).then((project) => {
              if (project) {
                project.portalProfile = {
                  customerName,
                  customerIndustry,
                  customerFunctions,
                  portalPurpose,
                  highlightedCards,
                  visualPreference,
                  source: ['form'],
                  completeness: 1,
                  updatedAt: Date.now(),
                };
                onSubmitCallback!(project);
              }
            });
          });
        }
      }

      hidePortalConfirmForm();
    });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/PortalConfirmFormComponent.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/components/portal-confirm-form.ts tests/unit/PortalConfirmFormComponent.test.ts
git commit -m "feat: create portal confirm form component"
```

---

### Task 6: 连接确认表单到生成流程

**Files:**
- Modify: `web/src/chat-manager.ts` (import + initPortalConfirmForm + 表单提交回调)
- Modify: `web/src/main.ts` (initPortalConfirmForm 调用)
- Test: `tests/unit/PortalConfirmFormIntegration.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalConfirmFormIntegration.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal confirm form integration', () => {
  test('main.ts initializes portal confirm form', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/main.ts'), 'utf8');

    expect(source).toContain('initPortalConfirmForm');
  });

  test('chat-manager shows portal confirm form when profile is complete', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain('showPortalConfirmForm');
  });

  test('chat-manager imports portal confirm form', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/chat-manager.ts'), 'utf8');

    expect(source).toContain('portal-confirm-form');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalConfirmFormIntegration.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 — chat-manager.ts 导入和连接**

在 chat-manager.ts 顶部 imports 中添加：

```typescript
import {
  showPortalConfirmForm,
  onPortalConfirmSubmit,
  hidePortalConfirmForm,
} from './components/portal-confirm-form';
```

在 chat-manager.ts 中找到 `showPortalConfirmForm(proj)` 调用（Task 2 添加的），确保已存在。

在 chat-manager.ts 的 `setupChatInterface` 函数中（或模块初始化阶段），添加表单提交回调：

```typescript
  onPortalConfirmSubmit(async (project) => {
    const portalDraft = buildPortalDraft(project.portalSummary ?? buildPortalSummary(project.portalProfile));
    Object.assign(project, applyPortalDraftToProject(project, portalDraft));
    project.portalSummary = {
      ...project.portalSummary!,
      confirmedAt: Date.now(),
    };
    await saveProject(project);
    await syncProjectWorkspaceSnapshot(project);
    renderWorkspaceEditorShell(project.workspace ?? null);
    const prompt = createPortalGenerationPrompt(project.portalSummary);
    await callAI(prompt);
  });
```

- [ ] **Step 4: 实现 — main.ts 初始化**

在 main.ts 的 imports 中添加：

```typescript
import { initPortalConfirmForm } from './components/portal-confirm-form';
```

在 `initializeFeatureModules()` 函数中调用：

```typescript
  initPortalConfirmForm();
```

- [ ] **Step 5: 运行全量测试**

Run: `npx vitest run`
Expected: 全部通过

- [ ] **Step 6: TypeScript 类型检查**

Run: `npx tsc -p web/tsconfig.json --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add web/src/chat-manager.ts web/src/main.ts tests/unit/PortalConfirmFormIntegration.test.ts
git commit -m "feat: connect portal confirm form to generation flow"
```

---

### Task 7: 更新 System Prompt

**Files:**
- Modify: `web/src/agent/system-prompt.ts`
- Test: `tests/unit/PortalSystemPrompt.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/PortalSystemPrompt.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();

describe('portal system prompt for AI-driven collection', () => {
  test('system prompt mentions update_portal_profile tool', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/agent/system-prompt.ts'), 'utf8');

    expect(source).toContain('update_portal_profile');
  });

  test('system prompt instructs AI to call update_portal_profile on every message', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'web/src/agent/system-prompt.ts'), 'utf8');

    expect(source).toContain('update_portal_profile');
    expect(source).toContain('每次收到用户消息');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/unit/PortalSystemPrompt.test.ts`
Expected: FAIL — system-prompt.ts 中还没有 `update_portal_profile`

- [ ] **Step 3: 实现 — 更新 system-prompt.ts**

在 system-prompt.ts 中，将"第一步：先补齐客户信息"的文案替换为：

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

调用格式：
\`\`\`json
{"tool": "update_portal_profile", "args": {"customerName": "xxx", "customerIndustry": "xxx", ...}}
\`\`\`

规则：
- 每次收到用户消息，都重新审视并调用 update_portal_profile 提交你理解到的客户信息
- 即使只理解到部分信息也立即提交，不要等全部理解完
- 信息不足时，用自然的方式继续追问，不要列出模板化的检查清单
- 优先使用引导式问题和选项式问题
- 对上传图片、Word、PDF 等资料进行总结吸收

当 6 项信息都齐全时，先输出一份简洁的方案描述（2-3 句话概括主视觉、风格、色调、重点信息区域），
然后告知用户"确认后即可开始生成"。系统会自动弹出确认表单供用户最终确认。
```

将"第二步：输出摘要确认"整段删除或注释（摘要确认已合并到表单）。

在工具列表中添加 `update_portal_profile` 的定义说明。

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/unit/PortalSystemPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: 运行全量测试**

Run: `npx vitest run`
Expected: 全部通过

- [ ] **Step 6: 提交**

```bash
git add web/src/agent/system-prompt.ts tests/unit/PortalSystemPrompt.test.ts
git commit -m "feat: update system prompt for AI-driven portal profile collection"
```

---

### Task 8: 清理旧测试 + 全量回归

**Files:**
- Modify: 多个测试文件（移除对旧 blocked 流程的断言）
- Test: 全量回归

- [ ] **Step 1: 查找需要更新的测试**

Run: `grep -rn 'buildPortalCollectionPrompt\|portalFlow\.blocked\|portalFlow\.aiReply\|blocked: true' tests/`

- [ ] **Step 2: 逐个更新测试文件**

对每个引用了旧 `resolvePortalWorkflowForMessage` 返回值 `blocked`/`aiReply` 的测试，更新为断言新行为（无 blocked，profile 持久化）。

- [ ] **Step 3: 运行全量测试 + 类型检查**

Run: `npx vitest run && npx tsc -p web/tsconfig.json --noEmit`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add -u
git commit -m "test: update tests for AI-driven portal collection flow"
```
