# Dark-UI Pen 对齐三张基准表

> 日期：2026-04-21
> 目的：把 `Dark-UI-模板.pen` / 样例包 / 当前工程实现三者对齐，作为 dark 线唯一基准。
> 适用范围：`dark-ui` 预览 HTML、颜色推导、导出打包。

## 使用原则

1. 唯一动态输入只有图片提取出的 `primary-color`。
2. `primary-color` 之后的颜色关系、变量绑定、控件落点，全部以 `Dark-UI-模板.pen` 和 dark 样例包真实成品为准。
3. `dark-ui` 与 `light-ui` 是两条独立规则链，dark 的绑定和落点不能套用 light。
4. 预览 HTML 与导出打包必须共用同一套 dark 规则，不允许一套预览、一套导出。

## 表 1：Dark-UI 颜色推导基准表

| Pen 变量 | Pen 值 / 关系 | 推导类型 | 当前代码落点 | 状态 | 备注 |
|---|---|---|---|---|---|
| `primary-color` | 动态主色，样例默认 `#a7160b` | 来自图片 | `web/src/theme/color-utils.ts` | 已对齐 | dark 唯一动态入口 |
| `primary-color-hover` | 样例默认 `#fdd0a3` | 由主色推暖、提亮 | `web/src/theme/color-utils.ts` | 部分对齐 | 当前为程序推导，需继续校准到 Pen 色板区间 |
| `alter-color` | 样例默认 `#94170e` | 主色更深一档 | `web/src/theme/color-utils.ts` | 部分对齐 | 当前为程序推导，语义正确，公式仍需继续收紧 |
| `alter-color-hover-on` | 样例默认 `#b9453c` | `alter-color` 的 hover 亮阶 | `web/src/theme/color-utils.ts` | 部分对齐 | 仍需与 Pen 色板亮度阶梯进一步贴齐 |
| `primary-color-opacity-10/20/30` | `#f6e7e6 / #edd0ce / #e4b9b5` | 主色与白色混合 | `web/src/theme/color-utils.ts` | 已对齐 | dark 样例明确可程序化 |
| `header-font-color` | `#FFE4CF` | 固定值 | `config/theme-relations.json` | 已对齐 | 非主题色，不随主色直接变化 |
| `header-font-color-hover` | `$primary-color` | 关系绑定 | `config/theme-relations.json` / `web/src/theme/color-utils.ts` | 已对齐 | |
| `portal-header-bg-extend-color` | 样例默认 `#C41B00` | 主色推导的页眉延展色 | `web/src/theme/color-utils.ts` | 部分对齐 | 语义已切到 dark 线，公式仍需继续贴 Pen |
| `portal-header-complex-bg-extend-color` | `$portal-header-bg-extend-color` | 关系绑定 | `web/src/theme/color-utils.ts` | 已对齐 | |
| `sidebar-panel-bg` | `#FFE4CF` | 与 `header-font-color` 同值 | `config/theme-relations.json` / `web/src/theme/color-utils.ts` | 已对齐 | 这是 dark 关键关系，不是 generic dark sidebar |
| `sidebar-color` | `#333` | 固定值 | `config/theme-relations.json` | 已对齐 | 浅底深字 |
| `sidebar-icon-color` | `#DCB496` | 固定暖金图标色 | `web/src/theme/color-utils.ts` | 部分对齐 | 当前是近似推导，需进一步锁死 Pen 逻辑 |
| `sidebar-icon-color-hover` | `#fff` | 固定值 | `web/src/theme/color-utils.ts` | 已对齐 | |
| `sidebar-accordionpanel-font` | `#333` | 固定值 | `config/theme-relations.json` | 已对齐 | |
| `sidebar-accordionpanel-header-bg` | `$primary-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-accordionpanel-header-bgon` | `$alter-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-item-current-color` | `#fff` | 固定值 | `web/src/theme/color-utils.ts` | 已对齐 | |
| `sidebar-item-current-hex` | `$alter-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `search-font-color` | `$header-font-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `search-input-border-color` | `$primary-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | 但预览控件落点仍需逐项核 |
| `search-placehold-font-color` | `$primary-color` | 关系绑定 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 已对齐 | 但预览控件落点仍需逐项核 |
| `login-bg-color` | `#C41B00` | 主色推导的登录底色 | `web/src/theme/color-utils.ts` / `scripts/lib/build-global-colors.mjs` | 部分对齐 | 语义已切到 dark 样例逻辑，公式仍需继续贴齐 |
| `border-color` | `#eee` | 固定值 | `config/theme-relations.json` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `border-icon-color` | `#eee` | 固定值 | `config/theme-relations.json` / `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| 登录专用金橙色 | `#f8c28c` / `#fdd0a3` | 样例包专用硬编码色，不并入全局 vars | `config/theme-relations.json` / `web/src/theme/template-specific-vars.ts` | 已对齐 | 登录标题、tab、底线、按钮、语言、忘记密码等使用 |

## 表 2：Dark-UI 预览 HTML 控件落点基准表

| 预览控件 / 位置 | Pen / 样例包预期 | 当前预览文件 | 预期变量绑定 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| 登录页标题 | 样例包金橙 `#f8c28c` | `web/src/templates/login.css` | `--login-accent-color` | 已对齐 | dark 登录专用，不走全局 `header-font-color` |
| 登录页 tab 文本 | 样例包金橙 `#f8c28c` | `web/src/templates/login.css` | `--login-accent-color` | 已对齐 | |
| 登录页输入框底线 | 样例包金橙 `#f8c28c` | `web/src/templates/login.css` | `--login-accent-color` | 已对齐 | dark 登录专用 |
| 登录页按钮背景 | 样例包金橙 `#f8c28c` | `web/src/templates/login.css` | `--login-accent-color` | 已对齐 | |
| 登录页按钮文字 | 样例包 `$primary-color` | `web/src/templates/login.css` | `--primary-color` | 已对齐 | |
| 登录页按钮 hover | 样例包 `#fdd0a3` | `web/src/templates/login.css` | `--login-accent-hover-color` | 已对齐 | |
| 登录页语言/忘记密码 | 样例包金橙 `#f8c28c` | `web/src/templates/login.css` | `--login-accent-color` | 已对齐 | |
| 桌面页眉导航文字 | Pen `$header-font-color` | `web/src/templates/desktop.css` | `--header-font-color` | 已对齐 | |
| 桌面页眉导航 hover | Pen `$primary-color` | `web/src/templates/desktop.css` | `--header-font-color-hover` | 已对齐 | |
| 桌面页眉 active 下划线 | 需按当前对应 Pen 节点核定 | `web/src/templates/desktop.css` | 倾向 `--primary-color` | 待核 | 当前按 `primary-color` 处理 |
| 桌面搜索框文字 | Pen 变量表为 `$search-font-color` | `web/src/templates/desktop.css` | `--search-font-color` | 已对齐 | |
| 桌面搜索框 placeholder | Pen 变量表为 `$search-placehold-font-color`，但不同搜索框节点存在差异 | `web/src/templates/desktop.css` | 当前应走 `--search-placehold-font-color` | 待修 | 现在 dark override 仍直接取 `header-font-color` |
| 桌面搜索框边框 | Pen 变量表为 `$search-input-border-color`，但不同搜索框节点存在差异 | `web/src/templates/desktop.css` | 当前应走 `--search-input-border-color` | 待修 | 现在 dark override 仍直接取 `header-font-color` |
| `desktop-sidebar` 背景 | Pen 明确为 `$sidebar-panel-bg` | `web/src/templates/desktop.css` | `--sidebar-panel-bg` | 已对齐 | 不能绑到 generic dark background |
| `desktop-sidebar` 文字 | Pen `$sidebar-color` | `web/src/templates/desktop.css` | `--sidebar-color` | 已对齐 | 浅底深字 |
| `desktop-sidebar` 图标 | Pen `$sidebar-icon-color` | `web/src/templates/desktop.css` | `--sidebar-icon-color` | 部分对齐 | 当前语义通了，实际颜色仍需继续贴 Pen |
| 一级侧栏激活块 | Pen `$sidebar-accordionpanel-header-bg` | `web/src/templates/desktop.css` | `--sidebar-accordionpanel-header-bg` | 已对齐 | |
| 二级侧栏当前项背景 | Pen `$sidebar-item-current-hex` | `web/src/templates/desktop.css` | `--sidebar-item-current-hex` | 已对齐 | |
| 二级侧栏当前项文字 | Pen `$sidebar-item-current-color` | `web/src/templates/desktop.css` | `--sidebar-item-current-color` | 已对齐 | |
| 页眉功能图标 hover | Pen `$primary-color` | `web/src/templates/desktop.css` | `--header-font-color-hover` | 已对齐 | |

## 表 3：Dark-UI 导出 / 打包映射基准表

| Pen 变量 | 导出字段 / 全局色字段 | 当前实现 | 状态 | 备注 |
|---|---|---|---|---|
| `primary-color` | `primary` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `primary-color-hover` | `primaryHover` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `alter-color` | `alterColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `alter-color-hover-on` | `alterColorHoverOn` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `header-font-color` | `headerFontColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `header-font-color-hover` | `headerFontColorHover` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `portal-header-bg-extend-color` | `portalHeaderBgExtendColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `portal-header-complex-bg-extend-color` | `portalHeaderComplexBgExtendColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `portal-header-font-color` | `portalHeaderFontColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | 以 `$header-font-color` 输出 |
| `portal-header-font-color-hover` | `portalHeaderFontColorHover` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-panel-bg` | `sidebarPanelBg` | `scripts/lib/build-global-colors.mjs` | 已对齐 | dark 下应等同 `header-font-color` 关系 |
| `sidebar-color` | `sidebarColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-icon-color` | `sidebarIconColor` | `scripts/lib/build-global-colors.mjs` | 部分对齐 | 当前 fallback 仍偏宽泛，后续需继续贴 Pen |
| `sidebar-accordionpanel-header-bg` | `sidebarAccordionPanelHeaderBg` | `scripts/lib/build-global-colors.mjs` | 已对齐 | dark 下应为主色，不是 light 的透明值 |
| `sidebar-accordionpanel-header-bgon` | `sidebarAccordionPanelHeaderBgOn` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-item-current-color` | `sidebarItemCurrentColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `sidebar-item-current-hex` | `sidebarItemCurrentHex` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `search-font-color` | `searchFontColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `search-input-border-color` | `searchInputBorderColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `search-placehold-font-color` | `searchPlaceholdFontColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| `login-bg-color` | `loginBgColor` | `scripts/lib/build-global-colors.mjs` | 已对齐 | |
| 登录按钮金橙色 | `loginPrimaryColor` / `loginPrimaryHover` | `scripts/lib/build-global-colors.mjs` | 已对齐 | dark 登录专用色单独输出 |

## 当前结论

1. 表 1 里“固定值 + 明确关系绑定”的 dark 规则，大部分已经落进代码。
2. 表 2 仍是当前最大风险点，尤其是桌面搜索框这类同名控件在 Pen 中存在多种样式，必须按当前预览对应的节点逐项锁定。
3. 表 3 的导出映射已经基本切到 dark 线，但仍要在表 2 全部锁死后再做一次预览与导出一致性回归。

## 下一步执行顺序

1. 先按本表把 `dark-ui` 的预览控件落点逐项锁死。
2. 再用同一张表回查 `build-global-colors` 的导出映射。
3. 最后回收 `deriveDarkUiColors()` 的公式，让生成规则尽量贴近 Pen 色板。
