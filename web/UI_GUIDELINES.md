# UI 生成规范（严格执行）

本文件是 `web/` 目录下所有 UI 代码的视觉宪法。每次写 UI 前必须阅读。

---

## 1. 技术栈（不可变更）

- **HTML**：原生 HTML5，无 JSX
- **TypeScript**：原生 TS，无 React/Vue/Angular
- **CSS**：Tailwind CSS v4（通过 `@tailwindcss/vite` 插件）
- **图标**：Lucide 风格内联 SVG（`stroke="currentColor" stroke-width="1.5"`）
- **字体**：系统字体栈 `'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif`

---

## 2. 色彩规范（禁止硬编码）

所有颜色必须使用 Tailwind 语义化 token，颜色值通过 CSS 变量动态切换（每个主题不同）。

| 用途 | Tailwind class | 说明 |
|------|---------------|------|
| 主品牌色 | `bg-primary` `text-primary` | 按钮背景、强调色 |
| 品牌悬浮色 | `bg-primary-hover` | 按钮 hover 态 |
| 辅助色 | `bg-alter` `text-alter` | 次级按钮、标签 |
| 辅助悬浮色 | `bg-alter-hover` | 次级按钮 hover |
| 品牌色10%透明 | `bg-primary-10` | 浅背景、hover 底色 |
| 品牌色20%透明 | `bg-primary-20` | 中等浅背景 |
| 品牌色30%透明 | `bg-primary-30` | 稍深浅背景 |
| 正文色 | `text-header-font` | 主要文字 #333 |
| 辅助灰 | `text-aux-gray` | 次要文字 #999 |
| 深灰 | `text-aux-gray-dark` | 说明文字 #666 |
| 页面背景 | `bg-body-bg` | #F8F8F8 |
| 面板背景 | `bg-panel-bg` | 白色卡片 |
| 边框 | `border-border` | #E5E7EB |

**禁止**：`style="color: #2C615C"`、`style="background: #B2FFE6"`、任何硬编码色值。
**禁止**：`bg-indigo-600`、`text-gray-900` 等 Tailwind 默认色——必须用上面的语义化 token。

---

## 3. 图标规范（零 Emoji）

### 允许的图标方式

Lucide 风格内联 SVG：
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9,22 9,12 15,12 15,22"/>
</svg>
```

### 图标对照表

| 名称 | 用途 | SVG path 特征 |
|------|------|---------------|
| home | 首页 | `M3 9l9-7 9 7v11a2...` |
| clipboard-check | 待办 | `M9 5H7a2...rect x="9" y="3"...M9 14l2 2 4-4` |
| calendar | 日程 | `rect x="3" y="4"...M16 2v4M8 2v4M3 10h18` |
| bar-chart | 报表 | `M18 20V10M12 20V4M6 20v-6` |
| folder | 文档 | `M22 19a2 2 0 0 1-2 2H4a2...` |
| message-square | 消息 | `M21 15a2 2 0 0 1-2 2H7l-4 4V5a2...` |
| users | 通讯录 | `M17 21v-2a4...circle cx="9" cy="7" r="4"...` |
| bot | AI 头像 | `rect x="3" y="11"...circle cx="12" cy="5" r="2"...` |
| person | 用户头像 | `M12 12c2.21 0 4-1.79...path d="M12 14..."` |

### 绝对禁止

- ❌ 🏠📋📅📊📁💬👥 作为 UI 图标
- ❌ 🤖👤 作为头像
- ❌ Font Awesome、Material Icons 等外部图标库（保持零依赖）

---

## 4. 布局规范

- **全局布局**：Flexbox 或 Grid。禁止 `float`。
- **间距体系**：使用 Tailwind 默认间距 `p-4` `gap-6` `m-2` 等。
- **卡片标准**：`p-6 bg-panel-bg rounded-lg border border-border shadow-sm`
- **响应式**：本项目是桌面端预览器（1920×1080），不需要移动端适配。

---

## 5. TS 动态渲染规范

在 TypeScript 中动态创建 DOM 时，**必须使用模板字符串**：

```typescript
// ✅ 正确
function createCard(title: string, content: string): string {
  return `
    <div class="p-6 bg-panel-bg rounded-lg border border-border shadow-sm">
      <h3 class="text-lg font-semibold text-header-font mb-2">${title}</h3>
      <p class="text-aux-gray text-sm">${content}</p>
    </div>
  `;
}
element.innerHTML = createCard('标题', '内容');

// ❌ 禁止
const div = document.createElement('div');
div.classList.add('p-6', 'bg-panel-bg', 'rounded-lg', ...); // 禁止逐个拼凑
div.style.color = '#333'; // 禁止内联样式
```

---

## 6. 模板文件结构

每个模板由 3 个文件组成：
- `{name}.html` — HTML 结构
- `{name}.css` — 该模板专属样式（逐步迁移到 Tailwind utility classes）
- 共享变量在 `theme-variables.css` 中定义

新增模板时必须：
1. 引入 `theme-variables.css`
2. 使用 Tailwind 语义化 token 而非硬编码颜色
3. 图标使用 Lucide 风格 SVG

---

## 7. 项目约束

- `web/` 是主题预览器，用于截图导出给蓝凌 OA 使用
- 导出的主题包是纯 CSS/HTML，**不能包含 Tailwind 运行时**
- 所以 Tailwind 仅用于预览器本身的开发体验
- 主题变量在 `colors/{nameEn}.json` 中定义，通过 `theme-variables.css` 注入
