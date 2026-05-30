# 专项技术方案：Pencil 到 HTML 预览与截图打包

> 版本：v1.0  
> 面向对象：前端开发、架构师、主题渲染与导出链路维护者

相关文档：

- [文档导航](./README.md)
- [用户操作说明书](./用户操作说明书.md)
- [PRD：产品使用流程](./PRD-产品使用流程.md)
- [开发者系统流程图](./开发者系统流程图.md)

---

## 1. 问题定义

当前项目在产品层的核心目标，已经不是“先准备主题包再交付”，而是“根据需求尽快生成一个可继续编辑的新门户”。

在这个前提下，当前技术链路的核心输入不是单一静态设计稿，而是三类动态主题数据：

1. **Pencil 模板**：提供页面结构、视觉基准、导出规范
2. **底图**：主题背景图
3. **颜色方案**：包含纯色、透明色、渐变色

底层技术系统最终必须同时完成两件事：

- **预览**：让用户实时查看新门户效果
- **底层截图与素材生成**：为需要复用 HTML 渲染结果的后续能力提供支撑

因此，本方案的关键不是“让 CSS 像 Pencil”，而是：

> **让同一套门户渲染结果同时服务预览和底层截图能力。**

---

## 2. 核心结论

### 架构原则

> **Pencil 只作为模板规范源，HTML 才作为最终渲染源。**

也就是说：

```text
Pencil 模板
→ 抽象结构 / 资产位 / 变量位
→ HTML/CSS 模板系统
→ 注入底图 + 颜色 + 渐变
→ 1) 预览
→ 2) Playwright 截图
→ 打包
```

### 为什么这样最稳

如果：

- 预览来自 A 系统
- 截图来自 B 系统

那么最终一定会出现视觉漂移。

所以系统必须遵守：

> **预览源 = 截图源**

这里说的“截图源”是底层技术能力，不代表截图打包是面向用户的主产品流程。

---

## 3. Pencil 在系统中的角色

Pencil 不再承担最终渲染器角色，而应承担以下职责：

### 3.1 模板结构参考

定义：

- 登录页结构
- 工作台结构
- header / banner / sideheader 布局
- 哪些区域最终需要截图导出

### 3.2 视觉基准

定义：

- 渐变长什么样
- 特效层在哪里
- 哪些视觉是纯结构，哪些是特殊装饰

### 3.3 资产来源

对于难以稳定纯 CSS 复刻的效果：

- 从 Pencil 导出为透明 PNG / JPG
- 在 HTML 模板中作为设计资产使用

---

## 4. HTML 在系统中的角色

HTML 模板应成为系统的**唯一最终渲染源**。

HTML 模板承担两件事：

### 4.1 预览渲染

让用户在 Web 界面中看到门户效果。

### 4.2 导出渲染

通过浏览器截图得到底层素材，用于支撑相关技术链路。

所以最终关系应该是：

```text
同一套 HTML 模板
→ 用户预览
→ Playwright 截图导出
```

---

## 5. 渲染模型设计

## 5.1 ThemeRenderModel 作为唯一真相源

建议建立统一的主题渲染数据模型，不要在各处零散拼接颜色和图片。

示例：

```ts
type ThemeRenderModel = {
  templateType: 'light-ui' | 'dark-ui';
  themeName: string;
  colors: Record<string, string>;
  images: {
    loginBg?: string;
    headerBg?: string;
    sidebarBg?: string;
    desktopFeature?: string;
    desktopAccent?: string;
  };
  gradients: {
    headerOverlay?: string;
    sidebarOverlay?: string;
    bannerOverlay?: string;
  };
};
```

所有模板都只接收这个模型进行渲染。

---

## 5.2 模板层级划分

建议按最终导出目标划分模板：

### 登录页模板

- `login.html`
- 固定尺寸：2215 × 1080
- 负责产出：
  - `bg-login.jpg`
  - `background.png`
  - `login_thumb.jpg`
  - `thumb-1.jpg`
  - `thumb-2.jpg`

### 工作台模板

- `desktop.html`
- 固定尺寸：1920 × 1079
- 负责产出：
  - `desktop.png`
  - `layout-banner.jpg`

### 页眉系列模板

- `header-default.html`
- `header-complex.html`
- `header-menu.html`
- `header-banner.html`
- `sidebar.html`

负责产出：

- `header_tlayout_frame_bg.png`
- `header_complex_frame_bg.png`
- `header_menu_frame_bg.png`
- `header-banner.png`
- `header-sideheader.png`

---

## 6. 渐变实现策略

## 6.1 第一类：变量渐变

适用于：

- `primary → transparent`
- `gradient-start → gradient-mid`
- `headerFontColor → transparent`

这类渐变应该参数化，直接放进 CSS 变量中。

例如：

```css
--header-overlay: linear-gradient(90deg, var(--primary-color), transparent);
```

---

## 6.2 第二类：组合渐变

适用于：

- 底图 + 蒙层
- 左右羽化
- 多层高光

实现方式建议：

- `background`
- `::before`
- `::after`
- 多层叠加

不要把所有效果都塞进一条复杂 `background`，而应该分层实现，便于维护。

---

## 6.3 第三类：难复刻渐变

如果某些 Pencil 效果存在以下特征：

- 羽化复杂
- 多层叠加后综合色微妙
- 浏览器渲染总差一点

则不要继续强行纯 CSS 化，而应直接资产化：

- 从 Pencil 导出透明 PNG
- 在 HTML 中作为 overlay 挂载

原则：

> **能稳定代码化的就代码化，不能稳定代码化的就资产化。**

---

## 7. 预览与导出的统一流程

## 7.1 预览流程

```text
用户输入需求
→ 生成底图
→ 生成颜色 / 渐变
→ 组装 ThemeRenderModel
→ 注入 HTML 模板
→ 实时预览
```

## 7.2 导出流程

```text
ThemeRenderModel
→ 注入同一套 HTML 模板
→ 切换对应模板 / 区域
→ Playwright 固定尺寸截图
→ 输出素材
```

注意：

> **底层截图不是另外一套逻辑，而是重用预览逻辑。**

---

## 8. 截图导出规范

## 8.1 建立统一截图映射表

建议使用统一的截图任务配置，例如：

```ts
[
  { template: 'login', selector: '#loginPage', output: 'bg-login.jpg', width: 2215, height: 1080 },
  { template: 'desktop', selector: '.desktop-header', output: 'header_tlayout_frame_bg.png', width: 1920, height: 60 },
  { template: 'sidebar', selector: '.desktop-sidebar', output: 'header-sideheader.png', width: 200, height: 900 }
]
```

截图必须：

- 尺寸固定
- 选择器稳定
- 命名与打包脚本一致

---

## 8.2 截图后处理

截图输出后，再通过脚本进行：

- `resize`
- `crop`
- 格式转换
- 重命名

最终生成素材包，再进入 `theme_builder.py`。

---

## 9. 视觉校验闭环

如果目标是“高度还原 Pencil”，必须建立比对闭环：

### 9.1 Pencil 基准图

从 Pencil 导出基准截图。

### 9.2 HTML 截图

从 Playwright 导出同尺寸截图。

### 9.3 自动比对

使用：

- `pixelmatch`
- `ImageMagick compare`
- Playwright screenshot diff

来判断差异区域。

校验策略建议：

- 结构层：尽量接近 100%
- 复杂光效层：允许极小误差
- 长期难以修平的效果：转资产化处理

---

## 10. 推荐实施步骤

### 第一步：把 Pencil 定义成“模板规范源”

明确：

- 哪些区域是结构层
- 哪些区域是特效层
- 哪些区域要导出

### 第二步：实现固定尺寸 HTML 模板

重点：

- 不要为了导出而做响应式
- 所有导出模板尺寸固定

### 第三步：建立 ThemeRenderModel

把所有底图、颜色、渐变收敛到一个统一模型。

### 第四步：让预览和导出共用模板

预览怎么渲染，导出就怎么截图。

### 第五步：建立视觉比对机制

确保 HTML 渲染结果持续贴近 Pencil 基准。

---

## 11. 最终架构图

```text
Pencil 模板
  ↓
拆分：结构层 / 特效层
  ↓
结构层 → HTML/CSS 模板
特效层 → PNG/JPG 设计资产
  ↓
ThemeRenderModel
  ↓
HTML 渲染
  ├─ Web 预览
  └─ Playwright 截图
        ↓
      素材包
        ↓
      打包脚本
        ↓
      zip 输出
```

---

## 12. 方案总结

这个项目的正确方向不是“把 Pencil 完全变成 CSS”，而是：

> **让 Pencil 负责模板定义，让 HTML 负责最终渲染，让门户预览和底层截图都从 HTML 来。**

这是唯一能够同时满足：

- 动态门户预览
- 高一致性底层截图
- 稳定复用渲染结果

三者统一的实现方式。

---

## 13. 延伸阅读

- [文档导航](./README.md)
- [用户操作说明书](./用户操作说明书.md)
- [PRD：产品使用流程](./PRD-产品使用流程.md)
- [开发者系统流程图](./开发者系统流程图.md)
