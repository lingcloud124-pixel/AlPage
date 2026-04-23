# 2026-04-23 工作总结：在线服务化打包链路

## 今日目标

把产品方向从“本地桥接导出”继续推进到“在线服务端生成主题包”：用户在网页中通过对话和预览确认效果，点击打包后由服务端完成截图、切图、打包、验包，并提供下载。

## 已完成

1. 更新产品与开发测试文档，明确首版在线服务产品形态：多用户、AI 辅助生成、在线预览确认、服务端打包、下载结果，不再要求真实用户本地安装打包工具。

2. 增加服务端确认版本与导出任务骨架：
   - 确认态快照用于锁定用户最终确认的主题配置。
   - 导出任务支持 queued、preparing、capturing、packaging、verifying、completed、failed 等状态。
   - 服务端 runner 会在 `output/service-jobs/<jobId>/` 下生成批次目录，并串联真实资产准备、打包和验包脚本。

3. 增加前端在线导出客户端与状态模型，为后续页面接入服务端导出任务做准备。

4. 接通服务端真实资产链路：
   - `prepare_export_assets.py` 负责生成背景图裁切素材和 HTML 预览截图素材。
   - `theme_builder.py` 负责生成主题包和登录包。
   - `verify-build.py` 负责按产品选择验包。

5. 修正服务端 YAML 图片路径：
   - 服务端 YAML 位于 `.build-meta/theme-build-request.yaml`。
   - 生成图片位于相邻的 `../素材包/`。
   - 已修正为 `../素材包/<image>`，避免打包器从错误目录找图片。

6. 对齐当前仓库样例包目录：
   - 当前样例包实际目录为 `assets/references/samples/light` 和 `assets/references/samples/dark`。
   - 已同步更新 `theme_builder.py` 与 `verify-build.py`，避免继续查找旧目录名。

7. 修正验包误报：
   - 当用户选择的主题色刚好等于样例包旧色时，验包不再误判为“旧模板色残留”。
   - `verify-build.py` 会读取 `.build-meta/theme-build-request.yaml` 里的 `themeColor`，并允许本次目标主题色存在。

8. 补充测试，锁定关键规则：
   - 服务端 YAML 必须生成 metadata-relative 图片路径。
   - 样例包目录和 dark MK 文件名必须与当前仓库一致。
   - 导出任务 runner 必须保留真实资产准备、打包、验包链路。
   - 前端在线导出客户端和状态模型有基础单测覆盖。

## 今日真实打包验证

已使用同一套服务端链路完成 smoke test：

`确认态快照 -> prepare_export_assets.py -> HTML 预览截图 -> 服务端 YAML -> theme_builder.py -> verify-build.py`

验证结果：

1. MK 链路通过：
   - 生成 `主题-MK-清明主题.zip`
   - 生成 `登录-MK-清明主题.zip`
   - 验包结果：2 passed, 0 failed

2. EKP v17 与 EKP v14~v16 链路通过：
   - 生成 `主题-V17-清明EKP验证.zip`
   - 生成 `登录-V17-清明EKP验证.zip`
   - 生成 `主题-V14〜V16-清明EKP验证.zip`
   - 生成 `登录-V14〜V16-清明EKP验证.zip`
   - 生成 `登录-V14-清明EKP验证.zip`
   - 生成 `登录-V15-清明EKP验证.zip`
   - 生成 `登录-V16-清明EKP验证.zip`
   - 验包结果：7 passed, 0 failed

3. 类型检查通过：
   - `npm run test:types`

4. 相关单测通过：
   - 服务端导出任务、服务端 YAML、样例包路径、前端在线导出客户端与状态测试均通过。

## 重要约束

这部分改动非常重要，后续重构不能丢失：

1. 官方产品流不依赖用户本地打包工具，真实打包能力应部署在服务端环境。

2. 主链路必须保留统一真相源：
   `服务端确认态快照 -> asset-snapshot.json -> prepare_export_assets.py -> screenshot.ts/asset_pipeline.py -> theme_builder.py -> verify-build.py`

3. 素材来源必须保持清晰：
   - 登录背景和登录缩略图来自背景图裁切。
   - 页眉和左导航素材来自背景图裁切与三明治规则。
   - 封面图和展示缩略图来自确认后的 HTML 预览截图。

4. 打包标题仍需限制在 10 个字符以内。

5. 导出素材包中只应包含图片素材，调试元数据、YAML 和中间文件必须放在 `.build-meta` 或服务端工作目录中，不能混入最终素材包。

6. `assets/references/samples/light` 和 `assets/references/samples/dark` 是当前服务端打包与验包依赖的样例包目录。

## 后续建议

1. 把当前 runner 与真实 API 任务队列进一步接到页面按钮，完成用户可操作闭环。

2. 增加导出结果下载接口的端到端验证，确认服务端生成 zip 后前端能直接下载。

3. 为不同主题色、暗色主题、缺失素材、失败重试、并发任务补充服务端集成测试。

4. 后续部署时需要把 Python、Pillow、Node、Playwright/浏览器、样例包和这套脚本一起放进服务端运行环境或容器镜像。
