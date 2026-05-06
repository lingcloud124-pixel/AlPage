# Theme Studio 上线验收记录

日期: 2026-05-06
结论: 当前版本已完成本轮上线阻塞项收尾，满足本次上线检查口径

## 1. 自动化回归

执行结果:

- `npm test -- --run`
  - 结果: `120` 个测试文件通过, `250` 个测试通过
- `npm run build`
  - 结果: server TypeScript 编译通过, web Vite production build 通过
- `cd web && npx playwright test --reporter=line`
  - 结果: `15 passed`

对应重点:

- 前台设置入口与 modal 已完全移除
- 侧边栏“更多操作”按钮与紧凑浮层回归通过
- 预览展开、Tab 切换、主题包弹窗、基础资源访问回归通过

## 2. 多用户隔离实测

目的:

- 验证用户 A 与用户 B 项目、导出任务互不可见

执行方式:

1. 使用 `ENABLE_DEV_AUTH=true` 分别启动两个受控服务实例:
   - Alice: `PORT=3101 DEV_LOGIN_NAME=acceptance-alice`
   - Bob: `PORT=3102 DEV_LOGIN_NAME=acceptance-bob`
2. 在 Alice 实例创建项目 `acceptance-alice-conv`
3. 在 Alice 实例创建导出任务 `job-1778032141151-4dfa16a0`
4. 在 Bob 实例读取 Alice 项目与任务

实测结果:

- Alice:
  - `POST /api/theme/conversations` -> `201`
  - `GET /api/theme/conversations` -> 返回 `acceptance-alice-conv`
  - `POST /api/theme/export-jobs` -> `201`
- Bob:
  - `GET /api/theme/conversations` -> `200 []`
  - `GET /api/theme/conversations/acceptance-alice-conv` -> `404 {"error":"Conversation not found"}`
  - `GET /api/theme/export-jobs/job-1778032141151-4dfa16a0` -> `404 {"error":"Export job not found"}`

结论:

- 多用户项目隔离通过
- 多用户导出任务隔离通过

## 3. 异常恢复实测

目的:

- 验证中断中的任务会在服务重启后恢复处理
- 验证失败任务会收敛为 `failed` 并保留错误上下文

执行方式:

1. Alice 创建导出任务后停止实例
2. 启动 Bob 实例
3. 服务启动日志出现:
   - `Recovered interrupted export jobs on startup {"count":1}`
4. 恢复执行同一任务后，截图阶段超时失败
5. 重新启动 Alice 实例读取该任务状态

实测结果:

- 恢复队列: 服务启动后自动 requeue 中断任务
- 失败收敛: `GET /api/theme/export-jobs/job-1778032141151-4dfa16a0` 返回:
  - `status: "failed"`
  - `error` 中保留 `Asset preparation failed`
  - 错误详情包含 `locator('.desktop-wrapper')` 超时、Python 调用栈、脚本返回非 0
  - `result` 保留:
    - `artifactPath`
    - `metadataDir`

结论:

- 异常恢复链路通过
- 失败诊断信息可追溯

## 4. 人工视觉抽检

截图产物:

- `output/playwright/release-visual-home.png`
- `output/playwright/release-visual-expanded-preview.png`

人工核对项:

- 首页落地态正常渲染
- 品牌头部、提示词输入区、推荐主题卡片正常显示
- 展开预览后左右布局、顶部 tab、预览画板、下载主题按钮正常显示

备注:

- `release-visual-sidebar-menu.png` 未生成, 原因是当前抽检环境首页未出现历史项目项
- 侧边栏菜单按钮与浮层宽度已由 Playwright 自动化用例覆盖并通过

## 5. 预发布回归结论

结合:

- 全量 Vitest 通过
- Production build 通过
- 全量 Playwright 冒烟通过
- 本地健康检查 `GET /api/health` 返回 `200`
- 多用户隔离实测通过
- 异常恢复实测通过
- 人工视觉抽检完成

结论:

- 本轮剩余上线阻塞项已关闭
- 当前版本可进入上线
