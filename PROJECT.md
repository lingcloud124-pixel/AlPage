# 主题自动化项目

**这是一个以 Web 工作台为主入口的 OA 主题设计与导出工具。**

## 如果你想继续这个产品

请告诉 OpenCode：
```
这是 Theme Studio 项目，请继续当前 Web 产品和导出链路
```

## 当前主线

- Path B（Web 浏览器流程）是唯一主线
- `.pen` 文件只做视觉参考，不是运行时渲染源
- HTML 模板 + Playwright 截图 + `theme_builder.py` 是当前导出主链

---

## 项目信息

- **路径**: `/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation`
- **用途**: 通过 Web 工作台生成、预览、迭代并导出 OA 系统（EKp/MK/KK）主题包
- **Skill**: `theme-automation`
- **设计参考**: `designs/sources/Light-UI-模板.pen`
- **运行时渲染源**: `web/src/templates/*`
