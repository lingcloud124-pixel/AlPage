# 主题配色方案库

## 概述

本目录存储标准化配色方案，每个主题一个 JSON 文件，包含完整的配色信息。

---

## 配色方案格式

```json
{
  "name": "主题名称",
  "nameEn": "theme-name",
  "description": "主题描述",
  "colors": {
    "primary": "#XXXXXX",           // 主色调
    "primaryHover": "#XXXXXX",      // Hover状态
    "primaryLight": "#XXXXXX",       // 浅色变体
    "primaryDark": "#XXXXXX",        // 深色变体
    "primaryOpacity10": "#XXXXXX",   // 10%透明度
    "primaryOpacity20": "#XXXXXX",   // 20%透明度
    "primaryOpacity30": "#XXXXXX",   // 30%透明度
    "sidebarBg": "#XXXXXX",          // 侧边栏背景
    "contentBg": "#XXXXXX",          // 内容区背景
    "cardBg": "#XXXXXX",            // 卡片背景
    "textOnPrimary": "#XXXXXX",      // 主色上的文字（白色或深色）
    "linkText": "#XXXXXX",          // 链接文字
    "linkTextHover": "#XXXXXX"       // 链接Hover
  },
  "gradient": {
    "start": "#XXXXXX",             // 渐变起始色
    "end": "#XXXXXX"                // 渐变结束色
  },
  "backgroundImage": {
    "prompt": "AI生成背景图的提示词",
    "style": "风格描述"
  }
}
```

---

## 配色方案清单

| 主题 | 文件名 | 主色调 | 说明 |
|------|--------|--------|------|
| 清明节 | `qingming.json` | #7BA894 | 青绿色系，淡雅清新 |
| 儿童节 | `childrens-day.json` | #FF9800 | 橙黄色系，欢快活泼 |
| 国庆节 | `national-day.json` | #C62828 | 红色系，庄重喜庆 |
| 春节 | `spring-festival.json` | #D32F2F | 中国红，热闹喜庆 |
| 中秋节 | `mid-autumn.json` | #FF9800 | 金橙色系，温馨团圆 |
| 端午节 | `dragon-boat.json` | #2E7D32 | 青绿色系，传统清新 |
| 端午节-清新卡通 | `dragon-boat-fresh.json` | #4CAF50 | 清新绿意，卡通风格 |
| 元旦 | `new-year.json` | #1976D2 | 蓝色系，清新希望 |
| 劳动节 | `labor-day.json` | #ED6C02 | 橙色系，活力劳动 |
| 七夕节 | `qixi.json` | #E91E63 | 粉紫色系，浪漫温馨 |
| 重阳节 | `double-ninth.json` | #8BC34A | 黄绿色系，敬老登高 |
| 建军节 | `army-day.json` | #4CAF50 | 军绿色系，英姿飒爽 |
| 教师节 | `teachers-day.json` | #9C27B0 | 紫罗兰系，尊师重道 |
| 圣诞节 | `christmas.json` | #E53935 | 红绿色系，圣诞欢乐 |
| 1024程序员节 | `1024.json` | #6366F1 | 科技靛蓝，卡通插画风格 |
| 万圣节 | `halloween.json` | #FF5722 | 橙黑色系，搞怪神秘 |
| 企业蓝 | `corporate-blue.json` | #1565C0 | 专业蓝色，稳重可靠 |
| 科技紫 | `tech-purple.json` | #7B1FA2 | 科技紫色，创新未来 |
| 环保绿 | `eco-green.json` | #388E3C | 环保绿色，低碳自然 |
| 少女粉 | `pink.json` | #E91E63 | 粉色系，少女梦幻 |
| 商务灰 | `business-gray.json` | #455A64 | 灰蓝色系，商务专业 |
| 活力橙 | `energetic-orange.json` | #FF6D00 | 橙色系，活力四射 |
| 熊猫夜晚 | `panda-night.json` | #4A3F6B | 深紫蓝，梦幻星空 |
| 深夜加班 | `overtime-worker.json` | #2D3A4A | 深蓝灰，夜班工作 |
| 桃花开了 | `peach-blossom.json` | #E8B4C8 | 粉色，春季桃花 |
| 超级英雄超人 | `superman-superhero.json` | #BF613F | 暖橙赤褐，英雄力量感 |

---

## 使用方法

### 1. 选择配色方案

根据主题类型选择对应的配色方案 JSON 文件。

### 2. 应用配色

使用自动化脚本一键替换 pen 文件中的颜色、渐变、背景图：

```bash
python3 scripts/update-pen-theme.py {theme-name}
```

脚本自动完成 6 项更新：框架名称、color variables、文本色值、渐变组件、登录页背景图、页眉背景图。

### 3. 生成背景图

使用 `backgroundImage.prompt` 提示词通过 AI 生成背景图。

---

## 贡献新配色

新增配色方案：
1. 在本目录创建 `[theme-name].json` 文件
2. 按照上述格式填写完整配色信息
3. 更新本目录的 `README.md` 清单

---

## 版本历史

- v1.1 (2026-04-06) - 新增端午节-清新卡通配色（dragon-boat-fresh）
- v1.0 (2026-04-04) - 初始版本，包含20种配色方案
