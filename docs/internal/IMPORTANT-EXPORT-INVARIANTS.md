# 重要导出基线（不可丢失）

> 重要级别：高  
> 状态：当前版本有效基线  
> 说明：后续如做导出链路、打包流程、截图流程、目录结构重构，**不得丢失本文件中的约束**。若必须调整，必须同步更新实现、测试与本文档。

## 1. 唯一导出主链

当前导出主链必须保持为：

`web/scripts/build.ts`
→ `scripts/prepare_export_assets.py`
→ `scripts/lib/asset_pipeline.py` / `web/scripts/screenshot.ts`
→ `theme_builder.py`
→ `scripts/verify-build.py`

禁止再出现“规则文件改了，但实际打包走的是另一套脚本”的分叉状态。

## 2. 素材来源不可混淆

### 2.1 背景图来源

以下素材必须来自当前确认的背景图：

- 登录背景：`bg-login.jpg`
- 登录背景 PNG：`background.png`
- 登录缩略图：`login_thumb.jpg`
- 登录裁切缩略图：`login_bg/thumb-1.jpg`、`login_bg/thumb-2.jpg`
- 页眉三明治切图
- 左导航三明治切图

### 2.2 HTML 预览截图来源

以下素材必须来自当前确认后的 HTML 预览截图，不得回退为背景图合成：

- `desktop.png`
- `layout-banner.jpg`
- `fullscreen-sideheader.jpg`
- `fullscreen-sidenav.jpg`
- `center-sidenav.jpg`
- `thumb.jpg`
- `banner_personal.png`
- `study_banner.png`

素材来源真相源为：

- `config/export-asset-sources.json`

## 3. Light 三明治变量名基线

Light 主题页眉/左导航三明治规则必须优先取：

- `tlayout-header-bg-extend-color`

允许保留兼容 fallback：

- `portal-header-bg-extend-color`

真相源为：

- `config/image-sandwich-rules.json`

## 4. 素材包目录约束

`素材包/` 目录内**只能存在图片文件和图片子目录**。

不得将以下非图片文件继续放入 `素材包/`：

- `theme-build-request.yaml`
- `asset-snapshot.json`
- `prepared-assets-manifest.json`
- 其他 JSON / YAML / 调试文件

这些文件统一放在批次目录下：

- `.build-meta/`

## 5. 打包命名约束

打包标题（用于 zip 命名）最多 10 个字符。

此约束必须同时在：

- Web 侧 YAML 生成
- Python 打包入口

两侧同时生效，避免 UI 与实际产物命名不一致。

## 6. 重构必做检查

后续任何涉及以下范围的修改，必须检查并保留本文件约束：

- `build.ts`
- `prepare_export_assets.py`
- `asset_pipeline.py`
- `screenshot.ts`
- `theme_builder.py`
- `verify-build.py`
- 导出桥接
- 导出目录结构

## 7. 回归测试最低要求

如果修改导出相关代码，至少要保证以下测试仍然覆盖：

- 素材来源分类
- Light 三明治变量名与 fallback
- HTML 预览截图任务清单
- `素材包/` 仅包含图片
- 打包标题 10 字符限制
- 导出路径结构

若新增机制替代旧实现，必须新增等效测试后再移除旧测试。
